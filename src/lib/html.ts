// Basic HTML construction utils, because a DOM library is overkill
// Default export because these names are generic but need to be short

import { Value } from "npm:kdljs";

export default {
	doctype: "<!DOCTYPE html>",
	open: (type: string, attributes?: Record<string, Value>) =>
		`<${type}`
		+ (attributes ? ["", ...Object.entries(attributes).map(([k, v]) => `${k}=\"${v}\"`)].join(" ") : "")
		+ ">",
	close: (type: string) => `</${type}>`,
};
