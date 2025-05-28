import type { Command } from "./base.ts";
import { BuildCommand } from "./build.ts";

export const commands: Array<Command> = [
	new BuildCommand(),
];

export const getNames = () => commands.map((i) => i.name).join(", ");
