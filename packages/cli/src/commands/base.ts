import type { ArgusContext } from "@marshift/argus";
import type { DuneConfig } from "../lib/config";

export abstract class Command {
	abstract name: string;
	abstract execute(config: DuneConfig, ctx: ArgusContext): Promise<void>;
}
