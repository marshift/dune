import { HTMLAdapter, Parser } from "@dunejs/core";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export const kdlToHtml = (path: string) => path.substring(0, path.length - ".kdl".length) + ".html";

export async function buildFile(inFile: string, outFile: string) {
	const parser = await Parser.for(pathToFileURL(inFile));
	const output = parser.convert(new HTMLAdapter());

	await mkdir(dirname(outFile), { recursive: true });
	await writeFile(outFile, output, "utf-8");
}

export const buildDir = (inDir: string, outDir: string) =>
	readdir(inDir, { withFileTypes: true }).then((files) =>
		files
			.filter((e) => e.isFile() && e.name.endsWith(".kdl"))
			.forEach(async (e) => {
				const inFile = join(e.parentPath, e.name);
				const outFile = join(outDir, kdlToHtml(e.name));
				await buildFile(inFile, outFile);
			})
	);
