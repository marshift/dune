import type { ArgusContext } from "@marshift/argus";

export abstract class Command {
	abstract name: string;
	abstract execute(ctx: ArgusContext): Promise<void>;
}
