# AgentCase — Architecture of the TypeScript build

> Applies to **`app/`, version 19.0.0** (`app/src/domain/version.ts`, `app/package.json`). 599 `.ts`/`.tsx` files under `app/src`,
> 137 test files under `app/tests` (counted with `find`; 12,346 tests passed on the last local run, CI is authoritative).
> The previous document, which describes the frozen single-file app, is archived as
> [`history/ARCHITECTURE_legacy_v18.md`](history/ARCHITECTURE_legacy_v18.md). The appendix of this file maps each legacy engine to its replacement.
> Plan and history: [MIGRATION_PLAN.md](MIGRATION_PLAN.md). Recipe for adding a section: [SECTION_PORTING.md](SECTION_PORTING.md).

## 1. Overview

AgentCase computes an agentic-transformation business case:

```
AS-IS team × rate card × SDLC/regulatory artefact scope
  → automation potential, glass ceiling, adoption ramp (S-curve)
  → TO-BE human FTE + agent vFTE
  → run cost, savings, NPV, payback
  → scenarios, Monte Carlo, strategy ranking, decision verdict
```

The build is React 18 + strict TypeScript (Vite 5, Vitest 2, Immer 10, Zustand 4, Chart.js 4.4.1, ExcelJS 4.4). `npm run build`
produces **one offline HTML file** (`app/dist/index.html`, about 2.6 MB; `vite-plugin-singlefile` inlines script and style). The whole
case is one JSON document (`Doc`); the UI renders selectors over it and changes it only through commands.

| Property | Mechanism |
|---|---|
| Same numbers as the legacy app | oracle fixtures, §8 |
| Every business edit is undoable | one write path, `dispatch(command)`, §4 |
| Layers cannot be bypassed | ESLint `boundaries` + `no-restricted-imports`, §2 |
| No file over 150 lines | ESLint `max-lines` + `tests/size.test.ts` |
| No raw HTML injection | ESLint ban on `dangerouslySetInnerHTML`, content rendered by React elements, §9 |

## 2. Layers and the rules enforced by ESLint

```
ui/            React: shell, zones, sections, widgets       reads with @/store/hooks, acts through @/controllers/*
controllers/   the only code that dispatches commands       defineCommand + plain functions
store/         Immer document, history, persistence         no React except hooks.ts/simulation.ts (selectors)
domain/        pure calculation engine and catalogues       no I/O, no DOM, no store
```

Config: `app/eslint.config.js`. Path alias `@` → `app/src`.

| Rule | Where | Effect |
|---|---|---|
| `boundaries/element-types` | all of `src` and `tests` | `domain` → domain; `store` → store, domain; `controllers` → controllers, store, domain; `ui` → ui, controllers, store, domain; `src/main.tsx` (entry) → all. Anything else is an error |
| `no-restricted-imports` | `src/ui/**` | UI cannot import `@/store/core`, `commands`, `instance`, `derive` or `persistence/*`: it cannot reach `dispatch` or the store instance |
| `max-lines` 150 | `src` and `tests`, blank lines and comments counted | error; `tests/size.test.ts` repeats the check (JSON/CSS data are exempt, decision D1) |
| `no-restricted-syntax` | all | `dangerouslySetInnerHTML` is an error |
| `@typescript-eslint/no-explicit-any` | all | error |
| `consistent-type-imports`, `react-hooks/*` | all | error / recommended |

`tests/lint-rules.test.ts` runs ESLint on synthetic files and asserts that each rule fires (UI importing the write path, domain
importing the store, a 151-line file, raw HTML). TypeScript is `strict` (`app/tsconfig.json`).

Where the layers live:

