// Inspired by https://github.com/P0lip/simple-eval/blob/75aa4e24c5bbf97ae68f7722b87cd8a035c541b8/src/reduce.mjs, MIT licensed
// Written in JS with JSDoc typedefs because I was fighting jsep's constantly

import * as KDL from "@bgotink/kdl";
import jsep from "jsep";

/** @typedef {Record<PropertyKey, KDL.Primitive>} KDLPrimitiveRecord */
/** @typedef {KDL.Primitive | KDLPrimitiveRecord | Iterable<KDL.Primitive | KDLPrimitiveRecord>} Data */
/** @typedef {Record<string, Data>} Environment */

/**
 * @param {jsep.CoreExpression} node
 * @param {Environment} env
 * @returns {Data}
 */
function reduce(node, env) {
	switch (node.type) {
		case "Literal": {
			return node.value;
		}
		case "Identifier": {
			if (!(node.name in env)) throw new ReferenceError(`${node.name} is not defined`);
			return env[node.name];
		}
		case "MemberExpression": {
			const value = reduce(node.object, env);
			const key = node.property.type === "Identifier"
				? node.property.name
				: reduce(node.property, env);

			return value?.[key];
		}
		case "BinaryExpression": {
			return Function("l, r", `return l ${node.operator} r`)(
				reduce(node.left, env),
				reduce(node.right, env),
			);
		}
		case "UnaryExpression": {
			if (!node.prefix || node.argument.type !== "UnaryExpression") throw new SyntaxError("Unexpected operator");

			return Function("v", `return ${node.operator}v`)(
				reduce(node.argument, env),
			);
		}
		case "ConditionalExpression": {
			return Function("t, c, a", `return t ? c : a`)(
				reduce(node.test, env),
				reduce(node.consequent, env),
				reduce(node.alternate, env),
			);
		}
		default: {
			throw new Error(`Unsupported expression type ${node.type}`);
		}
	}
}

/**
 * @overload
 * @param {string} expr
 * @param {Environment} env
 * @returns {Data}
 */
/**
 * @overload
 * @param {string} expr
 * @param {Environment} env
 * @param {boolean} stringify
 * @returns {string}
 */
export function evaluate(expr, env, stringify = false) {
	const parsed = jsep(expr);
	const result = reduce(parsed, env);
	return stringify ? String(result) : result;
}

/**
 * @param {string} str
 * @param {Environment} env
 * @returns {string}
 */
export function template(str, env) {
	const matches = Array.from(str.matchAll(/\${(.*?)}/g), (m) => ({
		template: m[0],
		expression: m[1],
	}));

	for (const match of matches) str = str.replace(match.template, evaluate(match.expression, env, true));
	return str;
}

/**
 * @overload
 * @param {Map<string, KDL.Primitive>} props
 * @param {Environment} env
 * @returns {Record<string, KDL.Primitive>}
 */
/**
 * @overload
 * @param {Map<string, KDL.Primitive>} props
 * @param {Environment} env
 * @param {boolean} stringify
 * @returns {Record<string, string>}
 */
export const templateProperties = (props, env, stringify = false) =>
	Object.fromEntries(
		props.entries().map(([k, v]) => [
			k,
			typeof v === "string" ? template(v, env) : stringify ? String(v) : v,
		]),
	);
