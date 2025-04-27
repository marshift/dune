import type { DuneNode } from "../parser.ts";
import { Adapter } from "./base.ts";

export class JSONAdapter extends Adapter {
	private pretty? = false;

	constructor(pretty?: boolean) {
		super();
		this.pretty = pretty;
	}

	override process = (ast: DuneNode[]) => JSON.stringify(ast, null, this.pretty ? 4 : 0);
}
