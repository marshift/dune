const allowedProtocols = ["http:", "https:", "data:", "file:"];

function assertProtocol(url: string | URL) {
	if (typeof url === "string") url = new URL(url);
	if (!allowedProtocols.includes(url.protocol)) throw new Error(`Unsupported protocol ${url.protocol}`);
}

export const fetch: typeof globalThis.fetch = (input, init) => {
	assertProtocol(input instanceof Request ? input.url : input);
	return globalThis.fetch(input, init);
};

export function importModule(url: string) {
	assertProtocol(url);
	return import(url);
}
