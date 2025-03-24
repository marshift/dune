import { Node } from "npm:kdljs";
import html from "./html.ts";
import { Parser } from "./parser.ts";

export class Converter {
	private parser: Parser;
	public output = "";

	constructor(parser: Parser) {
		this.parser = parser;

		const root = this.parser.querySingle("page");
		if (!root) throw new Error("Missing page root");

		this.walk(root.children, root);
	}

	private walk = (nodes: Node[], parent?: Node) => nodes.forEach((child) => this.visit(child, parent));
	private visit(node: Node, parent?: Node) {
		switch (node.name) {
			default: {
				this.output += html.open(node.name, node.properties);
				this.output += node.values.map(String).join("\n");
				this.walk(node.children, node);
				this.output += html.close(node.name);

				break;
			}
		}
	}
}