| Layer | Folders |
|---|---|
| `src/domain` | `types`, `catalog` (artefacts, regulatory catalogue), `model` (glass ceiling, `modelRaw`, overlay, LCE/EVT/supervision/verification tax), `time` (Time Engine), `economics`, `scope`, `baseline`, `frame`, `stress` (scenarios, sensitivity, Monte Carlo, RNG), `tune`/`tuneB`, `verdict`, `verifyA`/`verifyB`, `factory`, `refshare`, `pdc` (present/defend/configure, verification checks and convergence rows, Board variables), `nav` (sidebar, group bar, sequences), `snapshots`, plus `engagement`, `knowledge`, `lifecycle`, `location`, `tokens`, `canonical` |
| `src/store` | `core.ts` (store), `commands.ts`, `history.ts`, `types.ts`, `derive.ts` (re-fit helpers), `hooks.ts` (React selectors), `simulation.ts` (Monte Carlo run, outside the document), `instance.ts` (singleton + default case), `defaults/defaultDoc.json`, `persistence/` |
| `src/controllers` | 41 modules, one per area (`inputs`, `artefacts`, `scope`, `team`, `lifecycle`, `history`, `files`, `openFile`, `boot`, `sessions`, `snapshots`, `report`, `excel*`, `htmlSnapshot`, `nav*`, `pdc*`, `model*`, `tune*`, `verify*`, `stress`, `factory*`, `refshare`, ...) |
| `src/ui` | `App.tsx`, `shell/`, `zones/`, `sections/` (14 group files + one folder per section), `widgets/`, `theme/`, `uiState.ts`, `format.ts` |
| `src/content` | `refshare/*.json`: help and reference prose rendered by the `Rich` widget |

## 3. Domain: the calculation engine

All of it is pure TypeScript over a `Ctx` built from the document (`makeCtx(doc)`, `src/domain/ctx.ts`). It runs in Node, so every
financial figure is testable without a browser.

- **Inputs seam.** The legacy `readInputs()` → `P()/V()/C()` seam is the specification of the inputs. Form values live in
  `doc.dom.values` / `doc.dom.checked` (strings and booleans, exactly as the legacy snapshot stores them); `src/domain/inputs.ts`
  parses them to numbers at the edge. The legacy DOM element ids remain the parameter namespace of the document.
- **Entry point.** `computeCase(state)` (`src/domain/index.ts`) returns `{ model, headline, payback, npv, phaseScope, glassCeiling }`.
  `useCaseResult()` memoises it per document identity.
- **Model.** `modelRaw(ctx)` is the flat annual computation (team cost, automation potential, glass ceiling, engagement and knowledge
  hub coefficients, ramps, setup, tokens, infrastructure, run team, verification tax, loops). `model(ctx)` (`model/overlay.ts`)
  calls `modelRaw` and, unless the active curve is the legacy flat one, overwrites the annual arrays with the Time Engine's year rows.
  Effective automation applies the human share once: `min(100 − ceiling, potential × posture × context × hub)` (legacy v18.11).
- **Time Engine** (`src/domain/time/`, replaces legacy `TIME`). Four layers as in the legacy: curve adapters (`adapters.ts`, `spline.ts`:
  spline / logistic / Gompertz / Bass / legacy flat), derivation kernel (`kernel.ts`, built from the raw model by `buildK`), path
  accumulator (`engine.ts`: cumulative, payback), aggregation (`years.ts`, `rows.ts`), plus `thin.ts` (row-free aggregate for Monte
  Carlo draws) and `fit.ts`. `canonical.ts` exposes `engineNow`, `paybackMonthsCanonical` and `npvCanonical` (discount rate from
  `MODEL.CASE.discountRate`, default 8 %): the single source for payback and NPV. The engine is always built from the raw model.
- **Horizon.** `horizonYears()` (`model/horizonYears.ts`) returns one savings and one run-cost entry per horizon year; Monte Carlo,
  strategies and Results use it, so horizons 1 to 10 work (legacy v18.12/v18.13 fixes).
- **Stress** (`stress/`): scenarios, sensitivity, seeded Monte Carlo (`rng.ts`, `simulate.ts`), strategies, `fingerprint.ts` (a hash of
  the model inputs only, to decide whether a stored distribution is stale).
- **Verification** (`pdc/verifChecks.ts` and `verifConv*.ts`): the 16 automatic checks and the 67 convergence rows of the Logic
  verification section, as pure functions over a `Ctx`.

