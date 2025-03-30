import { createContext } from "npm:@marshift/argus";
import { HTMLAdapter } from "./lib/adapters/html.ts";
import { Parser } from "./lib/parser.ts";

const ctx = createContext(Deno.args);

const path = ctx.consumePositionalArg(true);
const parser = await Parser.for(path);

console.log(parser.convert(new HTMLAdapter()));
