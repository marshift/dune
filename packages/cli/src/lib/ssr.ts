import { HTMLAdapter, Parser } from "@dunejs/core";
import { watch } from "chokidar";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

interface ServerOptions {
	templateDir: string;
	staticDir: string;
}

function getPathname(req: IncomingMessage) {
	const { pathname } = new URL(`http://dune.rocks${req.url}`);
	if (pathname.endsWith("/")) {
		const dir = dirname(pathname);
		return `${dir}/index`;
	} else {
		return pathname;
	}
}

const errorDoc = `
page {
	body {
		h1 "\${text}"
		if "error" {
			code "\${error}"
		}
	}
}
`;

async function handleFile(
	{ templateDir, staticDir }: ServerOptions,
	res: ServerResponse,
	pathname: string,
	onKDLDocument: (parser: Parser) => string,
) {
	const pagesDir = join(templateDir, "pages");
	const maybeKDLPath = join(pagesDir, pathname + ".kdl");
	const maybeStaticPath = join(staticDir, pathname);

	if (existsSync(maybeKDLPath)) {
		try {
			const parser = await Parser.for(pathToFileURL(maybeKDLPath));
			const content = onKDLDocument(parser);

			res.writeHead(200);
			return res.end(content);
		} catch (e) {
			console.error(e);

			const errorParser = new Parser(errorDoc, {
				text: "Internal Server Error",
				error: String(e),
			});
			const content = onKDLDocument(errorParser);

			res.writeHead(500);
			return res.end(content);
		}
	} else if (existsSync(maybeStaticPath)) {
		const content = await readFile(join(staticDir, pathname));
		res.writeHead(200);
		return res.end(content);
	} else {
		const notFoundParser = await Parser.for(pathToFileURL(join(pagesDir, "404.kdl")))
			.catch(() => new Parser(errorDoc, { text: "Not Found", error: null }));
		const content = onKDLDocument(notFoundParser);

		res.writeHead(404);
		return res.end(content);
	}
}

const hotReloadNodes = new Parser(`
page {
	head {
		script #"""
		const source = new EventSource("/_hot");
		source.onmessage = () => document.location.reload();
		"""#
	}
}
`).toAST();

export const createDevServer = (opts: ServerOptions) => {
	const subscribers = new Set<ServerResponse>();
	const watcher = watch([opts.templateDir, opts.staticDir], { ignoreInitial: true });
	watcher.on("all", (event) => subscribers.forEach((s) => s.write(`data: ${event}\n\n`)));

	return createServer(async (req, res) => {
		const pathname = getPathname(req);

		if (pathname === "/_hot") {
			subscribers.add(res);
			req.on("close", () => subscribers.delete(res));

			return res.writeHead(200, {
				"content-type": "text/event-stream",
				"connection": "keep-alive",
				"cache-control": "no-cache",
			});
		}

		await handleFile(opts, res, pathname, (parser) => {
			const ast = parser.toAST();
			const head = ast
				.filter((node) => node.type === "element")
				.find((node) => node.name === "head");

			(!head ? ast : head.body).unshift(...hotReloadNodes);
			return new HTMLAdapter().process(ast);
		});
	});
};

export const createSSRServer = (opts: ServerOptions) =>
	createServer((req, res) => handleFile(opts, res, getPathname(req), (parser) => parser.convert(new HTMLAdapter())));
