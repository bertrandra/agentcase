# AgentCase — Migration plan: TypeScript + React, screen zones, full undo/redo

> Status: **approved — D1 to D9 accepted as recommended; Phases 0–5 in progress** (written against v18.11). Progress is tracked in §14.
> Sources of fact: [ARCHITECTURE.md](ARCHITECTURE.md), [CODE_REVIEW.md](CODE_REVIEW.md), `tools/`.

## 1. Goals and hard constraints

| # | Requirement | How it is made checkable |
|---|---|---|
| G1 | Everything in **TypeScript (strict) + React** | `tsc --noEmit` with `strict`, `noUncheckedIndexedAccess`; no `any` outside `legacy/` |
| G2 | **No code file over 150 lines** | ESLint `max-lines` (150, blank lines and comments counted) as a CI error — see §7 |
| G3 | The UI is organised in **screen zones** (shell → zones → panels) | folder layout + a zone registry (§5) |
| G4 | **Ctrl+Z / Ctrl+Y with total control of the controllers** | every state change is a *command* dispatched through one pipeline (§6); a lint rule bans any other write path |
| G5 | Same numbers as today | golden-master and differential tests (§8) — the golden case, then 30+ fixture cases |
| G6 | Still deliverable as **one offline HTML file** | Vite + `vite-plugin-singlefile`; Chart.js and ExcelJS bundled, ExcelJS lazy-loaded |

Non-goals: new features during the migration (feature freeze on the legacy file except security and
blocking bugs, which are ported by hand), a server, a change of the Excel/snapshot formats.

## 2. What we are migrating (measured on v18.11)

- One 25.5k-line HTML file. Chart.js 4.4.1 and ExcelJS 4.4.0 are inlined, the rest is the application.
- **78 sections** (`tab-content`) in **12 navigation groups**: frame 4 · baseline 3 · scope 5 · tune 12 · economics 4 ·
  stress 4 · verdict 3 · verify 16 · present 3 · defend 3 · factory 4 · refshare 10 · configure 2.
- **1,118 top-level functions in the global scope**, ~300 `innerHTML` render sites (the XSS surface of the review).
- Engines: `BUS`, `APP_STATE` + `STATE_REGISTRY` (84 keys), `PM` (persistence), `DEP` (dependency graph), `AUDIT`, `TIME` (Time Engine).
- The calculation core already reads inputs through one seam (`readInputs()` → `P()`/`V()`/`C()`), which is what makes an
  engine extraction feasible. Today the DOM *is* the input store, and that is the main thing to undo.
- ~34 Chart.js charts, 4 persistence channels (HTML snapshot, Excel, IndexedDB autosave, BroadcastChannel), personas that filter sections.
- Existing safety net to reuse: `tools/` (smoke with golden figures, 38+ regression tests, XSS fuzz, handler-target check, render-diff).

