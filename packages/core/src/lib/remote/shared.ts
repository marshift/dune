const allowedProtocols = ["http:", "https:", "data:", "file:"];

export function assertProtocol(url: string | URL) {
	if (typeof url === "string") url = new URL(url);
	if (!allowedProtocols.includes(url.protocol)) throw new Error(`Unsupported protocol ${url.protocol}`);
}
