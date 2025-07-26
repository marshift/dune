/// <reference types="@types/node" />

import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { BadStatusCodeError } from "../shared.js";
import webFetch from "./web.js";

const fetch: typeof globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : input.toString());
	if (url.protocol !== "file:") return await webFetch(input, init);

	const path = fileURLToPath(url);
	if (!existsSync(path)) throw new BadStatusCodeError(404);

	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream; // I don't like the `as` but whatever
	return new Response(stream);
};

export default fetch;
