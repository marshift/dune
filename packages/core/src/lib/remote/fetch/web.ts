import { assertProtocol, BadStatusCodeError } from "../shared.js";

const fetch: typeof globalThis.fetch = async (input, init) => {
	assertProtocol(input instanceof Request ? input.url : input);

	const res = await globalThis.fetch(input, init);
	if (!res.ok) throw new BadStatusCodeError(res.status);

	return res;
};

export default fetch;
