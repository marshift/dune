import type { DuneAST } from "../parser.js";

export abstract class Adapter {
	abstract process(ast: DuneAST): string;
}
