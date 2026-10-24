# AgentCase — TypeScript + React build (`app/`)

The product (version `<!-- fact:version -->20.14.0<!-- /fact -->`, from `package.json`, the single version source; multi-product portfolio). The legacy single-file app `../AgentCase_v18_13_EN.html` is the frozen reference it is proven
against. Docs: [architecture](../docs/ARCHITECTURE.md) · [migration record](../docs/MIGRATION_PLAN.md) ·
[adding a section](../docs/SECTION_PORTING.md) · [releasing](../docs/BUMP_PROCEDURE.md).

```bash
npm ci
npm run dev       # Vite dev server
npm run check     # tsc --noEmit + ESLint + Vitest (what CI runs)
npm run build     # tsc --noEmit + vite build -> dist/index.html, one offline HTML file
npm run release   # build + dist/AgentCase_vX_Y_EN.html (name from the package.json version)
npm run docs:facts   # regenerate the facts (version, counts) quoted by the docs
npm test          # Vitest only
node scripts/sizes.mjs   # largest source files (the 150-line rule)
```

Node.js 22 (CI version).

## Layout (dependencies point down only, enforced by `eslint-plugin-boundaries`)

| Layer | Folder | Rule |
|---|---|---|
| ui | `src/ui` | React components; renders selectors, calls controllers; no business logic |
| controllers | `src/controllers` | the only place that declares and dispatches commands |
| store | `src/store` | Immer document, commands, history, persistence adapters; no React except the selector hooks |
| domain | `src/domain` | pure calculation engine and catalogues; no I/O, no DOM |

Also: `src/content` (prose as JSON), `src/main.tsx` (entry), `tests/` (Vitest), `fixtures/` (the oracle: generated from the legacy
file by `../tools/oracle.mjs`, never edited by hand; see `fixtures/README.md`), `scripts/`.

Hard rules, all CI errors: no `.ts` / `.tsx` file over 150 lines, `strict` TypeScript, no `any`, no `dangerouslySetInnerHTML`, the UI
cannot import the store's write path.

## Undo / redo in one paragraph

State lives in one Immer document (`src/store`). The only write path is `dispatch(command)`; commands are declared with
`defineCommand` inside `src/controllers` (202 are registered). Each dispatch yields patches and inverse patches that become one
history step (bulk actions use `batch`, slider drags coalesce on a key within 800 ms). The UI cannot import the write path (ESLint
`no-restricted-imports`), so Ctrl+Z covers every business input by construction. A command without a sample in
`tests/store/samples/` fails `tests/store/registry.test.ts`.
