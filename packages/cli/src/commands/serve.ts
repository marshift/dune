import type { ArgusContext } from "@marshift/argus";
import type { DuneConfig } from "../lib/config";
import { createDevServer, createSSRServer } from "../lib/ssr";
import { Command } from "./base";

export class ServeCommand extends Command {
	override name = "serve";
	override execute({ templateDir, staticDir }: DuneConfig, ctx: ArgusContext): Promise<void> {
		const port = ctx.getOptionalArg(/--port|-p/) ?? 1413;
		const dev = ctx.hasOptionalArg(/--dev|-d/);
		const server = (dev ? createDevServer : createSSRServer)({
			templateDir,
			staticDir,
		});

		return Promise.resolve(
			void server.listen(port, () => {
				console.log(`Listening on port ${port}`);
			}),
		);
	}
}
