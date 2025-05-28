import { createContext } from "@marshift/argus";
import process from "node:process";
import { commands, getNames } from "./commands/index.ts";
import { findNearestConfig, loadConfig } from "./lib/config.ts";

const ctx = createContext(process.argv.slice(2));

const commandName = ctx.consumePositionalArg(true);
const command = commands.find((c) => c.name === commandName);

const configPath = ctx.getOptionalArg(/--config|-c/);
const config = await (configPath ? loadConfig(configPath) : findNearestConfig(process.cwd()));

if (!command) {
	console.error(`Invalid command! Valid commands are: ${getNames()}`);
	process.exit(1);
}

await command.execute(config, ctx);
