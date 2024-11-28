import { createContext } from "npm:@marshift/argus";
import { DuneParser } from "./lib/parser.ts";

const ctx = createContext(Deno.args);
const path = await Deno.realPath(ctx.consumePositionalArg(true));

const content = new TextDecoder("utf-8").decode(await Deno.readFile(path));
const parser = new DuneParser(content);

console.log(parser.toHTML());
