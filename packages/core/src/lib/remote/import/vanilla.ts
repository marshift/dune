import { assertProtocol } from "../shared.ts";

function importModule(url: string) {
	assertProtocol(url);
	return import(url);
}

export default importModule;
