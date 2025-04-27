# dune
templating engine and static site generator using [KDL](//kdl.dev)

# development
dune is intended to run in every JS environment - including the web - but for convenience and due to personal preference, it uses `deno` as its package manager.
as such, lockfiles other than `deno.lock` are ignored by Git, and `deno.json` contains the TypeScript compiler and workspace configuration.
