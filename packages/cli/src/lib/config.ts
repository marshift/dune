import { defu } from "defu";
import { dirname, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface DuneConfig {
	/** Directory containing dune templates (pages, components), defaults to `./src/` */
	templateDir: string;
	/** Directory containing static assets (images, stylesheets, etc), defaults to `./public/` */
	staticDir: string;
	/** Directory to output built files to, defaults to `./dist/` */
	outDir: string;
}

export const DEFAULT_CONFIG: DuneConfig = {
	templateDir: "./src/",
	staticDir: "./public/",
	outDir: "./dist/",
};

export const defineConfig = (config: DuneConfig) => config;

export async function loadConfig(path: string): Promise<DuneConfig> {
	const url = pathToFileURL(path);
	const module = await import(url.href);
	return defu(module.default, DEFAULT_CONFIG);
}

export async function findNearestConfig(from: string): Promise<DuneConfig> {
	let current = resolve(from);
	const { root } = parse(current);

	while (current !== root) {
		try {
			// TODO: More filetypes for config?
			const config = await loadConfig(join(current, "dune.config.mjs"));
			return config;
		} catch {
			current = dirname(current);
		}
	}

	return DEFAULT_CONFIG;
}
