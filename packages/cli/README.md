# `@dunejs/cli`
dune's cli tool - allowing for easy static site generation and server-side rendering

intended to run on node, but should work flawlessly on deno and bun, too.

## installation
```sh
pnpm i @dunejs/core @dunejs/cli # Use your preferred package manager!
```
<sub>this package peer-depends on `@dunejs/core`. make sure you install a compatible version!</sub>

## configuration
this tool provides sane defaults, so it should hopefully be plug-and-play.

should you want to change it, it loads the config file from, in order: `dune.config.js`, `dune.config.mjs`.
refer to [`config.ts`](/packages/cli/src/lib/config.ts) for configuration options.

## usage
* `dune build` - build the current site into static `.html` files
* `dune serve` - host the current site in SSR mode
	- also supports `--dev` (`-d`), which enables hot-reload
