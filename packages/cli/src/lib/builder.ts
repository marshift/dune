import { HTMLAdapter, Parser } from "@dunejs/core";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export async function build(inFile: string, outFile: string) {
	const parser = await Parser.for(pathToFileURL(inFile));
	const output = parser.convert(new HTMLAdapter());

	await mkdir(dirname(outFile), { recursive: true });
	await writeFile(outFile, output, "utf-8");
}

export const buildAll = (inDir: string, outDir: string) =>
	readdir(inDir, { withFileTypes: true }).then((files) =>
		files
			.filter((e) => e.isFile() && e.name.endsWith(".kdl"))
			.forEach(async (e) => {
				const inFile = join(e.parentPath, e.name);
				const outFile = join(outDir, e.name.substring(0, e.name.length - ".kdl".length) + ".html");
				await build(inFile, outFile);
			})
	);

export const copyStaticAssets = (inDir: string, outDir: string) =>
	readdir(inDir, { withFileTypes: true }).then((paths) =>
		paths.forEach(async (e) => {
			const inPath = join(e.parentPath, e.name);
			const outPath = join(outDir, e.name);
			await cp(inPath, outPath);
		})
	);
