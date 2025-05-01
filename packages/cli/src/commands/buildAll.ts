import type { ArgusContext } from "@marshift/argus";
import { resolve } from "node:path";
import { buildDir } from "../lib/builder.ts";
import { Command } from "./base.ts";

export class BuildAllCommand extends Command {
	override name = "build-all";
	override async execute(ctx: ArgusContext): Promise<void> {
		const inDir = resolve(ctx.consumePositionalArg(true));
		const outDir = resolve(ctx.getOptionalArg(/--out|-o/) ?? "./dist/");

		await buildDir(inDir, outDir);
	}
}
