import type { DuneNode } from "../parser.js";
import { Adapter } from "./base.js";

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
	static readonly #escapeRegexp = new RegExp(`[${Object.keys(this.#ESCAPE_MAP).join("")}]`, "g");

	static #element(type: string, attributes: Record<string, string>, children: string[]) {
		let final = `<${type}`;

		const attributeEntries = Object.entries(attributes);
		if (attributeEntries.length !== 0) {
			final += " " + attributeEntries
				.map(([k, v]) => `${k}=\"${v}\"`)
				.join(" ");
		}

		final += `>${children.join("")}`;

		if (!this.#VOID_ELEMENTS.has(type)) final += `</${type}>`;
		return final;
	}

	static #walk = (nodes: DuneNode[], parent?: DuneNode) => nodes.map((node) => this.#visit(node, parent));
	static #visit(node: DuneNode, parent?: DuneNode): string {
		switch (node.type) {
			case "text": {
				return parent?.type === "element" && this.#ESCAPE_ELEMENT_BLACKLIST.has(parent.name)
					? node.content
					: node.content.replace(this.#escapeRegexp, (char) => this.#ESCAPE_MAP[char]);
			}
			case "element": {
				return this.#element(node.name, node.attributes, this.#walk(node.body, node));
			}
		}
	}

	override process = (ast: DuneNode[]) =>
		HTMLAdapter.#DOCTYPE + HTMLAdapter.#element("html", {}, HTMLAdapter.#walk(ast));
}
