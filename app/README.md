# AgentCase v19 — TypeScript + React build

Migration of the legacy single-file app (`../AgentCase_v18_*_EN.html`). Plan: [`../docs/MIGRATION_PLAN.md`](../docs/MIGRATION_PLAN.md).

```bash
npm install
npm run check     # tsc --noEmit + ESLint + Vitest
npm run build     # dist/index.html — one offline HTML file
npm run dev
node scripts/sizes.mjs   # largest source files (the 150-line rule)
```

## Layout (dependencies point down only — enforced by `eslint-plugin-boundaries`)

| Layer | Folder | Rule |
|---|---|---|
| ui | `src/ui` | React components; renders selectors, calls controllers; no business logic |
| controllers | `src/controllers` | the only place that dispatches commands |
| store | `src/store` | state, commands, history, persistence — no React |
| domain | `src/domain` | pure calculation engine and catalogues — no I/O, no DOM |

Hard rules, all CI errors: **no `.ts`/`.tsx` file over 150 lines**, `strict` TypeScript, no `any`, no `dangerouslySetInnerHTML`.
`fixtures/` holds the legacy oracle (see `fixtures/README.md`): the new engine must reproduce it.

## Undo / redo in one paragraph

State lives in one Immer document (`src/store`). The only write path is `dispatch(command)`, and commands are declared with
`defineCommand` inside `src/controllers`. Each dispatch yields patches and inverse patches, which become one history step
(bulk actions use `batch`, slider drags coalesce on a key). The UI cannot import the write path (ESLint
`no-restricted-imports`), so Ctrl+Z covers every business input by construction. Adding a command without a sample in
`tests/store/registry.test.ts` fails the build.
