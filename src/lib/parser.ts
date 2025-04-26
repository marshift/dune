import { Node as KDLNode, parse, query, QueryString, Value } from "npm:kdljs";
import { Adapter } from "./adapters/base.ts";
import { Context, evaluate, remap, template } from "./expressions.js";

function assertValueSize(node: KDLNode, expected: number) {
	if (node.values.length !== expected) {
		throw new Error(
			`Incorrect number of values passed to node of type \"${node.name}\", expected ${expected} but got ${node.values.length}`,
		);
	}
}

function assertStringValue(value: Value): asserts value is string {
	const type = typeof value;
	if (type !== "string") {
		throw new Error(
			`Expected primitive value of type string but got ${type}`,
		);
	}
}

// deno-lint-ignore no-explicit-any
function assertIsIterable<T>(obj: any): asserts obj is Iterable<T> {
	if (obj == null || typeof obj[Symbol.iterator] !== "function") {
		throw new Error("Expected an iterable");
	}
}

function assertPreviousNodeType(node: KDLNode, parent: KDLNode, expected: string | RegExp) {
	const thisIdx = parent.children.indexOf(node) - 1;
	const prev = parent.children[thisIdx];
	if (
		!prev
			|| typeof expected === "string"
			? prev.name !== expected
			: !expected.test(prev.name)
	) {
		throw new Error(
			`Invalid position for node of type \"${node.name}\", expected previous node to be of type \"${expected}\" but got \"${prev.name}\"`,
		);
	}
}

// The parser should parse all of these, even if they're conditionally used
type ParseableKDLNodeTypes =
	| "element"
	| "text"
	| "slot"
	| "use"
	| "insert"
	| "each"
	| "if"
	| "elif"
	| "else";

interface KDLNodeVisitorOptions {
	ctx?: Context;
	insertions?: Map<string, KDLNode>;
}

interface DuneElementNode {
	type: "element";
	name: string;
	attributes: Record<string, string>;
	body: DuneNode[];
}

interface DuneTextNode {
	type: "text";
	content: string;
}

export type DuneNode = DuneElementNode | DuneTextNode;

export class Parser {
	readonly document: KDLNode[];
	readonly root?: KDLNode;
	readonly components: Map<string, KDLNode>;
	globals: Context;

	constructor(content: string, globals: Context = {}) {
		const { output, errors } = parse(content);
		if (errors.length !== 0) throw new Error(["KDL parsing failed:", ...errors].join("\n"));

		this.document = output!;
		this.root = this.query(this.document, "page", true);
		this.components = this.extract(this.document, "component");
		this.globals = globals;
	}

	private query(document: KDLNode[], str: QueryString): KDLNode[];
	private query(document: KDLNode[], str: QueryString, single: boolean): KDLNode;
	private query(document: KDLNode[], str: QueryString, single = false) {
		const result: KDLNode[] = query(document, str);
		if (single) {
			if (result.length > 1) throw new Error(`Expected single instance for query "${str}"`);
			return result[0];
		} else {
			return result;
		}
	}
	private extract = (document: KDLNode[], str: QueryString) =>
		new Map(
			this.query(document, str)
				.map((child) => {
					assertStringValue(child.values[0]);
					return [child.values[0], child];
				}),
		);

	private walk = (node: KDLNode, options?: KDLNodeVisitorOptions): DuneNode[] =>
		node.children.flatMap((child) => this.visit(child, node, options)).filter((node) => !!node);
	private visit(
		node: KDLNode,
		parent: KDLNode,
		options: KDLNodeVisitorOptions = {},
	): DuneNode | DuneNode[] | undefined {
		// Inject globals into passed context
		options.ctx = { ...this.globals, ...options.ctx };

		// Build the AST
		switch (node.name as ParseableKDLNodeTypes) {
			// Flow
			case "else":
			case "elif": {
				assertPreviousNodeType(node, parent, /if|elif/);
				return;
			}
			case "if": {
				const thisIdx = parent.children.indexOf(node);
				const block = parent.children.slice(thisIdx);

				outer: for (const member of block) {
					switch (member.name) {
						case "elif":
						case "if": {
							assertValueSize(member, 1);
							assertStringValue(member.values[0]);

							const result = !!evaluate(member.values[0], options.ctx);
							if (!result) continue outer;
						}
						/* falls through */
						case "else": {
							return this.walk(member, options);
						}
						default: {
							break outer;
						}
					}
				}

				return;
			}
			case "each": {
				assertValueSize(node, 2);
				assertStringValue(node.values[0]);
				assertStringValue(node.values[1]);

				const iterable = options.ctx[node.values[0]];
				assertIsIterable(iterable);

				const iterations = [];
				for (const item of iterable) {
					iterations.push(this.walk(node, {
						...options,
						ctx: { ...options.ctx, [node.values[1]]: item },
					}));
				}

				return iterations.flat();
			}

			// Components
			case "insert": {
				assertPreviousNodeType(node, parent, "use");
				return;
			}
			case "use": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				const component = this.components.get(node.values[0]);
				if (!component) throw new Error(`Unknown component \"${node.values[0]}\"`);

				return this.walk(component, {
					ctx: remap(node.properties, options.ctx), // Component context is isolated
					insertions: this.extract(node.children, "insert"),
				});
			}
			case "slot": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				const insertion = options.insertions?.get(node.values[0]);
				if (!insertion) return;

				return this.walk(insertion, options);
			}

			// Elements
			case "text": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				return {
					type: "text",
					content: template(node.values[0], options.ctx),
				};
			}
			case "element": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				const name = evaluate(node.values[0], options.ctx, true);
				const attributes = remap(node.properties, options.ctx, true);

				return {
					type: "element",
					name,
					attributes,
					body: this.walk(node, options),
				};
			}
			default: {
				const attributes = remap(node.properties, options.ctx, true);

				return {
					type: "element",
					name: node.name,
					attributes,
					body: [
						...node.values.map((value) => {
							assertStringValue(value);
							return {
								type: "text" as const,
								content: template(value, options.ctx!),
							};
						}),
						...this.walk(node, options),
					],
				};
			}
		}
	}

	public convert(adapter: Adapter) {
		if (!this.root) return null;

		const ast = this.walk(this.root);
		return adapter.process(ast);
	}

	static async for(url: URL): Promise<Parser> {
		if (!url.pathname.endsWith(".kdl")) throw new Error("Expected a KDL (\".kdl\") file");

		const content = await fetch(url)
			.then((m) => m.text())
			.catch((e: Error) => {
				throw new Error(`Failed to fetch KDL file at "${url}": ${e.message}`);
			});

		let context: Context | undefined;

		for (const ext of [".ts", ".js", ".mjs"]) {
			try {
				const companionUrl = new URL(url.href.substring(0, url.href.length - ".kdl".length) + ext);
				const companion = await import(companionUrl.href);
				context = companion.default;
				break;
			} catch (e) {
				// deno-lint-ignore no-explicit-any
				if ((e as any).code === "ERR_MODULE_NOT_FOUND") continue;
				throw e;
			}
		}

		return new Parser(content, context);
	}
}
