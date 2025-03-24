import { createContext } from "npm:@marshift/argus";
import { Converter } from "./lib/converter.ts";
import { Parser } from "./lib/parser.ts";

const ctx = createContext(Deno.args);
const path = await Deno.realPath(ctx.consumePositionalArg(true));

const parser = await Parser.for(path);
const converter = new Converter(parser);

console.log(converter.output);
