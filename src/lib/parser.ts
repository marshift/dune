import { Document as HTMLDocument } from "jsr:@b-fuze/deno-dom";
import { Document as KDLDocument, Node as KDLNode, parse as parseKDL } from "npm:kdljs";

export class DuneParser {
	private document = new HTMLDocument();
	private kdl: KDLDocument;

	constructor(content: string) {
		const { output, errors } = parseKDL(content);
		if (errors.length !== 0) throw new Error("KDL parsing failed", ...errors);

		this.kdl = output!;
		Object.defineProperty(
			this.document,
			"documentElement",
			{ value: this.convertNodeToElement(this.kdl![0]) },
		);
	}

	private convertNodeToElement(node: KDLNode) {
		const element = this.document.createElement(node.name);

		element.textContent = node.values.map(String).join("\n");
		Object.entries(node.properties).forEach(([k, v]) => element.setAttribute(k, v));
		node.children.forEach((c) => element.appendChild(this.convertNodeToElement(c)));

		return element;
	}

	toHTML = () => this.document.documentElement!.outerHTML;
}