Size estimate at ≤150 lines per file: **roughly 300–450 files, 35–50k lines of TS/TSX** (more lines than today because of types,
tests and the 150-line splitting; a large share of today's lines is help text that becomes content files).

## 3. Target architecture

Three layers, dependencies pointing down only (enforced with `eslint-plugin-boundaries`):

```
ui/ (React: shell, zones, panels, widgets)        ← knows hooks, never the engine internals
   │  useSelector(…)           dispatch(command)
controllers/ (command factories + handlers)       ← the ONLY place that changes state
   │
store/ (state, history, persistence, audit)       ← pure, no React
   │
domain/ (calculation engine, catalogues, types)   ← pure functions, no I/O, no DOM
```

- **`domain/`** — pure TS: `Inputs` type (what `P()/V()/C()` read today), `model(inputs)`, glass ceiling, scope, Time Engine,
  scenarios, Monte Carlo, strategies, ROI/payback helpers. `model()` becomes `(state) => Result`, memoised by selector.
  It runs in Node, so the whole financial logic is testable without a browser.
- **`store/`** — one immutable state tree typed by `AppState`, split into slices that mirror the 84 `STATE_REGISTRY` keys
  (`team`, `rates`, `scope`, `automation`, `curve`, `lifecycle`, `engagement`, `tokens`, `scenarios`, `ui`, …). Immer for
  updates, Zustand (or a 60-line custom store) for subscription. Derived values are **never stored**, only selected.
- **`controllers/`** — one file per user intention group (≤150 lines): `scopeController`, `artefactController`, `teamController`,
  `curveController`, `importController`, … Each exports command factories (see §6).
- **`ui/`** — React components only render selectors and call controllers. No business logic in components.

Legacy engine mapping:

| Legacy | Becomes |
|---|---|
| `BUS` | store subscriptions + a typed event emitter for cross-cutting notifications |
| `APP_STATE` / `STATE_REGISTRY` | store slices + their `serialize/hydrate` pair (kept 1:1 so old snapshots still load) |
| `PM` (persistence manager) | `store/persistence/` adapters: HTML snapshot, Excel, IndexedDB, BroadcastChannel |
| `DEP` (dependency graph) | memoised selectors (`reselect`-style); dependencies are explicit in code instead of a runtime graph |
| `AUDIT` | a command middleware (log of every command, before/after) and the existing consistency checks as pure functions |
| `TIME` | `domain/time/` |
| `refreshAll()` | disappears: React re-renders from selectors |

## 4. Tooling

- Vite + React 18 + TypeScript strict; Vitest (unit, node) + React Testing Library; Playwright for end-to-end and differential tests.
- Build output: a single `dist/AgentCase_vX_Y_EN.html` (singlefile plugin) so delivery and the "Save HTML snapshot" feature keep working.
- ESLint: `max-lines: 150`, `max-lines-per-function: 40` (advisory), `no-restricted-imports` for layer rules, a custom rule
  "state writes only in `store/`" (§6.5). Prettier. CI runs lint, typecheck, unit, golden-master, e2e.
- Icons/emoji labels, the Ubuntu font and the theme tokens move to `ui/theme/`.

## 5. Screen zones

A **zone** is a named rectangle of the screen with one responsibility. Sections (today's `tab-content`) are composed from zones;
zones are composed from panels (≤150 lines each).

```
┌──────────────────────────── TopZone ───────────────────────────────┐
│ brand · customer · persona switch · undo/redo · history · save     │
├──────── NavZone ────────┬──────────────── WorkZone ────────────────┤
│ groups → sections       │  SectionHeader (title, ? help)           │
│ (persona-filtered)      │  InputZone      – what you edit          │
│                         │  ResultZone     – charts, tables, KPIs   │
│                         │  DiagnosticZone – checks, warnings       │
├──────────────────────── KpiZone (sticky) ──────────────────────────┤
│ Y3 savings · NPV · payback · effective automation · verdict        │
└──────────────────── DockZone: history · audit · autosave ──────────┘
```

- `shell/` owns TopZone, NavZone, KpiZone, DockZone (≈25 files).
- Each section is a folder `sections/<id>/` with an `index.tsx` that only declares which zones/panels it uses, plus `InputZone`,
  `ResultZone`, `DiagnosticZone` panels. A **zone registry** (typed) lists sections, their group, persona visibility and zones; the
  navigation, persona filtering and guided sequences are generated from it (they are separate hand-maintained tables today).
- Section help (the long "What this section does" text) moves to `content/<id>.md` rendered by one `HelpPanel`, so prose never counts
  against code files.
- Example already built in v18.11: the Scope "impact by phase" section and the Adjust table's live strip become `ResultZone`
  panels of `sections/scope-sel/`.

## 6. Undo / redo with total control of the controllers

### 6.1 Principle

> The state changes **only** by dispatching a command. A command is a typed, named, reversible unit of intent.

### 6.2 Command shape

```ts
interface Command<P = unknown> {
  type: string;                 // 'artefact.setAgentSup'
  label: (p: P) => string;      // shown in the history panel: "Set Source code to 100 % auto"
  payload: P;
  coalesceKey?: string;         // merge consecutive edits: 'artefact.setAgentSup:A017'
  undoable?: boolean;           // default true; false for navigation, persona, view toggles
  run: (draft: Draft<AppState>, p: P) => void;   // mutation on an Immer draft
}
```

Immer's patches give the **inverse patches for free**, so no command writes its own `undo()` — that is what makes the history
reliable for ~65 handlers.

### 6.3 Pipeline

`dispatch(cmd)` → validation (schema / range clamp, as `setAgentSup` does today) → *before* middleware (audit, permissions, persona
rules) → `produceWithPatches` → push `{patches, inversePatches, label, ts}` on the history → *after* middleware (autosave, broadcast,
audit) → subscribers re-render. One entry point means one place to log, to throttle and to forbid.

### 6.4 History semantics (decisions in §10)

- **Undo stack / redo stack** of patch pairs; a new command clears redo; capacity 200 steps (configurable).
- **Coalescing:** consecutive commands with the same `coalesceKey` within 800 ms become one step (sliders, typing in a number field).
- **Transactions:** `batch(label, [cmd…])` is one step. Bulk edits (set a whole phase to 100 %, apply a strategy, import an Excel file,
  switch industry profile, reset) are single steps.
- **Derived data is never in the history** (it is recomputed), and **UI state lives in a separate store** that is not undoable
  (current section, scroll, expanded panels, filters).
- **Excluded from undo by default:** persona, navigation, language of the shell; **included:** every business input, scope selection,
  curve points, scenarios, lifecycle, tokens, rate card, team, dependency edits.
- **Session boundaries:** history is per tab and is kept in the autosave record (so Ctrl+Z survives a reload); loading a snapshot or
  an Excel file is an undoable step *from the previous state*, and "Open a case" can start a new history (user choice).
- **Multi-tab:** another tab's change arrives as a *remote* patch that is applied but not put on this tab's stack.
- **UI:** Ctrl/Cmd+Z, Ctrl+Shift+Z / Ctrl+Y, undo/redo buttons with the step label as tooltip, a History panel in the DockZone (click a
  step to jump), a toast "Undone: …". Shortcuts are ignored while a text field has its own native undo focus (and routed to ours
  when the field is committed).

### 6.5 "Total control of the controllers"

1. Controllers are plain modules in `controllers/` exporting command factories; components call `scopeController.setPhaseAgent(phase, n)`.
2. **Lint rule:** the store's `set` is not exported; only `dispatch` is. A custom rule fails the build on `useState` holding business
   data, on direct mutation of store objects and on any `dispatch` call outside `controllers/` and tests.
3. **Controller registry:** every command type is registered with its label, undo class and coalescing rule; a test asserts that every
   command in the registry round-trips (apply then undo returns a deep-equal state) and that no command is missing a label.
4. **Property-based test:** random sequences of commands + undo/redo must always satisfy `undo(apply(s)) == s` and
   `redo(undo(apply(s))) == apply(s)`.
5. `AUDIT` becomes the middleware log: replaying the log on the initial state reproduces the state (also a test).

Mapping from today: the ~65 handlers that call `syncState(...)` + `refreshAll()` map one-to-one to commands; `syncState` is exactly the
seam where `dispatch` goes.

## 7. How the 150-line rule is met

- Hard CI limit, counted on the raw file, for `.ts` / `.tsx` (tests included).
- Typical split units: one panel = one component + one hook (`useXxxModel`) + one pure formatter file; tables get `Row`, `Header`, `columns.ts`.
- The calculation engine is cut by concept, not by size: `ceiling.ts`, `weights.ts`, `scopeFit.ts`, `rampCurves.ts`, `savings.ts`, `runCost.ts`, `npv.ts`, … each ≤150 lines, composed in `model/index.ts`.
- **Data files** (artefact catalogue, regulatory catalogue, benchmarks, help prose): stored as JSON/MD content, generated or hand-split into ≤150-line chunks
  *or* explicitly exempt — **decision D1**.
- A `tools/lint-size.mjs` also reports the current largest files so the pressure is visible during the migration.

## 8. Migration strategy: strangler with a numeric safety net

Principle: the legacy HTML stays the reference until the new build proves identical numbers on the same cases, then each section is
switched over. No big bang.

### Phase 0 — Safety net (before any new code) · ~1–2 weeks
- Freeze features on the legacy file. Export **fixture cases**: the golden case, the customer workbook, every persona, curve family,
  lifecycle status, engagement context, industry profile and the edge cases of the code review (≥30 cases) as snapshots.
- Write a Playwright **oracle runner** that loads each fixture in the legacy build and records `model()`, `scenarioModel()`, Time Engine
  years, Monte Carlo with a fixed seed, KPI bar and checks → `fixtures/expected/*.json`. This is the contract of the new engine.
- Deliverable: `tools/oracle.mjs`, fixtures, CI job.

### Phase 1 — Foundations · ~1 week
- Repo layout (`src/domain|store|controllers|ui|content|legacy`), Vite singlefile build, ESLint rules (150 lines, layers), CI, theme tokens,
  i18n-ready string layer (EN only for now).
- Deliverable: empty shell that builds to one offline HTML and fails CI on a 151-line file.

### Phase 2 — Extract the domain engine · ~4–6 weeks
- Port in dependency order: types → catalogues (artefacts, regulatory, industries, benchmarks) → weights / scope / glass ceiling →
  curves (spline PCHIP, logistic, Gompertz, Bass, legacy) → engagement / lifecycle / knowledge-hub / HRI → `model()` + Time overlay →
  scenarios → sensitivity → Monte Carlo → strategies → readiness / ROI helpers.
- The legacy `readInputs()` seam is the specification of `Inputs`; `INPUTS.v` strings become typed numbers/enums with parsing at the edge.
- Exit: all fixtures equal the oracle to 1e-6 (the golden case exactly), 0 audit violations.

### Phase 3 — State, commands, history, persistence · ~3–4 weeks
- Slices for the 84 registry keys with `serialize/hydrate` kept compatible; command bus, middleware, history, coalescing, transactions.
- Persistence adapters: load **old HTML snapshots and old Excel workbooks** (schema `15.0`, `agentcase.calculation.v1`), write the same
  formats; IndexedDB autosave with history; BroadcastChannel remote patches.
- Exit: property-based undo/redo tests green; legacy snapshot corpus loads; Excel round-trip identical.

### Phase 4 — Shell and zones · ~2 weeks
- TopZone, NavZone (persona filter, guided sequences), KpiZone, DockZone (history, audit, autosave banner), accessibility baseline
  (focus, `aria-live`, keyboard) carried over from `a11yEnhance`.

### Phase 5 — Sections in waves (each wave shippable behind a feature flag) · ~10–14 weeks
| Wave | Groups (sections) | Why this order |
|---|---|---|
| 1 | frame, baseline, scope, economics core (≈19) | the case's inputs and the headline result; exercises most commands |
| 2 | stress, verdict (≈7) + Monte Carlo, strategies | heavy compute, self-contained |
| 3 | tune (12) | parameter editors, each a small form |
| 4 | verify (16) | mostly read-only tables and charts — fast, repetitive |
| 5 | present, defend, configure (≈8) | board / story / personas / persona editor |
| 6 | factory, refshare (≈14) | reference and architecture pages (content-heavy) |

Every section is "done" only when: ≤150-line files, every edit goes through a controller, undo works on it, its fixture screens match the
legacy (`render-diff` generalised to React output), the XSS fuzz passes, and the Excel/snapshot round-trip includes it.
During the waves a thin **bridge** (`legacy/`) can host not-yet-ported sections in an iframe fed with the current state, so users can
switch early; it is deleted at the end.

### Phase 6 — Import/export, report, hardening · ~2–3 weeks
- Excel export/import (ExcelJS lazy-loaded), "Critical & Regulated Software Delivery" report, HTML snapshot save (re-hydrates from an embedded JSON
  state rather than serialising the DOM — this removes a known fragility), print styles.

### Phase 7 — Cut-over · ~1–2 weeks
- Parallel run on real customer files, performance budget (first paint, 60 fps on edits, bundle ≤ the current 5 MB), accessibility pass,
  docs (`ARCHITECTURE.md`, `BUMP_PROCEDURE.md` rewritten for the new repo), tag `v19.0`, archive the legacy file under `docs/history/`.

**Order of magnitude:** 25–35 person-weeks for one experienced full-stack developer; ~4–5 months with two developers. The estimate is
dominated by Phase 5 (78 sections) and by the number of 150-line splits, and is uncertain by ±30 % until the Phase 0–2 spike measures real throughput.

## 9. Test strategy

| Level | Tool | Contract |
|---|---|---|
| Engine golden-master | Vitest + `fixtures/expected` | new = legacy on ≥30 cases (golden figures exact) |
| Differential (browser) | Playwright, old vs new builds | same KPI bar and tables for the same fixture and persona |
| Commands | Vitest | every command: validation, patch, round-trip undo; registry completeness |
| Property-based | fast-check | random command sequences keep `undo∘apply = id`, redo symmetric |
| Persistence | Vitest + Playwright | old snapshots/workbooks load; exports re-import identically |
| Security | existing XSS fuzz ported; React escapes by default, `dangerouslySetInnerHTML` banned by lint | 0 injection |
| Architecture | ESLint boundaries + `max-lines` | layers and the 150-line rule are CI errors |
| Accessibility | axe in Playwright | no regression vs `a11yEnhance` |

## 10. Decisions (all recommendations accepted on 2026-10-21)

| # | Question | Recommendation |
|---|---|---|
| D1 | Do JSON/MD **data and content files** count against the 150-line rule? | No for generated data (catalogues) and prose, yes for every `.ts/.tsx` |
| D2 | State library | Zustand + Immer (small, patch support); a custom store is possible but buys little |
| D3 | Granularity of undo for sliders and number fields | coalesce by key, 800 ms; a drag = one step |
| D4 | Is **persona / navigation** undoable? | No (UI state); business inputs and scope: yes |
| D5 | Should history survive reload and Save-HTML? | In autosave: yes (capped, 200 steps). In shared snapshot files: no (privacy, size) |
| D6 | Keep the legacy file shippable until cut-over? | Yes, security fixes only |
| D7 | Calculation fixes during the migration (e.g. model-owner decisions) | Not allowed in the port; ship them in the legacy file first so the oracle moves with them |
| D8 | One HTML deliverable vs a hosted app | Keep one offline HTML (G6); hosting can be added later without code change |
| D9 | Team size and whether the Phase 0–2 spike goes first as a paid-for proof | Yes: do Phases 0–2 for the Scope + Automation + Economics path as a 3–4 week spike and re-estimate |

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Silent numeric drift in the port | wrong business case | oracle fixtures from Phase 0; differential tests in CI; no behaviour change allowed in the port (D7) |
| Hidden DOM-as-state dependencies (inputs read via `getElementById`, ~300 `innerHTML` sites) | missed inputs | the `readInputs()` seam lists them; add a test that every legacy input id is mapped to a slice field |
| 150-line rule produces file sprawl | hard to navigate | strict naming, zone registry, barrel-free imports, folder-per-section, a generated map in the docs |
| Undo semantics surprises (derived values, imports, multi-tab) | trust loss | decisions D3–D5 written down and covered by tests; History panel makes steps visible |
| Bundle size / offline single file | slow open | lazy ExcelJS, code-split charts, budget in CI |
| Scope creep (new features requested mid-migration) | schedule | feature freeze; additions go on a post-v19 backlog |
| Excel/snapshot compatibility | customers' files | corpus of real files as fixtures; schema versions kept; migration table kept in `store/persistence/migrations` |

## 12. Definition of done (v19.0)

- No `.ts`/`.tsx` file over 150 lines (CI), `strict` TypeScript, 0 ESLint errors, 0 `any` in `src/`.
- Golden case and all fixtures equal to the legacy oracle; old snapshots and workbooks load; exports re-import identically.
- Every state change goes through a registered command; Ctrl+Z / Ctrl+Y work on every business input; the property-based tests are green.
- The 78 sections are available from the zone registry, persona filtering and guided sequences included.
- One offline HTML file builds from `npm run build`; docs and the bump procedure are rewritten for the new repository.

## 13. Proposed next step

Approve D1–D9, then run the **spike** (Phases 0–2 on Scope → Automation → Economics, plus the command/history core): ~3–4 weeks, ends with a
measured throughput, a re-estimate of Phase 5, and a working Ctrl+Z on the Adjust table.

## 14. Progress log

| Phase | State | Notes |
|---|---|---|
| 0 Safety net | done | `tools/oracle.mjs` + `tools/oracle-recipes.mjs` → 39 fixtures in `app/fixtures/` (state snapshot + legacy `model()` output) |
| 1 Foundations | done | `app/` (Vite + React 18 + strict TS, single-file build, ESLint `max-lines` 150 + layer rules, Vitest, CI `.github/workflows/app.yml`). The project lives in `app/`, not `src/` at the repo root |
| 2 Domain engine | done (core) | `app/src/domain`: inputs seam, catalogues (`tools/extract-catalog.mjs`), lifecycle, scope, glass ceiling, location/tokens/engagement/knowledge, LCE/EVT/supervision/verification tax, `modelRaw`, Time Engine (spline/logistic/Gompertz/Bass/legacy adapters, kernel, engine), `model()` overlay, canonical payback/NPV. **53 oracle fixtures reproduce the legacy engine to 1e-6** (`tests/domain/oracle.test.ts`; mutation-checked). Not yet ported (ported with the sections that use them, Phase 5): scenarios, sensitivity, Monte Carlo, strategies, readiness, due diligence, thin aggregate, `series()`/`materialise()`, legacy-mode monthly derivation (`deriveLegacyAt`, audit canaries only) |
