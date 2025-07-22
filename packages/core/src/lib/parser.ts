import fetch from "#lib/remote/fetch";
import importModule from "#lib/remote/import";
import { type Node as KDLNode, parse, query, type QueryString, type Value } from "kdljs";
import { Adapter } from "./adapters/base.js";
import { JS_FILE_EXTENSIONS, TS_FILE_EXTENSIONS } from "./constants.js";
import { type Context, evaluate, remap, template } from "./expressions.js";

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

const isNodeExpectedType = (node: KDLNode, expected: string | RegExp) =>
	!!node && (typeof expected === "string"
		? node.name === expected
		: expected.test(node.name));

function assertParentNodeType(node: KDLNode, parent: KDLNode, expected: string | RegExp) {
	if (!isNodeExpectedType(parent, expected)) {
		throw new Error(
			`Invalid position for node of type \"${node.name}\", expected parent node to be of type \"${expected}\" but got \"${parent.name}\"`,
		);
	}
}

function assertPreviousNodeType(node: KDLNode, parent: KDLNode, expected: string | RegExp) {
	const thisIdx = parent.children.indexOf(node) - 1;
	const prev = parent.children[thisIdx];
	if (!isNodeExpectedType(prev, expected)) {
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
	// Cross-parser interactions
	caller?: Parser;
	insertions?: Map<string, KDLNode>;

	// General
	ctx?: Context;
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
	readonly dependencies: Map<string, Parser>;
	globals: Context;

	constructor(content: string, globals: Context = {}, dependencies = new Map<string, Parser>()) {
		const { output, errors } = parse(content);
		if (errors.length !== 0) throw new Error(["KDL parsing failed:", ...errors].join("\n"));

		this.document = output!;
		this.root = this.query(this.document, "page", true);
		this.components = this.extract(this.document, "component");
		this.dependencies = dependencies;
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
				const startIdx = parent.children.indexOf(node);
				const endIdx = parent.children.findIndex((node) => /if|elif|else/.test(node.name));
				const block = parent.children.slice(startIdx, endIdx);

				outer: for (const member of block) {
					switch (member.name) {
						case "elif":
						case "if": {
							assertValueSize(member, 1);
							assertStringValue(member.values[0]);

							const result = !!evaluate(member.values[0], options.ctx);
							if (!result) continue outer;
						}
						case "else": {
							return this.walk(member, options);
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
				assertParentNodeType(node, parent, "use");
				return;
			}
			case "use": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				const name = node.values[0];
				const callee = [this, ...this.dependencies.values()].find((p) => p.components.has(name));
				if (!callee) throw new Error(`Unknown component \"${name}\"`);

				const component = callee.components.get(name)!;

				return callee.walk(component, {
					caller: this,
					insertions: this.extract(node.children, "insert"),
					ctx: remap(node.properties, options.ctx), // Component body is an isolated context
				});
			}
			case "slot": {
				assertValueSize(node, 1);
				assertStringValue(node.values[0]);

				const insertion = options.insertions?.get(node.values[0]);
				if (!insertion) return;

				return options.caller!.walk(insertion, options);
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

	public toAST() {
		if (!this.root) throw new Error("Cannot get an AST from a document with no page root");
		return this.walk(this.root);
	}

	public convert = (adapter: Adapter) => adapter.process(this.toAST());

	static async for(url: URL): Promise<Parser> {
		if (!url.pathname.endsWith(".kdl")) throw new Error("Expected a KDL (\".kdl\") file");

		const content = await fetch(url, { cache: "no-cache" })
			.then((r) => r.text())
			.catch((e: Error) => {
				throw new Error(`Failed to fetch KDL file at "${url}": ${e.message}`);
			});

		let context: Context | undefined;
		for (const ext of [...JS_FILE_EXTENSIONS, ...TS_FILE_EXTENSIONS]) {
			try {
				const companionUrl = new URL(url.href.substring(0, url.href.length - ".kdl".length) + ext + `?v=${Date.now()}`);
				const companion = await importModule(companionUrl.href);
				context = companion.default;
				break;
			} catch {
				continue;
			}
		}

		// TODO: Making two seperate parsers for this is a bit hacky but... blegh.
		const parser = new Parser(content, context);
		const dependencies = new Map(
			await Promise.all(
				parser.query(parser.document, "import").map(async (child) => {
					assertStringValue(child.values[0]);
					return [
						child.values[0],
						await Parser.for(new URL(child.values[0], url)),
					] as const;
				}),
			),
		);

		return new Parser(content, context, dependencies);
	}
}
