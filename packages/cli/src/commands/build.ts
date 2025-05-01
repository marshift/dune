import type { ArgusContext } from "@marshift/argus";
import { resolve } from "node:path";
import { buildFile, kdlToHtml } from "../lib/builder.ts";
import { Command } from "./base.ts";

export class BuildCommand extends Command {
	override name = "build";
	override async execute(ctx: ArgusContext): Promise<void> {
		const inFile = resolve(ctx.consumePositionalArg(true));
		const outFile = ctx.getOptionalArg(/--out|-o/) ?? kdlToHtml(inFile);

		await buildFile(inFile, outFile);
	}
}
