import fetch from "#lib/remote/fetch"; // Use our own fetch
import { transform } from "sucrase";
import { BadStatusCodeError } from "../shared.js";

export class ModuleNotFoundError extends TypeError {
	code = "ERR_MODULE_NOT_FOUND";

	constructor(url: string | URL) {
		super(`Module not found \"${url}\"`);
	}
}

/* 	// TODO:
	Using data URI imports for TypeScript transformation works well,
	except for the fact that relative imports from within will no longer resolve.
	This is problematic and should probably addressed via some kind of bundler...
*/
async function importModule(url: string) {
	const res = await fetch(url).catch((e) => {
		if (e instanceof BadStatusCodeError) throw new ModuleNotFoundError(url);
		throw e;
	});

	const { code } = await res.text().then((t) =>
		transform(t, {
			disableESTransforms: true,
			preserveDynamicImport: true,
			transforms: ["typescript"],
		})
	);

	const uri = `data:text/javascript;base64,${btoa(code)}`;
	return import(uri);
}

export default importModule;
