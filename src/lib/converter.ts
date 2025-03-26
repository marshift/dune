import { Node } from "npm:kdljs";
import { Context, evaluate, template } from "./expressions.js";
import html from "./html.ts";
import { Parser } from "./parser.ts";

// https://stackoverflow.com/a/32538867
// deno-lint-ignore no-explicit-any
function isIterable<T>(obj: any): obj is Iterable<T> {
	if (obj == null) return false;
	return typeof obj[Symbol.iterator] === "function";
}

function assertValueSize(node: Node, expected: number) {
	if (node.values.length !== expected) {
		throw new Error(
			`Incorrect number of values passed to node of type \"${node.name}\", expected ${expected} but got ${node.values.length}`,
		);
	}
}

interface VisitorOptions {
	ctx?: Context;
	insertions?: Map<string, Node[]>;
}

export class Converter {
	private parser: Parser;
	private globals: Context;
	public output = "";

	constructor(parser: Parser, globals: Context = {}) {
		this.parser = parser;
		this.globals = globals;

		const root = this.parser.querySingle("page");
		if (!root) throw new Error("Missing page root");

		this.walk(root.children, root);
	}

	private walk = (nodes: Node[], parent: Node, options?: VisitorOptions) =>
		nodes.forEach((child) => this.visit(child, parent, options));

	private visit(node: Node, parent: Node, options: VisitorOptions = {}) {
		// Inject globals into passed context
		options.ctx = { ...this.globals, ...options.ctx };

		// For convenience, cast values and props to strings
		const stringValues = node.values.map(String);
		const templatedProps = Object.fromEntries(
			Object.entries(node.properties).map(([k, v]) => [
				k,
				template(String(v), options.ctx!),
			]),
		);

		switch (node.name) {
			// Flow
			case "each": {
				assertValueSize(node, 2);
				const iterableName = stringValues[0];
				const iterable = options.ctx[iterableName];
				if (!isIterable(iterable)) throw new Error(`\"${iterableName}\" is not iterable`);

				const itemName = stringValues[1];
				for (const item of iterable) {
					this.walk(node.children, parent, {
						...options,
						ctx: { ...options.ctx, [itemName]: item },
					});
				}

				break;
			}

			// Components
			case "use": {
				assertValueSize(node, 1);
				const name = stringValues[0];
				const component = this.parser.querySingle(`component[val() = ${name}]`);
				if (!component) throw new Error(`Unknown component \"${name}\"`);

				const insertions = new Map(
					node.children
						.filter((c) => c.name === "insert")
						.map((c) => [String(c.values[0]), c.children]),
				);

				this.walk(component.children, parent, {
					ctx: templatedProps, // Component context is isolated
					insertions,
				});
				break;
			}
			case "slot": {
				assertValueSize(node, 1);
				const insertion = options.insertions?.get(stringValues[0]);
				if (!insertion) break;

				this.walk(insertion, parent, options);
				break;
			}

			// Elements
			case "text": {
				assertValueSize(node, 1);
				this.output += template(stringValues[0], options.ctx);
				break;
			}
			case "element": {
				assertValueSize(node, 1);
				const name = evaluate(stringValues[0], options.ctx, true);

				this.output += html.open(name, templatedProps);
				this.walk(node.children, node, options);
				this.output += html.close(name);
				break;
			}
			default: {
				this.output += html.open(node.name, templatedProps);
				this.output += stringValues.map((v) => template(v, options.ctx!)).join("\n");
				this.walk(node.children, node, options);
				this.output += html.close(node.name);

				break;
			}
		}
	}
}
