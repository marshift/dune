import { HTMLAdapter, Parser } from "@dunejs/core";
import { FSWatcher, watch } from "chokidar";
import mime from "mime";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, Server, ServerResponse, STATUS_CODES } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

interface ServerOptions {
	port: number;
	dev: boolean;
	templateDir: string;
	staticDir: string;
}

export class SSRServer {
	static readonly #ERROR_DOCUMENT = `
page {
	body {
		h1 "\${text}"
		if "error" {
			code "\${error}"
		}
	}
}
`;

	static readonly #HOT_RELOAD_SCRIPT = `
let source = null;

window.addEventListener("pageshow", () => {
	source = new EventSource("/_hot");
	source.onmessage = () => document.location.reload();
});

window.addEventListener("pagehide", () => {
	source?.close();
	source = null;
});
`;

	#options: ServerOptions;
	#server: Server;
	#watcher?: FSWatcher;

	constructor(options: ServerOptions) {
		this.#options = options;

		const pagesDir = join(this.#options.templateDir, "pages");
		const custom404Url = pathToFileURL(join(pagesDir, "404.kdl"));

		this.#server = createServer(async (req, res) => {
			const { pathname } = new URL(`http://dune.rocks${req.url}`);

			if (this.#options.dev && pathname === "/_hot") {
				this.#watcher ??= watch([this.#options.templateDir, this.#options.staticDir], { ignoreInitial: true }); // Lazy watcher setup

				const sub = () => res.write(`data:\n\n`);
				this.#watcher.on("all", sub);
				req.on("close", () => this.#watcher?.off("all", sub));

				return this.#respond(
					res,
					new Response(null, {
						headers: {
							"content-type": "text/event-stream",
							"connection": "keep-alive",
							"cache-control": "no-cache",
						},
					}),
				);
			}

			const paths = [
				join(pagesDir, pathname, "index.kdl"),
				join(pagesDir, pathname + ".kdl"),
				join(this.#options.staticDir, pathname),
			];

			for (const path of paths) {
				if (!existsSync(path)) continue;
				const url = pathToFileURL(path);

				return (url.pathname.endsWith(".kdl")
					? this.#respondWithKDLFile
					: this.#respondWithStaticFile)(res, url)
					.catch((e) => {
						console.error(e); // Show the full stack trace to the developer
						return this.#respondWithError(
							res,
							500,
							String(e),
						);
					});
			}

			return existsSync(custom404Url)
				? this.#respondWithKDLFile(res, custom404Url, 404)
				: this.#respondWithError(res, 404);
		});
	}

	#respond(nodeRes: ServerResponse, res: Response) {
		nodeRes.writeHead(res.status, Object.fromEntries(res.headers.entries()));
		if (res.body) res.bytes().then((b) => nodeRes.end(b));
	}

	#respondWithKDLDocument(res: ServerResponse, parser: Parser, status?: number) {
		const ast = parser.toAST();

		if (this.#options.dev) {
			HTMLAdapter.addHeadElement(ast, {
				type: "element",
				name: "script",
				attributes: {},
				body: [{ type: "text", content: SSRServer.#HOT_RELOAD_SCRIPT }],
			});
		}
		const content = new HTMLAdapter().process(ast);
		this.#respond(res, new Response(content, { status, headers: { "content-type": "text/html" } }));
	}

	#respondWithError = (res: ServerResponse, status: number, error?: string) =>
		this.#respondWithKDLDocument(
			res,
			new Parser(SSRServer.#ERROR_DOCUMENT, { text: STATUS_CODES[status]!, error: error ?? null }),
			status,
		);

	#respondWithKDLFile = (res: ServerResponse, url: URL, status?: number) =>
		Parser.for(url).then((p) => this.#respondWithKDLDocument(res, p, status));

	/*
		By my typical conventions, this should be a traditional function, not an arrow function, as it does not immediately return.
		However, after fighting with `this` context in `node:http` for about 30 minutes, I have decided I do not care.
	*/
	#respondWithStaticFile = async (res: ServerResponse, url: URL, status?: number) => {
		const content = await readFile(url);
		const mimeType = mime.getType(url.pathname) ?? "text/plain";
		this.#respond(res, new Response(content, { status, headers: { "content-type": mimeType } }));
	};

	listen = () =>
		Promise.resolve(
			void this.#server.listen(this.#options.port, () => {
				console.log(`Listening on port ${this.#options.port}`);
			}),
		);
}
