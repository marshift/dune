import type { Command } from "./base.ts";
import { BuildCommand } from "./build.ts";
import { ServeCommand } from "./serve.ts";

export const commands: Array<Command> = [
	new BuildCommand(),
	new ServeCommand(),
];

export const getNames = () => commands.map((i) => i.name).join(", ");
