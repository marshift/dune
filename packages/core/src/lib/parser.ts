import fetch from "#lib/remote/fetch";
import importModule from "#lib/remote/import";
import * as KDL from "@bgotink/kdl";
import type { Adapter } from "./adapters/base.js";
import { type Environment, evaluate, template, templateProperties } from "./expressions.js";

// The parser should parse all of these, even if they're conditionally used
type DuneDirective =
	| "element"
	| "text"
	| "slot"
	| "use"
	| "insert"
	| "each"
	| "if"
	| "elif"
	| "else";

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

type KDLNodeMap = Map<string, KDL.Node>;
type DependencyMap = Map<string, Parser>;

interface VisitOptions {
	// Cross-parser interactions
	caller?: Parser;
	insertions?: KDLNodeMap;

	// General
	env?: Environment;
}

// TODO: Unique errors for all failure cases?
export class ParserError extends Error {}

export class Parser {
	readonly #document: KDL.Document;
	readonly #root?: KDL.Node;
	readonly #components: KDLNodeMap;

	readonly imports: string[];
	dependencies: DependencyMap;
	globals: Environment;

	constructor(input: string | ArrayBuffer, globals: Environment = {}, dependencies: DependencyMap = new Map()) {
		this.#document = KDL.parse(input);
		this.#root = this.#document.findNodeByName("page");
		this.#components = Parser.#mapNamedNodes(this.#document.findNodesByName("component"));

		this.imports = this.#document.findNodesByName("import").map((node) => {
			Parser.#assertArgumentLength(node, 1);

			const path = node.getArgument(0);
			Parser.#assertStringPrimitive(path);

			return path;
		});
		this.dependencies = dependencies;
		this.globals = globals;
	}

	// #region Assertions
	static #assertStringPrimitive(primitive: KDL.Primitive | undefined): asserts primitive is string {
		const type = typeof primitive;
		if (type !== "string") {
			throw new ParserError(
				`Expected primitive of type string but got ${type}`,
			);
		}
	}

	static #assertIsIterable<T>(obj: any): asserts obj is Iterable<T> {
		if (obj == null || typeof obj[Symbol.iterator] !== "function") {
			throw new ParserError("Expected an iterable");
		}
	}

	static #assertArgumentLength(node: KDL.Node, expected: number) {
		const args = node.getArguments();
		if (args.length !== expected) {
			throw new ParserError(
				`Incorrect number of values passed to node of type \"${node.getName()}\", expected ${expected} but got ${args.length}`,
			);
		}
	}

	static #isNodeExpectedType(node: KDL.Node | undefined, expected: string | RegExp) {
		if (!node) return false;
		const name = node.getName();

		if (expected instanceof RegExp) {
			return expected.test(name);
		} else {
			return name === expected;
		}
	}
	static #assertParentNodeType(parent: KDL.Node, node: KDL.Node, expected: string | RegExp) {
		if (!Parser.#isNodeExpectedType(parent, expected)) {
			throw new ParserError(
				`Invalid position for node of type \"${node.getName()}\", expected parent node to be of type \"${expected}\" but got \"${parent.getName()}\"`,
			);
		}
	}
	static #assertSiblingNodeType(
		parent: KDL.Node,
		node: KDL.Node,
		direction: "previous" | "next",
		expected: string | RegExp,
	) {
		const name = node.getName();
		const offset = direction === "previous" ? -1 : 1;
		const family = parent.children!.nodes;
		const sibling: KDL.Node | undefined = family[family.indexOf(node) + offset];

		if (!sibling) {
			throw new ParserError(
				`Invalid position for node of type \"${name}\", expected a sibling node ${direction} to it`,
			);
		} else if (!Parser.#isNodeExpectedType(sibling, expected)) {
			throw new ParserError(
				`Invalid position for node of type \"${name}\", expected sibling node ${direction} to it to be of type \"${expected}\" but got \"${sibling.getName()}\"`,
			);
		}
	}
	// #endregion

	// "Named nodes" - components, insertions, etc
	static #mapNamedNodes = (nodes: KDL.Node[]): KDLNodeMap =>
		new Map(nodes.map((node) => {
			Parser.#assertArgumentLength(node, 1);

			const name = node.getArgument(0);
			Parser.#assertStringPrimitive(name);

			return [name, node];
		}));

	#walk(root: KDL.Node, options?: VisitOptions) {
		if (!root.children) return []; // Handle both empty array or null children block
		return root.children.nodes.flatMap((child) => this.#visit(root, child, options)).filter((node) => !!node);
	}
	#visit(parent: KDL.Node, node: KDL.Node, options: VisitOptions = {}): DuneNode | DuneNode[] | undefined {
		options.env = { ...this.globals, ...options.env }; // Merge global and local env

		switch (node.getName() as DuneDirective) {
			// #region AST: Flow
			case "else":
			case "elif": {
				Parser.#assertSiblingNodeType(parent, node, "previous", /if|elif/);
				return;
			}
			case "if": {
				const thisIdx = parent.children!.nodes.indexOf(node);
				const nextSiblings = parent.children!.nodes.slice(thisIdx);

				outer: for (const sibling of nextSiblings) {
					switch (sibling.getName()) {
						case "elif":
						case "if": {
							Parser.#assertArgumentLength(sibling, 1);

							const condition = sibling.getArgument(0);
							Parser.#assertStringPrimitive(condition);

							const result = !!evaluate(condition, options.env);
							if (!result) continue outer;
						}
						case "else": {
							return this.#walk(sibling, options);
						}
						default: {
							break outer;
						}
					}
				}

				return;
			}
			case "each": {
				Parser.#assertArgumentLength(node, 2);

				const expr = node.getArgument(0);
				Parser.#assertStringPrimitive(expr);

				const iterable = evaluate(expr, options.env);
				Parser.#assertIsIterable(iterable);

				const variableName = node.getArgument(1);
				Parser.#assertStringPrimitive(variableName);

				const iterations = [];
				for (const item of iterable) {
					iterations.push(this.#walk(node, {
						...options,
						env: { ...options.env, [variableName]: item },
					}));
				}

				return iterations.flat();
			}

			// #region AST: Components
			case "insert": {
				Parser.#assertParentNodeType(parent, node, "use");
				return;
			}
			case "use": {
				Parser.#assertArgumentLength(node, 1);

				const name = node.getArgument(0);
				Parser.#assertStringPrimitive(name);

				const callee = [this, ...this.dependencies.values()].find((p) => p.#components.has(name));
				if (!callee) throw new ParserError(`Unknown component \"${name}\"`);

				const component = callee.#components.get(name)!;

				return callee.#walk(component, {
					caller: this,
					insertions: Parser.#mapNamedNodes(node.findNodesByName("insert")),
					env: templateProperties(node.getProperties(), options.env), // Component body is an isolated environment
				});
			}
			case "slot": {
				Parser.#assertArgumentLength(node, 1);

				const name = node.getArgument(0);
				Parser.#assertStringPrimitive(name);

				const insertion = options.insertions?.get(name);
				if (!insertion) return;

				return options.caller!.#walk(insertion, options);
			}

			// #region AST: Elements
			case "text": {
				Parser.#assertArgumentLength(node, 1);

				const content = node.getArgument(0);
				Parser.#assertStringPrimitive(content);

				return {
					type: "text",
					content: template(content, options.env),
				};
			}
			case "element": {
				Parser.#assertArgumentLength(node, 1);

				const expr = node.getArgument(0);
				Parser.#assertStringPrimitive(expr);

				const name = evaluate(expr, options.env, true);
				const attributes = templateProperties(node.getProperties(), options.env, true);

				return {
					type: "element",
					name,
					attributes,
					body: this.#walk(node, options),
				};
			}
			default: {
				const attributes = templateProperties(node.getProperties(), options.env, true);

				return {
					type: "element",
					name: node.getName(),
					attributes,
					body: [
						...node.getArguments().map((v) => {
							Parser.#assertStringPrimitive(v);
							return {
								type: "text" as const,
								content: template(v, options.env!),
							};
						}),
						...this.#walk(node, options),
					],
				};
			}
		}
	}

	toAST() {
		if (!this.#root) throw new ParserError("Cannot build an AST from a document with no \"page\" node");
		return this.#walk(this.#root);
	}
	convert = (adapter: Adapter) => adapter.process(this.toAST());

	static async for(url: URL): Promise<Parser> {
		if (!url.pathname.endsWith(".kdl")) throw new ParserError("Expected a KDL (\".kdl\") file");

		const content = await fetch(url, { cache: "no-cache" })
			.then((r) => r.text())
			.catch((e: Error) => {
				throw new ParserError(`Failed to fetch KDL file at "${url}": ${e.message}`);
			});

		let env: Environment | undefined;
		for (const ext of [".js", ".mjs", ".ts", ".mts"]) {
			try {
				const companionUrl = new URL(url.href.substring(0, url.href.length - ".kdl".length) + ext);
				const companion = await importModule(`${companionUrl.href}?v=${Date.now()}`);
				env = companion.default;
				break;
			} catch (e) {
				if ((e as any).code === "ERR_MODULE_NOT_FOUND") continue;
				throw e;
			}
		}

		const parser = new Parser(content, env);
		for (const path of parser.imports) {
			await Parser.for(new URL(path, url)).then((p) => parser.dependencies.set(path, p));
		}

		return parser;
	}
}
