import { Document as DOM } from "jsr:@b-fuze/deno-dom";
import { Node } from "npm:kdljs";
import { Parser } from "./parser.ts";

export class Converter {
	private dom = new DOM();
	private parser: Parser;

	constructor(parser: Parser) {
		this.parser = parser;

		const root = this.parser.querySingle("html");
		if (!root) throw new Error("Missing page root");

		// HACK: Initialise documentElement ourselves
		Object.defineProperty(
			this.dom,
			"documentElement",
			{ value: this.convert(root) },
		);
	}

	private convert(node: Node) {
		const element = this.dom.createElement(node.name);

		element.textContent = node.values.map(String).join("\n");
		Object.entries(node.properties).forEach(([k, v]) => element.setAttribute(k, v));
		node.children.forEach((c) => element.appendChild(this.convert(c)));

		return element;
	}

	toHTML = () => this.dom.documentElement!.outerHTML;
}
