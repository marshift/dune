import type { ArgusContext } from "@marshift/argus";
import { join } from "node:path";
import type { DuneConfig } from "../lib/config";
import { createSSRServer } from "../lib/ssr";
import { Command } from "./base";

export class ServeCommand extends Command {
	override name = "serve";
	override execute({ templateDir, staticDir }: DuneConfig, ctx: ArgusContext): Promise<void> {
		const port = ctx.getOptionalArg(/--port|-p/) ?? 1413;
		const server = createSSRServer(join(templateDir, "./pages/"), staticDir);

		return Promise.resolve(
			void server.listen(port, () => {
				console.log(`Listening on port ${port}`);
			}),
		);
	}
}
