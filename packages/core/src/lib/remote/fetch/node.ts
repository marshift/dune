/// <reference types="@types/node" />

import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import webFetch from "./web.ts";

const fetch: typeof globalThis.fetch = (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input.toString());

	if (url.protocol === "file:") {
		const path = fileURLToPath(url);
		const stream = Readable.toWeb(createReadStream(path)) as ReadableStream; // I don't like the `as` but whatever
		return Promise.resolve(new Response(stream));
	}

	return webFetch(input, init);
};

export default fetch;
