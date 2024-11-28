import { Document, Node, parse, query, QueryString } from "npm:kdljs";

export class Parser {
	private document: Document;

	constructor(content: string) {
		const { output, errors } = parse(content);
		if (errors.length !== 0) throw new Error(["KDL parsing failed:", ...errors].join("\n"));

		this.document = output!;
	}

	query = (string: QueryString): Node[] => query(this.document, string);
	querySingle(string: QueryString): Node | undefined {
		const result = this.query(string);
		if (result.length > 1) throw new Error(`Expected single instance for query "${string}"`);

		return result[0];
	}

	static for = async (path: string) => new Parser(new TextDecoder("utf-8").decode(await Deno.readFile(path)));
}
