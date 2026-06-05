import type { DuneNode } from "../parser.js";
import { Adapter } from "./base.js";

export class CSSAdapter extends Adapter {
	static #walk = (nodes: DuneNode[], parent?: DuneNode) => nodes.map((node) => this.#visit(node, parent)).join("");
	static #visit(node: DuneNode, parent?: DuneNode): string {
		switch (node.type) {
			case "text":
				return node.content;
			case "element": {
				if (node.body.length === 0) throw new Error("Empty nodes are not allowed");
				if (node.body.every((n) => n.type === "text")) {
					if (!parent) throw new Error("Declarations must have a parent");
					return `${node.name}:${node.body.map((n) => n.content).join(" ")}${
						node.attributes.important ? "!important" : ""
					};`;
				} else if (node.body.every((n) => n.type === "element")) {
					return `${node.name}{${this.#walk(node.body, node)}}`;
				} else {
					throw new Error("A node must only have children of a single type");
				}
			}
		}
	}

	override process = (ast: DuneNode[]) => CSSAdapter.#walk(ast);
}
