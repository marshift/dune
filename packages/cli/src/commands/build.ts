import { join } from "node:path";
import { buildAll, copyStaticAssets } from "../lib/builder.ts";
import type { DuneConfig } from "../lib/config.ts";
import { Command } from "./base.ts";

export class BuildCommand extends Command {
	override name = "build";
	override async execute({ templateDir, staticDir, outDir }: DuneConfig): Promise<void> {
		await buildAll(join(templateDir, "./pages/"), outDir);
		await copyStaticAssets(staticDir, outDir);
	}
}