Scope re-fit: with *Fit to selected scope* on, the potential follows the scope's effort-weighted automatable share. `store/derive.ts`
`refitPotential(draft)` is called by every command that changes the scope (SDLC artefact selection, industry, norms, cross-cutting,
regulatory catalogue, import).

## 4. Store: Immer patches, commands, history

`src/store/core.ts` creates one store (`zustand/vanilla`) holding `{ doc, history, audit, rev }`.

```
dispatch(command) ──► produceWithPatches(doc, run) ──► patches + inverse patches
                           └─► history.pushEntry (coalescing, cap) ──► audit log ──► listeners (autosave, broadcast)
```

| Concept | Implementation |
|---|---|
| Command | `{ type, payload, label, coalesceKey?, undoable, run(draft, payload) }`. Declared with `defineCommand` (`store/commands.ts`) inside `src/controllers`, exposed as plain functions. 202 commands are registered by the modules of `src/controllers` (201 undoable; counted from `COMMAND_REGISTRY` after loading them); a duplicate type throws |
| Registry | `COMMAND_REGISTRY` (type, undoable). `tests/store/registry.test.ts` fails if a command has no sample in `tests/store/samples/`, no label, or does not round-trip through undo/redo (view commands with `undoable: false` must leave the stack empty) |
| History | `undo` / `redo` stacks of `{ label, type, ts, coalesceKey, patches, inverse }`. Cap `HISTORY_CAP = 200`. A new step clears redo |
| Coalescing | consecutive entries with the same `coalesceKey` inside `COALESCE_MS = 800` merge into one step (slider drags, typing in a number field) |
| Transactions | `batch(label, commands, coalesceKey?)` is one step: bulk edits, imports, applying a strategy |
| Jump | `jumpTo(index)` (History panel) undoes or redoes until `index` steps remain |
| Open a case | `load(doc, keepHistory)`: by default a fresh history (`controllers/openFile.ts` decides); `keepHistory` makes it one undoable step |
| Remote patches | `applyRemote(patches)` applies a patch from another tab, logs it, never pushes it on this tab's undo stack |
| Audit log | ring of the last 500 records `{ ts, type, label, kind: do/undo/redo/remote/load }` kept in the store |
| Derived data | never in the document or the history: `useCaseResult`, `useCtx` (WeakMap memo on document identity); the Monte Carlo run lives in `simStore` (`store/simulation.ts`) with a fingerprint, so a verdict is marked stale when the case moves |
| UI state | `ui/uiState.ts`, a separate store: current section, persona-menu mode, wizard, toasts. Not undoable (decision D4) |

Consequences of the layering: the UI cannot import `dispatch`, so Ctrl/Cmd+Z (handled in `ui/shell/useShortcuts.ts`; text fields keep
their native undo) covers every business input by construction. `tests/store/undo-property.test.ts` (fast-check) checks random
command sequences against `undo∘apply = id` and symmetric redo.

## 5. Persistence

All adapters live in `src/store/persistence/` and `src/controllers/` (file and boot wiring). The document keeps the **legacy snapshot
state** (the same registry keys), so old files load.

