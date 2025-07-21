import type { DuneNode } from "../parser.js";

export abstract class Adapter {
	abstract process(ast: DuneNode[]): string;
}
