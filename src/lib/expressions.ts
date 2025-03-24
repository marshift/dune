// Inspired by https://github.com/P0lip/simple-eval/blob/75aa4e24c5bbf97ae68f7722b87cd8a035c541b8/src/reduce.mjs, MIT licensed

import jsep, { CoreExpression as Expression } from "npm:jsep";
import { Value } from "npm:kdljs";

export type Context = Record<string, Value>;

function reduce(node: Expression, ctx: Context): Value {
	switch (node.type) {
		case "Literal": {
			return node.value as Value;
		}
		case "Identifier": {
			if (!(node.name in ctx)) throw new ReferenceError(`${node.name} is not defined`);
			return ctx[node.name];
		}
		case "BinaryExpression": {
			return Function("l, r", `return l ${node.operator} r`)(
				reduce(node.left as Expression, ctx),
				reduce(node.right as Expression, ctx),
			);
		}
		case "ConditionalExpression": {
			return Function("t, c, a", `return t ? c : a`)(
				reduce(node.test as Expression, ctx),
				reduce(node.consequent as Expression, ctx),
				reduce(node.alternate as Expression, ctx),
			);
		}
		default: {
			throw new Error(`Unsupported expression type ${node.type}`);
		}
	}
}

export function evaluate(expr: string, ctx: Context): Value;
export function evaluate(expr: string, ctx: Context, stringify: boolean): string;
export function evaluate(expr: string, ctx: Context, stringify = false) {
	const parsed = jsep(expr) as Expression;
	const result = reduce(parsed, ctx);
	return stringify ? String(result) : result;
}

export function template(str: string, ctx: Context) {
	const templates = Array.from(str.matchAll(/\${(.*?)}/g), (m) => ({
		start: m.index,
		end: m[0].length,
		expr: m[1],
	}));

	const chars = str.split("");
	templates.forEach((t) => chars.splice(t.start, t.end, evaluate(t.expr, ctx, true)));

	return chars.join("");
}
