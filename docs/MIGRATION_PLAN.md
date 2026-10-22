# AgentCase — Migration plan: TypeScript + React, screen zones, full undo/redo

> Status: **record of the migration.** §1–§13 are the plan as approved (written against v18.11, decisions D1 to D9 accepted as
> recommended on 2026-10-21); the **Outcome** notes under §8 and §10 say what happened; §14 is the progress log; **§15 lists what
> remains** (gaps and follow-ups). Phases 0–7 are done: the cut-over shipped as `19.0.0`, and the multi-product release `20.0.0` (see
> [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md)) followed. The browser gates (e2e smoke, performance budget, axe pass, UI parity, parallel run)
> exist and pass (§15.3). Still open: the `v19.0` / `v20.0.0` tags (the user tags) and archiving the legacy file.
> The product is `app/` (`20.0.0`); the legacy file `AgentCase_v18_13_EN.html` is the frozen reference.
> Sources of fact: [ARCHITECTURE.md](ARCHITECTURE.md) (the new build), [history/ARCHITECTURE_legacy_v18.md](history/ARCHITECTURE_legacy_v18.md),
> [CODE_REVIEW.md](CODE_REVIEW.md), `tools/`. Where §1–§13 name paths or numbers that differ from the repository, §15.1 lists the difference.

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

**Outcome: done.** `tools/oracle.mjs` + `tools/oracle-recipes.mjs` (+ `oracle-recipes.d/`) produce `app/fixtures/{cases,expected}`: 39 fixtures at the end of Phase 0, **107** now. The runner is a Node/Playwright script, not a CI job; the oracle is regenerated by hand (BUMP_PROCEDURE §7.2).

### Phase 1 — Foundations · ~1 week
- Repo layout (`src/domain|store|controllers|ui|content|legacy`), Vite singlefile build, ESLint rules (150 lines, layers), CI, theme tokens,
  i18n-ready string layer (EN only for now).
- Deliverable: empty shell that builds to one offline HTML and fails CI on a 151-line file.

**Outcome: done.** The project lives in `app/` (not `src/` at the root): Vite + React 18 + strict TS, single-file build, ESLint `max-lines` and layer rules, Vitest, CI `.github/workflows/app.yml`. Differences from the plan: no `legacy/` bridge folder, no Prettier, no `max-lines-per-function`, no i18n string layer.

### Phase 2 — Extract the domain engine · ~4–6 weeks
- Port in dependency order: types → catalogues (artefacts, regulatory, industries, benchmarks) → weights / scope / glass ceiling →
  curves (spline PCHIP, logistic, Gompertz, Bass, legacy) → engagement / lifecycle / knowledge-hub / HRI → `model()` + Time overlay →
  scenarios → sensitivity → Monte Carlo → strategies → readiness / ROI helpers.
- The legacy `readInputs()` seam is the specification of `Inputs`; `INPUTS.v` strings become typed numbers/enums with parsing at the edge.
- Exit: all fixtures equal the oracle to 1e-6 (the golden case exactly), 0 audit violations.

**Outcome: done.** `app/src/domain`; the oracle fixtures reproduce the legacy engine to 1e-6 (mutation-checked). Scenarios, sensitivity, Monte Carlo, strategies, readiness and due diligence were ported later with their sections (Phase 5). Not ported: the legacy calculation package (`series()`/`materialise()`) and `deriveLegacyAt` outside the verification checks (§15.2).

### Phase 3 — State, commands, history, persistence · ~3–4 weeks
- Slices for the 84 registry keys with `serialize/hydrate` kept compatible; command bus, middleware, history, coalescing, transactions.
- Persistence adapters: load **old HTML snapshots and old Excel workbooks** (schema `15.0`, `agentcase.calculation.v1`), write the same
  formats; IndexedDB autosave with history; BroadcastChannel remote patches.
- Exit: property-based undo/redo tests green; legacy snapshot corpus loads; Excel round-trip identical.

**Outcome: done.** `app/src/store`, `app/src/controllers` (202 commands), snapshot, autosave with history, IndexedDB, BroadcastChannel. Property-based undo test, registry completeness, all legacy snapshots load. Differences: no command middleware and no `store/persistence/migrations` folder; the audit log is part of the store, and legacy files are accepted by filling missing keys with defaults.

