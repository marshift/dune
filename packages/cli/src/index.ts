import { HTMLAdapter, Parser } from "@dunejs/core";
import { createContext } from "@marshift/argus";
import process from "node:process";

const ctx = createContext(process.argv.slice(2));

const path = ctx.consumePositionalArg(true);
const parser = await Parser.for(new URL(path, `file:///${process.cwd()}/`));

console.log(parser.convert(new HTMLAdapter()));
