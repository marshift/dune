// Inspired by https://github.com/P0lip/simple-eval/blob/75aa4e24c5bbf97ae68f7722b87cd8a035c541b8/src/reduce.mjs, MIT licensed
// Written in JS with JSDoc because I was fighting jsep's typedefs constantly

import jsep from "jsep";

/** @typedef {import("kdljs").Value} Value */
/** @typedef {Record<PropertyKey, Value>} ValueRecord */
/** @typedef {(Value | ValueRecord | Iterable<Value | ValueRecord>)} Data */
/** @typedef {Record<string, Data>} Context */

/**
 * @param {import("jsep").CoreExpression} node
 * @param {Context} ctx
 * @returns {Data}
 */
function reduce(node, ctx) {
	switch (node.type) {
		case "Literal": {
			return node.value;
		}
		case "Identifier": {
			if (!(node.name in ctx)) throw new ReferenceError(`${node.name} is not defined`);
			return ctx[node.name];
		}
		case "MemberExpression": {
			const value = reduce(node.object, ctx);
			const key = node.property.type === "Identifier"
				? node.property.name
				: reduce(node.property, ctx);

			return value?.[key];
		}
		case "BinaryExpression": {
			return Function("l, r", `return l ${node.operator} r`)(
				reduce(node.left, ctx),
				reduce(node.right, ctx),
			);
		}
		case "UnaryExpression": {
			if (!node.prefix || node.argument.type !== "UnaryExpression") throw new SyntaxError("Unexpected operator");

			return Function("v", `return ${node.operator}v`)(
				reduce(node.argument, ctx),
			);
		}
		case "ConditionalExpression": {
			return Function("t, c, a", `return t ? c : a`)(
				reduce(node.test, ctx),
				reduce(node.consequent, ctx),
				reduce(node.alternate, ctx),
			);
		}
		default: {
			throw new Error(`Unsupported expression type ${node.type}`);
		}
	}
}

/** @type {((expr: string, ctx: Context) => Value & (expr: string, ctx: Context, stringify: boolean) => string)} */

/**
 * @overload
 * @param {string} expr
 * @param {Context} ctx
 * @returns {Data}
 */

/**
 * @overload
 * @param {string} expr
 * @param {Context} ctx
 * @param {boolean} stringify
 * @returns {string}
 */
export function evaluate(expr, ctx, stringify = false) {
	const parsed = jsep(expr);
	const result = reduce(parsed, ctx);
	return stringify ? String(result) : result;
}

/**
 * @param {string} str
 * @param {Context} ctx
 * @returns {string}
 */
export function template(str, ctx) {
	const matches = Array.from(str.matchAll(/\${(.*?)}/g), (m) => ({
		template: m[0],
		expression: m[1],
	}));

	matches.forEach((m) => str = str.replace(m.template, evaluate(m.expression, ctx, true)));
	return str;
}

/**
 * @overload
 * @param {Record<string, Value>} props
 * @param {Context} ctx
 * @returns {Record<string, Value>}
 */

/**
 * @overload
 * @param {Record<string, Value>} props
 * @param {Context} ctx
 * @param {boolean} stringify
 * @returns {Record<string, string>}
 */
export const remap = (props, ctx, stringify = false) =>
	Object.fromEntries(
		Object.entries(props).map(([k, v]) => [
			k,
			typeof v === "string" ? template(v, ctx) : stringify ? String(v) : v,
		]),
	);