### Phase 4 — Shell and zones · ~2 weeks
- TopZone, NavZone (persona filter, guided sequences), KpiZone, DockZone (history, audit, autosave banner), accessibility baseline
  (focus, `aria-live`, keyboard) carried over from `a11yEnhance`.

**Outcome: done.** Top / Kpi / Nav / Work / Dock zones, persona filter, keyboard undo/redo, restore banner, skip link, live region. Navigation was later made to follow the document (sidebar, group bar, hide-menu mode, dynamic sections, guided-sequence player and editor).

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

**Outcome: done.** All **79** sections are registered (the plan counted 78 at v18.11; the catalogue has 79 in 14 groups). The waves ran in a different order and in parallel; no feature flag and no `legacy/` iframe bridge were needed. Each section has an oracle or parity test (`app/tests/ui/sections/`). Partials found on the way, and their later resolution, are in §14 and §15.

### Phase 6 — Import/export, report, hardening · ~2–3 weeks
- Excel export/import (ExcelJS lazy-loaded), "Critical & Regulated Software Delivery" report, HTML snapshot save (re-hydrates from an embedded JSON
  state rather than serialising the DOM — this removes a known fragility), print styles.

**Outcome: done.** Parameters workbook (export + hardened import), results workbook, due-diligence pack, HTML snapshot (embedded JSON), snapshot manager, Critical & Regulated report; each proven against the legacy on fixtures. Not ported: see §15.2.

### Phase 7 — Cut-over · ~1–2 weeks
- Parallel run on real customer files, performance budget (first paint, 60 fps on edits, bundle ≤ the current 5 MB), accessibility pass,
  docs (`ARCHITECTURE.md`, `BUMP_PROCEDURE.md` rewritten for the new repo), tag `v19.0`, archive the legacy file under `docs/history/`.

**Order of magnitude:** 25–35 person-weeks for one experienced full-stack developer; ~4–5 months with two developers. The estimate is
dominated by Phase 5 (78 sections) and by the number of 150-line splits, and is uncertain by ±30 % until the Phase 0–2 spike measures real throughput.

**Outcome: done, bar the follow-ups of §15.3.** Done: the v18.12/v18.13 decisions, documentation rewritten (README, ARCHITECTURE, BUMP_PROCEDURE, CODE_REVIEW status, this record, CHANGELOG v19.0.0, `app/README.md`), versions `19.0.0` and `20.0.0`, e2e smoke, performance budget, axe pass and parallel run (on the fixture files). Not done: parallel run on real customer files, tags, archiving of the legacy file (§15.3).

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

| # | Question | Recommendation | Outcome |
|---|---|---|---|
| D1 | Do JSON/MD **data and content files** count against the 150-line rule? | No for generated data (catalogues) and prose, yes for every `.ts/.tsx` | Applied. Catalogues are JSON under `app/src/domain/catalog` (extracted by `tools/extract-catalog.mjs`); prose is JSON under `app/src/content`. ESLint `max-lines` 150 and `tests/size.test.ts` cover `.ts/.tsx` in `src` and `tests` |
| D2 | State library | Zustand + Immer (small, patch support); a custom store is possible but buys little | Applied: `zustand/vanilla` + Immer `produceWithPatches` in `app/src/store/core.ts` |
| D3 | Granularity of undo for sliders and number fields | coalesce by key, 800 ms; a drag = one step | Applied: `COALESCE_MS = 800` in `store/history.ts` |
| D4 | Is **persona / navigation** undoable? | No (UI state); business inputs and scope: yes | Applied: `view.setPersona` is the one non-undoable command (of 202); navigation state is in `ui/uiState.ts` |
| D5 | Should history survive reload and Save-HTML? | In autosave: yes (capped, 200 steps). In shared snapshot files: no (privacy, size) | Applied: the autosave record carries the history (`persistence/autosave.ts`); `toSnapshot` and the HTML snapshot carry none |
| D6 | Keep the legacy file shippable until cut-over? | Yes, security fixes only | Applied, extended by D7: the legacy file went from v18.11 to v18.13 for deliberate calculation decisions; the frozen reference is `AgentCase_v18_13_EN.html` |
| D7 | Calculation fixes during the migration (e.g. model-owner decisions) | Not allowed in the port; ship them in the legacy file first so the oracle moves with them | Applied for v18.12 (re-fit on regulatory scope changes, Monte Carlo above 3 years) and v18.13 (strategies, Results, scenarios at other horizons): each with an oracle regeneration and a TypeScript port. v18.10 and v18.11 pre-date the oracle |
| D8 | One HTML deliverable vs a hosted app | Keep one offline HTML (G6); hosting can be added later without code change | Applied: `npm run build` produces `app/dist/index.html`, about 2.6 MB |
| D9 | Team size and whether the Phase 0–2 spike goes first as a paid-for proof | Yes: do Phases 0–2 for the Scope + Automation + Economics path as a 3–4 week spike and re-estimate | No separate spike or re-estimate is recorded in the log; Phases 0–2 were run on the full engine and the Scope section became the reference port |

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

