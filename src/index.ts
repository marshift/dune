import { createContext } from "@marshift/argus";
import process from "node:process";
import { HTMLAdapter } from "./lib/adapters/html.ts";
import { Parser } from "./lib/parser.ts";

const ctx = createContext(process.argv.slice(2));

const path = ctx.consumePositionalArg(true);
const parser = await Parser.for(new URL(path, `file:///${process.cwd()}/`));

console.log(parser.convert(new HTMLAdapter()));
