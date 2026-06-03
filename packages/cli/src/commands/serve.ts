import type { ArgusContext } from "@marshift/argus";
import type { DuneConfig } from "../lib/config";
import { SSRServer } from "../lib/ssr";
import { Command } from "./base";

export class ServeCommand extends Command {
	override name = "serve";
	override execute({ templateDir, staticDir }: DuneConfig, ctx: ArgusContext) {
		const port = Number(ctx.getOptionalArg(/--port|-p/) ?? 1413);
		const dev = ctx.hasOptionalArg(/--dev|-d/);

		const server = new SSRServer({
			port,
			dev,
			templateDir,
			staticDir,
		});

		return server.listen();
	}
}
