# `@dunejs/core`
the heart of dune - the parser (and it's components), and built-in format adapters.

intended to run in every modern JS environment - including the web. currently, only ESM builds are emitted.

## installation
```sh
pnpm i @dunejs/core # Use your preferred package manager!
```

## usage
### parsing a document from a string
```js
import { Parser, HTMLAdapter } from "@dunejs/core";

const doc = `page {
	body {
		p "hello world"
	}
}`

const parser = new Parser(doc);
const content = parser.convert(new HTMLAdapter());
console.log(content); // "<!DOCTYPE html><html><body><p>hello world</p></body></html>"
```

### parsing a document from a file
```js
import { Parser, HTMLAdapter } from "@dunejs/core";

const parser = await Parser.for(new URL("https://example.com/page.kdl"));
const content = parser.convert(new HTMLAdapter());
```

### writing a custom adapter
```js
import { Adapter, Parser } from "@dunejs/core";

// I'm really not sure why you'd need this. It's an example!
// Theoretically, you could write an adapter for just about anything.
class ReverseAdapter extends Adapter {
	override process = (ast: DuneNode[]) => JSON.stringify(ast.toReversed());
}

const parser = await Parser.for(new URL("https://example.com/page.kdl"));
const content = parser.convert(new ReverseAdapter());
```
