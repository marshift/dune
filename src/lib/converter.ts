import { Node } from "npm:kdljs";
import { Context, evaluate, template } from "./expressions.ts";
import html from "./html.ts";
import { Parser } from "./parser.ts";

function assertValueSize(node: Node, expected: number) {
	if (node.values.length !== expected) {
		throw new Error(
			`Incorrect number of values passed to node of type \"${node.name}\", expected ${expected} but got ${node.values.length}`,
		);
	}
}

export class Converter {
	private parser: Parser;
	private ctx: Context;
	public output = "";

	constructor(parser: Parser, ctx: Context) {
		this.parser = parser;
		this.ctx = ctx;

		const root = this.parser.querySingle("page");
		if (!root) throw new Error("Missing page root");

		this.walk(root.children, root);
	}

	private walk = (nodes: Node[], parent?: Node) => nodes.forEach((child) => this.visit(child, parent));
	private visit(node: Node, parent?: Node) {
		const values = node.values.map(String);
		const properties = Object.fromEntries(
			Object.entries(node.properties).map(([k, v]) => [
				k,
				template(String(v), this.ctx),
			]),
		);

		switch (node.name) {
			case "text": {
				assertValueSize(node, 1);
				this.output += template(values[0], this.ctx);
				break;
			}
			case "element": {
				assertValueSize(node, 1);
				const name = evaluate(values[0], this.ctx, true);

				this.output += html.open(name, properties);
				this.walk(node.children, node);
				this.output += html.close(name);
				break;
			}
			default: {
				this.output += html.open(node.name, properties);
				this.output += values.map((v) => template(v, this.ctx)).join("\n");
				this.walk(node.children, node);
				this.output += html.close(node.name);

				break;
			}
		}
	}
}
