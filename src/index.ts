import { createContext } from "npm:@marshift/argus";
import { HTMLAdapter } from "./lib/adapters/html.ts";
import { Parser } from "./lib/parser.ts";

const ctx = createContext(Deno.args);

const path = await Deno.realPath(ctx.consumePositionalArg(true));
const parser = await Parser.for(path, new HTMLAdapter());

console.log(parser.result);
