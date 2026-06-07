# pkg-diff

Diff two npm package versions **entirely in the browser** — no server, no
backend. Tarballs are fetched straight from the npm registry, unpacked, and
diffed client-side, with the line-diffing done by a **Rust → WebAssembly**
module. The whole app is a static site you can drop on any host.

**[Try it live → pkg-diff.netlify.app](https://pkg-diff.netlify.app/)**

![pkg-diff screenshot](./screenshot.png)

## Develop

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build      # type-check + vite build → dist/ (deploy anywhere static)
pnpm preview    # serve dist/ locally
```

## Credits

Diff rendering is powered by [`@pierre/trees`](https://diffs.com) (file tree
sidebar) and [`@pierre/diffs`](https://diffs.com) (diff content pane).
