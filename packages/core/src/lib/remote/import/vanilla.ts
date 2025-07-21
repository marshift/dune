import { assertProtocol } from "../shared.js";

function importModule(url: string) {
	assertProtocol(url);
	return import(url);
}

export default importModule;
