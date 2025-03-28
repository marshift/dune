import { DuneNode } from "../parser.ts";
import { Adapter } from "./base.ts";

export class HTMLAdapter extends Adapter {
	private output = "<!DOCTYPE html>";

	private openElement = (type: string, attributes?: Record<string, string>) =>
		this.output += `<${type}`
			+ (attributes ? ["", ...Object.entries(attributes).map(([k, v]) => `${k}=\"${v}\"`)].join(" ") : "")
			+ ">";

	private closeElement = (type: string) => this.output += `</${type}>`;

	private walk = (nodes: DuneNode[]) => nodes.forEach((child) => this.visit(child));
	private visit(node: DuneNode) {
		switch (node.type) {
			case "text":
				this.output += node.content;
				break;
			case "element":
				this.openElement(node.name, node.attributes);
				this.walk(node.body);
				this.closeElement(node.name);
		}
	}

	override process(ast: DuneNode[]) {
		this.openElement("html");
		this.walk(ast);
		this.closeElement("html");
		return this.output;
	}
}
