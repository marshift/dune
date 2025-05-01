import type { Command } from "./base.ts";
import { BuildCommand } from "./build.ts";
import { BuildAllCommand } from "./buildAll.ts";

export const commands: Array<Command> = [
	new BuildCommand(),
	new BuildAllCommand(),
];

export const getNames = () => commands.map((i) => i.name).join(", ");