**Outcome:** met (the performance budget, accessibility pass and parallel run exist since; only real customer files and the tags are open, §15.3). Sections: 79 (not 78) at v19.0.0, 85 at v20.0.0 with the six Portfolio ones, all reachable from the document-driven navigation.

## 13. Proposed next step

Approve D1–D9, then run the **spike** (Phases 0–2 on Scope → Automation → Economics, plus the command/history core): ~3–4 weeks, ends with a
measured throughput, a re-estimate of Phase 5, and a working Ctrl+Z on the Adjust table.

## 14. Progress log

| Phase | State | Notes |
|---|---|---|
| 0 Safety net | done | `tools/oracle.mjs` + `tools/oracle-recipes.mjs` → 39 fixtures in `app/fixtures/` (state snapshot + legacy `model()` output) |
| 1 Foundations | done | `app/` (Vite + React 18 + strict TS, single-file build, ESLint `max-lines` 150 + layer rules, Vitest, CI `.github/workflows/app.yml`). The project lives in `app/`, not `src/` at the repo root |
| 2 Domain engine | done (core) | `app/src/domain`: inputs seam, catalogues (`tools/extract-catalog.mjs`), lifecycle, scope, glass ceiling, location/tokens/engagement/knowledge, LCE/EVT/supervision/verification tax, `modelRaw`, Time Engine (spline/logistic/Gompertz/Bass/legacy adapters, kernel, engine), `model()` overlay, canonical payback/NPV. **53 oracle fixtures reproduce the legacy engine to 1e-6** (`tests/domain/oracle.test.ts`; mutation-checked). Not yet ported (ported with the sections that use them, Phase 5): scenarios, sensitivity, Monte Carlo, strategies, readiness, due diligence, thin aggregate, `series()`/`materialise()`, legacy-mode monthly derivation (`deriveLegacyAt`, audit canaries only) |
| 3 Store, commands, history, persistence | done | `app/src/store` (Immer patches, `dispatch`/`batch`/`undo`/`redo`/`jumpTo`, 800 ms coalescing, 200-step cap, audit log, remote patches), `app/src/controllers` (inputs, artefacts, scope, team, lifecycle, history), persistence (legacy-compatible snapshot with prototype-pollution guard, autosave with history, IndexedDB adapter, BroadcastChannel). Tests: property-based undo∘apply = id, registry completeness (every command has a sample, a label and round-trips), controller edits reproduce legacy fixtures, all 52 legacy snapshots load and recompute the oracle figures, multi-tab, lint rules (UI cannot import the write path). |
| 4 Shell and zones | done | `app/src/ui`: `Shell` (CSS grid areas top / kpi / nav / work / dock), `TopZone` (customer, persona, undo/redo, save/open), `NavZone` (79 sections in 14 groups from the legacy catalogue, persona-filtered), `KpiZone` (sticky headline from the live case), `DockZone` (history panel with jump), `SectionHost` + `SectionFrame` (Input / Result / Diagnostic zones, help) with a placeholder for unmigrated sections, Ctrl/Cmd+Z / Shift+Z / Ctrl+Y (text fields keep native undo), restore banner for autosaved sessions, skip link and live region. Verified in Chromium: KPI bar shows the golden figures. |
| 5 Sections (foundation) | done | Shared widgets (`ui/widgets`), per-group registration files, `docs/SECTION_PORTING.md`, parity tooling (`tools/section-text.mjs` → `fixtures/sections/`, `tests/helpers/parity.ts`: every figure the legacy section shows must appear in the migrated one), oracle extras (`tools/oracle-extras.d`), samples/recipes split by area, reference section **Scope** (`ui/sections/scope/scope-sel`: phase selector, adjust table with live strip and bulk edit, glass-ceiling impact) |
| 5 Sections (waves 1–4) | done for 66 of 79 | Ported with oracle/parity tests: frame (4), baseline (3), scope (5), economics (4), stress (4), verdict (3), tune (12), verify (16), refshare (10, io/Excel as disabled stubs). Pending: present, defend, configure (8), factory (4), model-engine (6). Legacy discrepancies found by the ports are listed in each PR/agent report: stale help figures, fixed-3-year labels, Monte Carlo NaN beyond 3 years, no potential re-fit when opening a case or changing industry, section dumps polluted by `scurve` render order |
| 5 Sections (wave 5–6, complete) | done | factory (4), model-engine (6), present (3), defend (3), configure (2) — **all 79 sections are now registered**. Known partials, listed for Phase 6/7: Logic verification computes 12 of the 68 legacy convergence rows (the rest depend on modules not in this build), Board has 44 of ~166 registry variables and no row editor, dynamic sections are stored but not navigable, sidebar order/labels do not yet follow `GROUPS`/`sectionGroups`, Persona management lacks the layout board and guided-sequence editor, Due-diligence Excel pack, Excel/HTML snapshot (Phase 6). The persona picker now reads the document's `PERSONAS`. |
| 6 HTML snapshot, snapshot manager, critical-delivery report | done | **HTML snapshot**: `store/persistence/html/` clones the running page, empties `#root`, embeds the case as one `<script type="application/json" id="agentcase-snapshot">` (`<` escaped; re-saving replaces it, a stacked legacy script is dropped); `main.tsx` opens it before the first paint and only autosaves newer than the file are offered. Opening accepts this build's HTML, v18.x HTML snapshots (balanced-brace scan + `JSON.parse` after `try{ applySnapshotState(`, nothing is evaluated, anything else is rejected) and JSON. Fixtures generated from the legacy page: `tools/snapshot-fixtures.mjs` → `app/fixtures/snapshots/`. **Snapshot manager** (`namedSnapshots`, `controllers/snapshots.ts`, `domain/snapshots/`): capture, activate (one undo step), rename, delete, baseline (double confirm), protected golden entries from legacy files, compare two (or one vs the current case). **Report**: `store/persistence/report/`, its visible text equals the legacy report on 11 fixtures (`tools/report-fixtures.mjs` → `app/fixtures/reports/`). **Open-case decision**: the legacy `applySnapshotState()` re-runs `applyScopeAuto()` on every restore, so with *Fit to selected scope* on the displayed automation potential is re-fitted (industry-med: stored 75 → 46; the engine already ignores the stored value while fit is on, so no figure moves). Verified against the legacy page on all 104 oracle fixtures (`fixtures/snapshots/open-fit.json`); implemented in `controllers/openFile.ts#refitOnOpen`, used by file open, boot-embedded case and snapshot activation — not in `fromSnapshot`. Not ported: golden-vs-AME comparison and the AME reference capture (GCT-SPEC), per-snapshot Excel export (Excel agent). |
| 6 Import/export | done | Parameters workbook (47 sheets, export + hardened import, one undoable batch with the v18.10 re-fit; proven both directions: our reader on 33+7 legacy workbooks, our writer cell-by-cell, our writer → legacy `importParams` 66/66 identical), results workbook (6 sheets) and due-diligence pack (4 sheets) cell-by-cell on 17+8 fixtures, HTML snapshot (embedded JSON, no stacking, opens v18.x snapshots safely, re-fit on open as the legacy), snapshot manager, Critical & Regulated report (11 fixtures). Legacy discrepancies: Location Target exported rounded to whole %, FM environment `isProd` dropped on import, `bass` family not restored by the legacy snapshot restore, report hard-codes 349 artefacts (catalogue has 370). Not ported: golden/AME capture, per-snapshot Excel export, Agent Catalog capacity / loop external % import (immutable catalogues; reported as notes). |
| Pre-7: legacy v18.12 + port | done | Decided with the product owner: (1) the automation potential is re-fitted to the scope on every regulatory-panel change (industry, norm, cross-cutting, catalogue on/off, include, single regulatory artefact) — legacy `AgentCase_v18_12_EN.html` and the TS controllers; (2) Monte Carlo works above 3 years (net benefit = Σ of the Time Engine's year rows) — legacy and `domain/stress/simulate.ts`. Oracle regenerated (regulated fixtures change; extras evaluation made hermetic; `section-text` renders each section from a fresh state). Still 3-year only: scenarios, strategies and the decision's strategy ROI (n/a above 3 years) |
| Pre-7: chantiers (done) | done | Logic verification computes all 67 legacy convergence rows (the 68 quoted included the header), row-by-row equal on 104 fixtures; Board registry 166/166 variables (value, label, format, scope, text equal on 104 fixtures) + rows editor + live dynamic section view; sidebar, group bar, hide-menu mode, persona/menu order, dynamic sections and the guided-sequence player follow the document (equal to the legacy sidebar for every persona on 107 fixtures); Persona management has the sequence editor, menu layout board and persona layout board. Legacy v18.13 also fixes strategies / Results above 3 years and scenarios at horizons 1–2 (`horizonYears()`). Not ported: collapsible sidebar groups, Fast Path filter, ADVANCED lock, tag/MVP editing, layout-board live preview. `TE-10b` (legacy-mode engine) fires on 2 supervision fixtures in the legacy and is reproduced only in the verification section |

## 15. Outcome, remaining gaps and follow-ups

State at the time of writing (v20.0.0): Phases 0–7 done. The TypeScript build registers 85 sections (the 79 ported plus the 6 of the multi-product *Portfolio* group), reproduces
the legacy engine on 107 oracle cases (also as one-product portfolios, A1) and builds to one offline file named `AgentCase_v20_0_EN.html` by `npm run release`. Everything below is collected
from §14 and from checking the repository.

### 15.1 Where the result differs from the plan

| Plan said | Repository |
|---|---|
| `src/…` at the repository root | `app/src/…` |
| 78 sections in 12 groups (measured on v18.11) | 85 sections in 15 groups at v20.0.0 (79 in 14 at v19.0.0; `app/src/ui/zones/data/sectionCatalog.json`) |
| build output `dist/AgentCase_vX_Y_EN.html` | `npm run build` -> `app/dist/index.html`; `npm run release` -> `app/dist/AgentCase_v20_0_EN.html` (BUMP_PROCEDURE §6) |
| `tools/lint-size.mjs` | `app/scripts/sizes.mjs` (and the ESLint rule + `tests/size.test.ts`) |
| `legacy/` bridge; feature flags per wave | not built, not needed |
| command middleware (audit, permissions); `store/persistence/migrations` | audit ring inside the store; no migration table |
| help prose in `content/<id>.md` | JSON under `app/src/content/refshare` and `help` props in the sections |
| Playwright differential tests (old vs new) and axe in CI | e2e smoke, performance budget and parallel run built (CI job `e2e`); axe (`npm run a11y`) and UI parity (`tools/ui-parity.mjs`) built and run by hand before a release |
| Prettier, `max-lines-per-function` | not configured |
| Phase 5 as six waves | done in a different order, in parallel |

### 15.2 Not ported or partial

| Item | Detail | Source |
|---|---|---|
| ADVANCED lock (URL `?persona=advanced`, Ctrl/Cmd+Alt+A, 5 clicks on the title), tag/MVP editing | out of scope: removed from the spec by decision |
| Collapsible sidebar groups, Fast Path filter, layout-board live preview | being ported (post-v19.0) | §14 pre-7 chantiers; the Advanced gestures were confirmed absent from `app/src` |
| Golden-vs-AME comparison and AME reference capture (GCT-SPEC) | not ported | §14 Phase 6 |
| Per-snapshot Excel export | not ported | §14 Phase 6 |
| Agent Catalog capacity and loop external % in the workbook import | not imported (immutable catalogues), reported as notes | §14 Phase 6 |
| Legacy calculation package (`inputHash`, staleness banner) | ported: saved cases carry the package, a mismatch on open shows the banner; figures are still always derived from the inputs | `tests/store/calc-staleness.test.ts`, `tests/ui/calc-banner.test.tsx` |
| `TE-10b` (legacy-mode monthly derivation canary) | fires on 2 supervision fixtures in the legacy; reproduced only in the verification section | §14 pre-7 chantiers |
| Legacy `tools/xss-test.mjs` fuzz | not ported; the new build relies on lint rules and the import/restore tests | `app/tests` |
| A hosted server | out of scope (non-goal, D8) | §1 |

### 15.3 Phase 7 follow-ups

| # | Item | State at v20.0.0 |
|---|---|---|
| 1 | Parallel run on real customer files (legacy vs new on the same workbooks and snapshots) | built (`tools/parallel-run.mjs`) and run on the 107-fixture set; **open for real customer files** (the user supplies them) |
| 2 | Performance budget: first paint, edit latency, bundle size | done: `tools/perf.mjs` and `app/perf-budget.json` (CI job `e2e`), including the six Portfolio sections |
| 3 | Accessibility pass (axe) and keyboard walk | done: `npm run a11y` (`tools/a11y*.mjs`), 0 violations on the case fixtures and the example portfolio; run by hand, not in CI |
| 4 | Automated browser smoke of the built file | done: `tools/e2e-smoke.mjs` (CI job `e2e`), 6 case fixtures and 2 portfolio files |
| 5 | Version `19.0.0`, released file name | done: `19.0.0` then `20.0.0`; `npm run release` names the file; **tags are made by the user** |
| 6 | Archive the legacy file under `docs/history/` and update the tools' default file lookup (BUMP_PROCEDURE §7.3) | open: the legacy file is still the oracle of `tools/` and of `ui-parity` / `parallel-run` |
| 7 | Decide whether to port or retire the items of §15.2 | open |

### 15.4 Legacy discrepancies found while porting

Not fixed in the port (decision D7); each is a candidate for a deliberate change shipped in the legacy file first.

| Discrepancy | Status |
|---|---|
| Stale help figures and fixed "3-year" labels in some sections | open (ported as shown, parity-tested) |
| Monte Carlo returned NaN above 3 years | fixed in v18.12 (legacy and port) |
| Strategies and Results above 3 years; scenarios at horizons 1 and 2 | fixed in v18.13 |
| No potential re-fit when changing industry or a regulatory panel setting | fixed in v18.12; re-fit on open added to the port as in the legacy restore |
| Section text dumps polluted by the render order of `scurve` | worked around in `tools/section-text.mjs` (each section renders from a fresh state) |
| Location Target exported rounded to whole % | open |
| FM environment `isProd` dropped on import | open |
| `bass` curve family not restored by the legacy snapshot restore | open |
| Critical-delivery report hard-codes 349 artefacts, the catalogue has 370 | open (ported identically) |
| Logic verification "68 convergence rows" | the header counted: 67 rows, all computed (was 12 of 67 at first) |

### 15.5 Inconsistencies noted in the repository while documenting

- `app/fixtures/README.md` still says the fixtures come from "the legacy single-file app (v18.11)"; they were regenerated from v18.13.
- `tools/golden.json` carries `"version": "18.13"`; the TypeScript build has no equivalent golden file (its golden figures are the `golden` oracle fixture).
- `app/package.json`, `app/src/domain/version.ts` and `app/index.html` all read 20.0.0; `app/tests/version.test.ts` checks that they agree. The autosave database and BroadcastChannel are still named `agentcase-v19` on purpose (never orphan autosaves).
- The legacy tools (`tools/test-all.mjs` and its steps) and the oracle generators are not run by CI.

### 15.6 Multi-product (v20.0.0): what is left

Delivered: P1-P7 of [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) (decisions D-M1..D-M12). Left out on purpose or not yet built:

| Gap | Note |
|---|---|
| Portfolio scenarios table | the six scenarios and the sensitivity stay per product (spec P6 "hors périmètre") |
| Dependencies and capacity between waves | spec § 9; waves may overlap, no precedence constraint |
| Shared teams across products | the team is strictly per product (spec § 9) |
| Per-draw horizon truncation in the portfolio stress | each product is simulated on its own horizon; the portfolio draw is the sum (DEV-PF-STRESS) |
| KnowledgeSubsets "apply to all" | only "back to common" exists for the fields of a knowledge subset |
| Rates, model, coefficients per product; item-level scope overrides; shared set-up line; knowledge reuse; full correlation matrix | decisions D-M2, D-M3, D-M5, D-M11 and spec § 9: v2 |
| Excel cross-version | a 20.0.0 portfolio workbook has seven extra sheets that a 19.x build ignores; a 19.x file imports as a case; the import does not re-fit the potential |
| Real customer portfolios | not exercised: the example is generated from the golden fixture |
