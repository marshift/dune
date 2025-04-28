import fetch from "#lib/remote/fetch";
import { transform } from "sucrase";

// TODO:
// Using data URI imports for TypeScript transformation works well,
// except for the fact that relative imports from within will no longer resolve.
// This is problematic and should probably addressed via some kind of bundler...
// But is that overkill?
async function importModule(_url: string) {
	const url = new URL(_url);

	const req = await fetch(url);
	if (!req.ok) throw new Error(`Failed to resolve module at ${url}`);

	const { code } = await req.text().then((t) =>
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
