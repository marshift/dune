import { assertProtocol } from "../shared.js";

async function importModule(url: string) {
	assertProtocol(url);
	return await import(url);
}

export default importModule;
