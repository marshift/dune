import type { DuneNode } from "../parser.ts";
import { Adapter } from "./base.ts";

export class HTMLAdapter extends Adapter {
	private doctype = "<!DOCTYPE html>";
	private element(type: string, attributes: Record<string, string>, children: string[]) {
		let final = `<${type}`;

		if (Object.keys(attributes).length !== 0) {
			final += [
				"",
				...Object.entries(attributes).map(([k, v]) => `${k}=\"${v}\"`),
			].join(" ");
		}
		if (children.length !== 0) {
			final += `>${children.join("")}</${type}>`;
		} else {
			final += " />";
		}

		return final;
	}

	private walk = (nodes: DuneNode[]): string[] => nodes.map((child) => this.visit(child));
	private visit(node: DuneNode): string {
		switch (node.type) {
			case "text":
				return node.content;
			case "element":
				return this.element(node.name, node.attributes, this.walk(node.body));
		}
	}

	override process = (ast: DuneNode[]) => this.doctype + this.element("html", {}, this.walk(ast));
}
