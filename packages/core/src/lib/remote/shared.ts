const allowedProtocols = ["http:", "https:", "data:", "file:"];

export function assertProtocol(url: string | URL) {
	url = new URL(url);
	if (!allowedProtocols.includes(url.protocol)) throw new Error(`Unsupported protocol \"${url.protocol}\"`);
}

export class BadStatusCodeError extends TypeError {
	constructor(code: number) {
		super(`Status code ${code} is not OK`);
	}
}
