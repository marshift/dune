import type { DuneNode } from "../parser.ts";

export abstract class Adapter {
	abstract process(ast: DuneNode[]): string;
}