| Adapter | Files | Behaviour |
|---|---|---|
| Snapshot JSON | `snapshot.ts` | `toSnapshot` adds `savedAt` and `_schema: 'agentcase.snapshot.v1'`; `fromSnapshot` deep-copies through `sanitize` (drops `__proto__`, `constructor`, `prototype`), requires the form inputs (`dom`), and fills missing keys from the code defaults so new defaults reach old files |
| Autosave | `autosave.ts`, `idb.ts` | debounced (1.5 s default) record per tab `{ tabId, savedAt, label, snapshot, history }` in IndexedDB `agentcase-v19` (store `autosave`), so Ctrl+Z survives a reload (decision D5). `memoryStorage()` for tests. `restoreRecord` puts the history back |
| Boot | `controllers/boot.ts`, `src/main.tsx` | opens an embedded case before the first paint, then offers the newest autosave of another tab that is **newer than the file's own `savedAt`** (never auto-restores) |
| Multi-tab | `broadcast.ts` | `BroadcastChannel('agentcase-v19')`: local changes are posted as patches (the inverse for an undo); a message from another tab is applied with `applyRemote` |
| HTML snapshot | `html/embed.ts`, `read.ts`, `legacy.ts` | the running page is cloned, `#root` emptied, transient nodes dropped, the case embedded in `<script type="application/json" id="agentcase-snapshot">` with `<` and the JS line separators escaped; re-saving replaces the script. Opening accepts this build's files, legacy v18.x snapshots (the object after `try{ applySnapshotState(` is located by a balanced-brace scan and `JSON.parse`d, nothing is evaluated; any other shape is rejected) and plain JSON. File name `AgentCase_<customer>_<vTag>_Snapshot_<stamp>.html` |
| Re-fit on open | `controllers/openFile.ts#refitOnOpen` | like the legacy `applySnapshotState`, a restore re-runs the scope fit; used for file open, the embedded case and snapshot activation (not in `fromSnapshot`) |
| Parameters workbook | `excel/params/` | export and hardened import, one undoable batch; sheet families in `registry.ts` (47 sheets per the migration log). ExcelJS is loaded by dynamic `import()` (`excel/lazy.ts`) |
| Results workbook, due-diligence pack | `excel/results/`, `excel/dd/` | export (and DD import); cell-by-cell equal to the legacy on fixtures |
| Report | `report/` | "Critical & Regulated Software Delivery" HTML report; its visible text equals the legacy report on 11 fixtures |
| Snapshot manager | `controllers/snapshots.ts`, `domain/snapshots/` | named snapshots in the document (capture, activate as one undo step, rename, delete, baseline, protected golden entries, compare) |

There is no schema-migration table: legacy files are accepted as they are (missing keys take defaults), and the only version tag is
`_schema`. The legacy calculation package (`inputHash`, staleness banner) is not recomputed: figures are always recomputed from the inputs.

## 6. UI: the zone shell and navigation from the document

`ui/shell/Shell.tsx` lays out CSS grid areas **top / kpi / nav / work / dock**:

| Zone | File | Content |
|---|---|---|
| Top | `TopZone.tsx` | brand and version, customer, persona switch, undo/redo (step label as tooltip), save/open |
| Kpi | `KpiZone.tsx` | sticky headline from the live case (savings and run cost of the last horizon year, NPV, payback, effective automation, glass ceiling) |
| Nav | `NavZone.tsx`, `GroupNavBar.tsx` | groups → sections, persona-filtered; sidebar collapses in hide-menu mode and during a guided walk |
| Work | `zones/SectionHost.tsx` | the active section (lazy), `WizardBar` for the guided sequence |
| Dock | `DockZone.tsx` | History panel (click a step to jump) |

Also `RestoreBanner` (autosave offer), a skip link, and an `aria-live="polite"` region that announces "Undone: ..." toasts.

**Navigation comes from the document**, not from code tables: `ui/zones/navModel.ts` builds the sidebar from `doc.PERSONAS`,
`PERSONA_SECTIONS`, `PERSONA_SECTION_ORDER`, `GROUPS`, `sectionGroups`, `dynamicSections` and the guided sequences, falling back to the
bundled legacy catalogue (`ui/zones/data/*.json`: 79 sections in 14 groups). Domain logic is in `domain/nav/` (`layout`, `groupBar`,
`moves`, `sequence`); edits go through `controllers/nav*.ts` and the Persona-management section (sequence editor, menu layout board,
persona layout board). The same data round-trips through the parameters workbook.

**Sections.** One folder per section under `ui/sections/<group>/<id>/` with a default-exported `index.tsx` that composes
`SectionFrame` (`input` / `result` / `diagnostic` zones and a `help` note). `ui/sections/<group>.ts` maps section id → lazy loader;
`ui/sections/index.ts` merges the 14 group maps into `SECTION_COMPONENTS`.

| Group | Sections | Group | Sections |
|---|---|---|---|
| frame | 4 | verify | 16 |
| baseline | 3 | present | 3 |
| scope | 5 | defend | 3 |
| tune | 12 | configure | 2 |
| economics | 4 | factory | 4 |
| stress | 4 | refshare | 10 |
| verdict | 3 | model-engine | 6 |

