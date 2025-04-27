/// <reference types="@types/node" />

import { Buffer } from "node:buffer";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import * as web from "./index.web.ts";

export const fetch: typeof globalThis.fetch = (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input.toString());

	if (url.protocol === "file:") {
		const path = fileURLToPath(url);
		const stream = Readable.toWeb(createReadStream(path)) as ReadableStream; // I don't like the `as` but whatever
		return Promise.resolve(new Response(stream));
	}

	return web.fetch(input, init);
};

export async function importModule(_url: string) {
	const url = new URL(_url);

	if (url.pathname.endsWith(".ts")) throw new Error("Cannot dynamic import TypeScript file in Node");

	if (["http:", "https:"].some((p) => url.protocol === p)) {
		const req = await fetch(url);
		if (!req.ok) throw new Error(`Failed to resolve module at ${url}`);

		const b64 = await req.bytes().then((b) => Buffer.from(b).toString("base64"));
		const uri = `data:text/javascript;base64,${b64}`;
		return import(uri);
	}

	return web.importModule(_url);
}
