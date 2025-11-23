import type { DuneNode } from "../parser.js";
import { Adapter } from "./base.js";

export class JSONAdapter extends Adapter {
	readonly #pretty: boolean;

	constructor(pretty = false) {
		super();
		this.#pretty = pretty;
	}

	override process = (ast: DuneNode[]) => JSON.stringify(ast, null, this.#pretty ? 4 : 0);
}