Total **79** (`ui/zones/data/sectionCatalog.json`, counted per group with `node`); 79 loaders are registered in the group files. A
section id with no loader renders `Placeholder`; dynamic sections created by the user render through `DynamicSection` (Board).
Shared widgets in `ui/widgets/`: `fields`, `CommitField`, `CommitNumber`, `DataTable`, `ChartPanel`, `Rich`, `Tabs`, `cards`, ...
Business data is never held in `useState`.

## 7. Content

Long prose (help, glossary, architecture and data-model reference) is JSON under `src/content/refshare/` and `src/ui/zones/data/`.
The `Rich` widget renders a content tree `string | [tag, attrs?, ...children]` with React elements only, from a fixed tag list and
validated colour attributes.

## 8. Oracle, fixtures and parity: how "same numbers" is proven

| Piece | What | Where |
|---|---|---|
| Oracle | `tools/oracle.mjs` loads the **legacy** file in Playwright, applies each recipe (`tools/oracle-recipes.mjs`, `oracle-recipes.d/<area>.mjs`), records the full snapshot state and what the legacy engine computes from it | `app/fixtures/cases/<id>.json` (input), `expected/<id>.json` (contract): **107 cases** |
| Extras | named legacy expressions per fixture (`tools/oracle-extras.d/<area>.mjs`, `export const EXTRAS = { name: "legacyExpr()" }`) | `app/fixtures/extras/<name>/<fixture>.json`: 97 extras |
| Engine test | `computeCase` equals `expected` within 1e-6 relative (golden figures exact), on every case | `tests/domain/oracle.test.ts`; helper `tests/helpers/oracleDiff.ts`; mutation-checked when written |
| Controller tests | replaying edits through controllers reproduces fixtures; all legacy snapshots load and recompute the oracle figures | `tests/store/controllers.test.ts`, `legacy-snapshots.test.ts` |
| Persistence fixtures | legacy HTML snapshots (`tools/snapshot-fixtures.mjs` → `fixtures/snapshots/`), workbooks (`excel-fixtures.mjs`, `excel-oracle.mjs`, `excel-results-oracle.mjs` → `fixtures/xlsx`, `xlsx-results`), reports (`report-fixtures.mjs` → `fixtures/reports/`) | `tests/store/*` |
| Parity | `tools/section-text.mjs` dumps the visible text of legacy sections for four fixtures plus model-engine ones (`fixtures/sections/`); `missingNumbers(legacyText, renderedText)` must be empty: every figure the legacy section shows must appear in the migrated one (within display rounding) | `tests/helpers/parity.ts`, `tests/ui/sections/*.test.tsx` |

Rule (decision D7): no calculation change in the port. A deliberate change ships in the legacy file first, the oracle is regenerated
(procedure in [BUMP_PROCEDURE.md](BUMP_PROCEDURE.md) §7), then the TypeScript engine follows. Fixture files are generated, never edited by hand.

## 9. Security properties

| Property | How it is enforced |
|---|---|
| No raw HTML | `dangerouslySetInnerHTML` is a lint error; `grep` finds no `innerHTML`, `eval` or `new Function` in `app/src`. React escapes text and attributes; `Rich` accepts only whitelisted tags/attributes; colours must match `#hex` |
| Hostile snapshots | `sanitize` drops prototype-pollution keys at every depth; the legacy HTML restore script is parsed as JSON, never executed; unknown shapes are rejected |
| Embedded case | `<` and U+2028/2029 escaped in the embedded JSON, so `</script>` or `<!--` in a customer name cannot break out |
| Hardened workbook import | `excel/params/safe.ts`: limits (file 8 MB, unzipped 64 MB, 400 entries, compression ratio 200, 20,000 rows, 64 columns, 5,000 chars of text), `safeId`, `cleanText`, `okKey`; a file that fails leaves the case untouched |
| No network | the build has no runtime fetch; fonts and libraries are inlined |

## 10. Performance notes

