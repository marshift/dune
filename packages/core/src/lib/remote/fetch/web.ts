import { assertProtocol } from "../shared.js";

const fetch: typeof globalThis.fetch = (input, init) => {
	assertProtocol(input instanceof Request ? input.url : input);
	return globalThis.fetch(input, init);
};

export default fetch;
