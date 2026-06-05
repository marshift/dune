import type { DuneAST, DuneNode } from "../parser.js";
import { Adapter } from "./base.js";
import { CSSAdapter } from "./css.js";

export class HTMLAdapter extends Adapter {
	static readonly #DOCTYPE = "<!DOCTYPE html>";
	static readonly #VOID_ELEMENTS = new Set([
		"area",
		"base",
		"br",
		"col",
		"embed",
		"hr",
		"img",
		"input",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	]);

	static readonly #ESCAPE_ELEMENT_BLACKLIST = new Set(["style", "script"]);
	static readonly #ESCAPE_MAP: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#x27;",
	};
	static readonly #ESCAPE_REGEX = new RegExp(`[${Object.keys(this.#ESCAPE_MAP).join("")}]`, "g");

	static #element(name: string, attributes: Record<string, string>, children: string[]) {
		let final = `<${name}`;

		const attributeEntries = Object.entries(attributes);
		if (attributeEntries.length !== 0) {
			final += " " + attributeEntries
				.map(([k, v]) => `${k}=\"${v}\"`)
				.join(" ");
		}

		final += `>${children.join("")}`;

		if (!this.#VOID_ELEMENTS.has(name)) final += `</${name}>`;
		return final;
	}

	static #walk = (nodes: DuneNode[], parent?: DuneNode) => nodes.map((node) => this.#visit(node, parent));
	static #visit(node: DuneNode, parent?: DuneNode): string {
		switch (node.type) {
			case "text": {
				return parent?.type === "element" && this.#ESCAPE_ELEMENT_BLACKLIST.has(parent.name)
					? node.content
					: node.content.replace(this.#ESCAPE_REGEX, (char) => this.#ESCAPE_MAP[char]);
			}
			case "element": {
				return this.#element(node.name, node.attributes, this.#walk(node.body, node));
			}
		}
	}

	static addHeadElement(ast: DuneAST, node: DuneNode) {
		if (!ast.page) throw new Error("Cannot add an element to the head of an AST with no \"page\"");

		const head = ast.page
			.filter((node) => node.type === "element")
			.find((node) => node.name === "head");

		if (head) head.body.unshift(node);
		else ast.page.unshift({ type: "element", name: "head", attributes: {}, body: [node] });
	}

	override process(ast: DuneAST) {
		if (!ast.page) throw new Error("HTMLAdapter can only process an AST with a \"page\"");

		if (ast.style) {
			HTMLAdapter.addHeadElement(ast, {
				type: "element",
				name: "style",
				attributes: {},
				body: [{ type: "text", content: new CSSAdapter().process(ast) }],
			});
		}

		return HTMLAdapter.#DOCTYPE + HTMLAdapter.#element("html", {}, HTMLAdapter.#walk(ast.page));
	}
}