- Derived values are computed once per document identity (WeakMap memo) instead of per render; the Monte Carlo run is separate and marked stale by a fingerprint of the model inputs, so a re-render never re-runs it.
- Patch-based history stores only changed paths (cap 200 steps, plus the autosave record).
- Sections and ExcelJS are loaded with dynamic `import()`; the single-file build still inlines everything (the build log lists one JS and one CSS file), so this changes evaluation order, not download size.
- Size: `dist/index.html` 2.58 MB (about 770 kB gzip) at the last local build, below the plan's 5 MB budget. No first-paint or frame-rate budget is measured in CI.

## 11. Known gaps

The authoritative list is [MIGRATION_PLAN.md §15](MIGRATION_PLAN.md). Architecture-relevant items:

- Browser checks exist (`npm run e2e`, `npm run perf`, `npm run parallel-run`; CI job `e2e`); the differential run on real customer files needs files supplied by the user.
- Out of scope (removed from the spec): the ADVANCED lock and its unlock gestures, and tag/MVP editing. Being ported: collapsible sidebar groups, Fast Path filter, layout-board live preview, calculation package and staleness banner, Gantt keyboard editing.
- Golden-vs-AME comparison, AME reference capture and per-snapshot Excel export are not ported; Agent Catalog capacity and loop external % cannot be imported (catalogues are immutable).
- `npm run release` produces `app/dist/AgentCase_v19_0_EN.html`; `APP_VERSION` is `19.0.0`.
- Legacy-only engine `TE-10b` (legacy-mode monthly derivation) fires on 2 supervision fixtures in the legacy and is reproduced only in the verification section.

## Appendix A — Legacy engine → replacement

What stays true of the legacy file (see the archived document for detail): it is one global-scope script (about 1,140 functions, DOM
elements as the input store, `innerHTML` templates), exposed to QA as `window.AgentCaseArch`. Its engines and where each went:

| Legacy | Role in the legacy | Replacement in `app/` | Difference |
|---|---|---|---|
| `readInputs()`, `P()/V()/C()`, `INPUTS` | DOM → inputs seam | `doc.dom.values/checked` + `domain/inputs.ts`, `makeCtx` | the DOM no longer holds state; ids kept as keys |
| `STATE_REGISTRY` (84 keys) | declarative persistence schema | the `Doc` (legacy snapshot keys, unknown keys carried through) + `snapshot.ts` | one immutable tree; no per-key setters |
| `APP_STATE` + `syncState()` | JSON facade, change notification | `dispatch(command)` / `batch` | every write is a named, reversible command |
| `BUS` | pub/sub (`state:changed`, ...) | `store.onChange` listeners (autosave, broadcast) + React subscriptions | no global event names |
| `PM` | serialize/hydrate, one no-op migration | `toSnapshot` / `fromSnapshot` | legacy files accepted by default-filling; no migration table |
| `DEP` | dirty-node dependency graph, `refreshAll()` | memoised selectors (`useCaseResult`, `useCtx`) | React re-renders from selectors; no runtime graph |
| `AUDIT` | ring buffer of changes + 42 invariant checks | store audit ring (500) + pure checks in `domain/pdc/verif*.ts` (16 checks, 67 convergence rows) | the log records commands; check results are shown in Logic verification |
| `TIME` | Time Engine L0–L3, canonical payback/NPV, calculation package | `domain/time/`, `domain/canonical.ts` | no calculation package or staleness banner |
| `AUTOSAVE` (IndexedDB) | per-tab sessions | `persistence/autosave.ts`, `idb.ts` | stores the undo history too |
| `saveHtmlSnapshot` | clones the rendered DOM, bakes `applySnapshotState(...)` | `html/embed.ts` | embeds JSON; `#root` emptied, no DOM state serialised |
| `exportParams/importParams` | Excel | `excel/params/` | typed, size-limited, one undoable batch |
| `escHtml`/`escJs`/`safeId`/`cleanText` | output escaping helpers | React escaping; `safeId`/`cleanText` kept for workbook import | no string-built HTML |
| `window.AgentCaseArch` | QA surface | none; tests import modules directly | |
