import { HTMLAdapter, Parser } from "@dunejs/core";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const createSSRServer = (pagesDir: string, staticDir: string) =>
	createServer(async (req, res) => {
		let { pathname } = new URL(`http://dune.rocks${req.url}`);
		if (pathname === "/") pathname = "index";

		try {
			const parser = await Parser.for(pathToFileURL(join(pagesDir, pathname + ".kdl")));
			const content = parser.convert(new HTMLAdapter());

			res.writeHead(200);
			return res.end(content);
		} catch { /* Empty block */ }

		try {
			const content = await readFile(join(staticDir, pathname));

			res.writeHead(200);
			return res.end(content);
		} catch { /* Empty block */ }

		res.writeHead(404);
		return res.end();
	});
