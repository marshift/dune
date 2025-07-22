import { HTMLAdapter, Parser } from "@dunejs/core";
import { watch } from "chokidar";
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

// TODO: Something like onError
async function handleFile(
	{ templateDir, staticDir }: ServerOptions,
	res: ServerResponse,
	pathname: string,
	onKDLDocument: (parser: Parser) => string,
) {
	try {
		const parser = await Parser.for(pathToFileURL(join(templateDir, "pages", pathname + ".kdl")));
		const content = onKDLDocument(parser);

		res.writeHead(200);
		return res.end(content);
	} catch (e) {}

	try {
		const content = await readFile(join(staticDir, pathname));
		res.writeHead(200);
		return res.end(content);
	} catch { /* Empty block */ }

	res.writeHead(404);
	return res.end();
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
