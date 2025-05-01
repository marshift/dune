import { createContext } from "@marshift/argus";
import process from "node:process";
import { commands, getNames } from "./commands/index.ts";

const ctx = createContext(process.argv.slice(2));

const commandName = ctx.consumePositionalArg(true);
const command = commands.find((c) => c.name === commandName);

if (!command) {
	console.error(`Invalid command! Valid commands are: ${getNames()}`);
	process.exit(1);
}

await command.execute(ctx).catch((e) => {
	console.log(`An error occurred while executing that command - report this!`, e);
	process.exit(1);
});
