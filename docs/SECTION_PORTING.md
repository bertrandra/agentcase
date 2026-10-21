# Porting a section to the TypeScript build

The recipe used for every section of Phase 5. Reference implementation: `app/src/ui/sections/scope/scope-sel/`
(+ `app/tests/ui/sections/scope-sel.test.tsx`).

## 1. Ground rules (CI enforces most of them)

- **≤150 lines per `.ts`/`.tsx` file**, tests included (ESLint `max-lines`). JSON/CSS data files are exempt (D1).
- Layers point down: `ui → controllers → store → domain`. The UI reads with `@/store/hooks` (`useDoc`, `useCtx`, `useCaseResult`)
  and writes only through `@/controllers/*`. No `useState` for business data, no `dangerouslySetInnerHTML`, no `any`.
- **Port behaviour, not bugs.** Calculation changes are not allowed during the port (decision D7). If the legacy section is
  wrong or stale, port the *intended* figures only when the legacy engine agrees with them (the oracle is the arbiter), and
  list the discrepancy in the PR description.
- Do not touch files owned by another area: your group file `ui/sections/<group>.ts`, your controllers
  `controllers/<area>.ts`, your sample file `tests/store/samples/<area>.ts`, your oracle recipes/extras
  `tools/oracle-recipes.d/<area>.mjs` / `tools/oracle-extras.d/<area>.mjs`, and new files under `ui/widgets/`, `domain/<area>/`.

## 2. Steps

1. **Read the legacy section**: markup `<div id="<id>" class="tab-content">` and its render function (`TABRENDER[...]` map,
   `grep -n "function render<Name>"`). Note every input it writes, every model value it reads.
2. **Dump what it shows**: `node tools/section-text.mjs --sections <id> --fixtures golden,ctx-msi,curve-logistic,industry-med`
   (already generated for all sections in `app/fixtures/sections/<fixture>/<id>.txt`).
3. **Domain first.** Move any calculation the section needs into pure functions in `app/src/domain/<area>/` (inputs: the `Ctx`
   from `makeCtx(doc)`). Prove them against the legacy: add extras (`tools/oracle-extras.d/<area>.mjs`,
   `export const EXTRAS = { name: "legacyExpression()" }`) and run `node tools/oracle.mjs` — outputs land in
   `app/fixtures/extras/<name>/<fixture>.json`; add a Vitest test comparing your function to them (see
   `tests/domain/oracle.test.ts` for the `diff` helper pattern). Use `tools/oracle-recipes.d/<area>.mjs` for extra fixture cases.
4. **Controllers.** Every user edit is a command: `defineCommand({ type, label, run(draft) {…}, coalesceKey? })` in
   `controllers/<area>.ts`, exposed as a plain function. Clamp/validate like the legacy handler. If the edit changes the scope or
   artefacts, call `refitPotential(draft)`. Add one sample per command in `tests/store/samples/<area>.ts`
   (the registry test then checks label + undo/redo round-trip).
5. **UI.** Folder `ui/sections/<group>/<id>/` with `index.tsx` (default export, composes `SectionFrame` zones: input / result /
   diagnostic / help) and panels. Reuse `ui/widgets` (`NumberInput`, `RangeInput`, `SelectInput`, `CheckInput`, `DataTable`,
   `ChartPanel`, `Stat`, `Callout`, `Panel`, `Badge`). Register `'<id>': () => import('./<group>/<id>')` in `ui/sections/<group>.ts`.
   Section prose ("What this section does") goes in the `help` prop, short.
6. **Tests** (`tests/ui/sections/<id>.test.tsx`, `// @vitest-environment jsdom`):
   - **parity**: `missingNumbers(legacySectionText('golden', '<id>'), renderedText(container))` is `[]` for the four fixtures
     (load a fixture with `fromSnapshot` + `setAppStore(createAppStore(doc))`). Document any deliberate omission in an
     `ignore` list with a comment.
   - **behaviour**: each input edits the document, the KPI/`computeCase` result follows, Ctrl+Z restores.
7. `cd app && npm run check` must pass (typecheck, lint, all tests), then `npm run build`.

## 3. Pitfalls found while building the reference

- Legacy `goTab()` renders the section 50 ms *after* activation: dump text only after waiting (the tool does).
- jsdom has no `innerText`/canvas: use `renderedText()`; `ChartPanel` tolerates the missing canvas.
- Parity compares numbers within display rounding (€892K vs 891 555): put figures in the DOM, not only in tooltips.
- The legacy default scope is 10 artefacts (3 phases), not all 53.
- `horizon` accepts 1, 2, 3, 5, 7, 10 only (an invalid option reads back as `''` which the engine maps to 3).
