import type { Command } from "./base";
import { BuildCommand } from "./build";
import { ServeCommand } from "./serve";

export const commands: Array<Command> = [
	new BuildCommand(),
	new ServeCommand(),
];

export const getNames = () => commands.map((i) => i.name).join(", ");
