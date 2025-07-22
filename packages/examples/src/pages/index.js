import { readdir } from "node:fs/promises";
import { basename } from "node:path";

const ext = ".kdl";
const examples = await readdir("./src/pages").then((files) =>
	files
		.filter((f) => f.endsWith(ext))
		.map((f) => basename(f, ext))
);

export default {
	examples,
};
