# AgentCase — Architecture of the TypeScript build

> Applies to **`app/`, version 20.0.0** (`app/src/domain/version.ts`, `app/package.json`): a multi-product portfolio build. 736 `.ts`/`.tsx` files under `app/src`,
> 202 test files under `app/tests` (counted with `find`; 15,339 tests passed on the last local run, CI is authoritative).
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
| `src/domain` | `types`, `catalog` (artefacts, regulatory catalogue), `model` (glass ceiling, `modelRaw`, overlay, LCE/EVT/supervision/verification tax), `time` (Time Engine), `economics`, `scope`, `baseline`, `frame`, `stress` (scenarios, sensitivity, Monte Carlo, RNG), `tune`/`tuneB`, `verdict`, `verifyA`/`verifyB`, `factory`, `refshare`, `pdc` (present/defend/configure, verification checks and convergence rows, Board variables), `nav` (sidebar, group bar, sequences), `snapshots`, `portfolio` (multi-product, P1), plus `engagement`, `knowledge`, `lifecycle`, `location`, `tokens`, `canonical` |
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
- **Portfolio** (`src/domain/portfolio/`, multi-product phase P1, spec [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md)). Pure layer above `computeCase`,
  not yet wired to the store or the UI. `resolveProduct` builds a product's effective `CaseState` (common + whitelisted overrides + knowledge subset +
  own team; memoised on object identities), `runOf` runs the existing Time Engine once per resolved case, `consolidate` shifts each product's monthly
  rows onto the calendar and sums them (no formula of its own; ROI via `roiCanonical`, discount via `caseDiscountRate`), `envelopeCase` /
  `portfolioToCase` wrap and unwrap a single case.
- **Stress** (`stress/`): scenarios, sensitivity, seeded Monte Carlo (`rng.ts`, `simulate.ts`), strategies, `fingerprint.ts` (a hash of
  the model inputs only, to decide whether a stored distribution is stale).
- **Verification** (`pdc/verifChecks.ts` and `verifConv*.ts`): the 16 automatic checks and the 67 convergence rows of the Logic
  verification section, as pure functions over a `Ctx`.

Scope re-fit: with *Fit to selected scope* on, the potential follows the scope's effort-weighted automatable share. `store/derive.ts`
`refitPotential(draft)` is called by every command that changes the scope (SDLC artefact selection, industry, norms, cross-cutting,
regulatory catalogue, import).

## 4. Store: Immer patches, commands, history

`src/store/core.ts` creates one store (`zustand/vanilla`) holding `{ portfolio, doc, history, audit, rev }`. Since multi-product P2 the
**source of truth is the `Portfolio`** (`domain/portfolio`: `common` = every key of a case except `teamIn`, `products`, `waves`, `activeProductId`,
`hub`, `horizonMonths`; `docs/SPEC_MULTI_PRODUIT.md`). `doc` is **derived**: `deriveDoc(portfolio)` = `resolveProduct(portfolio, activeProductId)`,
the active product's effective case, identity-stable while its inputs are (P1 memo). Everything written for a single case (the ~200 commands, the 79
sections, `useDoc`/`useCtx`/`useCaseResult`, `toSnapshot(doc)`, the Excel and report adapters) reads and writes `doc` unchanged. History, audit,
autosave and broadcast patches are on the **portfolio**.

```
dispatch(command) ──► ONE produceWithPatches(portfolio) ──► patches + inverse patches
                           (case command: run on a draft of the derived doc, then the ADDRESS LAYER maps each change to the portfolio)
                           └─► history.pushEntry (coalescing, cap) ──► audit log ──► listeners (autosave, broadcast)
```

| Concept | Implementation |
|---|---|
| Command | `{ type, payload, label, coalesceKey?, undoable, run(draft, payload), runPortfolio? }`. Case commands use `defineCommand` (`store/commands.ts`): `run` mutates the active product's effective case. Portfolio commands use `definePortfolioCommand`: a pure `apply(portfolio, payload)`, turned into minimal Immer patches by `store/syncDraft.ts`. 229 commands are registered by the modules of `src/controllers` (225 undoable; 4 view commands - `view.setPersona`, `product.setActive`, `product.setEditScope`, `portfolio.setDisplayScope` - are applied but never on the undo stack; counted from `COMMAND_REGISTRY` after loading the controller modules; 24 of them are `product.*` / `wave.*` / `portfolio.*`, the others include `excel.importPortfolio` and `snapshots.activatePortfolio` / `baselinePortfolio`); a duplicate type throws |
| Address layer | `store/address/` (`index.ts`, `dom.ts`, `subset.ts`). After a case command ran on the derived doc, each changed top-level key is re-addressed onto the portfolio inside the same produce: `teamIn` -> the active product's `teamIn`; a whitelisted key (spec 4.3) -> `product.overrides[key]` if the product already overrides it OR the edit scope is `'product'` (and the value differs from common), else `common[key]`; a changed form field of `dom.values` / `dom.checked` is routed per field (Knowledge Hub fields to the product's knowledge subset when it defines them, then override/common by the same rule; `horizon`, `khInfraMonthly`, `khEnabled` mirror into `horizonMonths` / `hub`); any non-overridable key (RATE, MODEL, COEF, PERSONAS, nav, snapshots, customerName, ...) -> `common`. With one product and no override the result is exactly today's behaviour |
| View state | `activeProductId` (saved with the file, D-M6) and `editScope` (`'all'` / `'product'`, transient, never saved) change through `undoable: false` commands (`product.setActive`, `product.setEditScope`): applied, logged, never on the undo stack, filtered out of broadcast patches (`VIEW_FIELDS`). After an undo/redo/remote patch an unknown active product falls back to the first one (`normalizeActive`) |
| Portfolio commands | `controllers/product.ts` (add, rename, duplicate, archive, remove, setNote, setOffset, setActive, setEditScope), `productOverrides.ts` (setOverride, clearOverride, applyToCommon, setKnowledge), `wave.ts` (add, rename, remove, reorder, setStart, setNote, assign), `portfolio.ts` (setHorizon, setHub, setRho), `stressPortfolio.ts` (run, not a command). `portfolioGuard.dispatchChecked` refuses (returns false, no step) any command whose result breaks `validate` (last product, weights != 100, 50-product cap, ...) |
| Registry | `COMMAND_REGISTRY` (type, undoable). `tests/store/registry.test.ts` fails if a command has no sample in `tests/store/samples/`, no label, or does not round-trip through undo/redo, both on the default case and on a 3-product, 2-wave portfolio (view commands with `undoable: false` must add no step) |
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
command sequences against `undo∘apply = id` and symmetric redo; `tests/store/portfolio-undo.test.ts` does the same on a 3-product portfolio with case, product, wave, override and scope commands mixed (A6), checking `validate` after every step.

## 5. Persistence

All adapters live in `src/store/persistence/` and `src/controllers/` (file and boot wiring). The case keeps the **legacy snapshot
state** (the same registry keys), so old files load. Two file formats coexist (`persistence/portfolioSnapshot.ts`):

- `agentcase.snapshot.v1`, one case. Opening it **envelopes** it (F21): `envelopeCase` = "Produit 1" in "Vague 1" at month 0, identical numbers (A1 on the 107 fixtures through the real open path, `tests/store/portfolio-a1.test.ts`).
- `agentcase.portfolio.v1`, a portfolio (`readPortfolio`: `sanitize`, safe ids `[A-Za-z0-9_-]{1,64}`, shapes checked, `validate` invariants enforced, common values filled from the code defaults). **Save rule (F22, `isSingleCase`)**: a portfolio is written as `snapshot.v1` exactly when that file re-opens to the very same portfolio (one product, one wave, no override, no knowledge subset, default names/ids/offset); anything else, incl. a renamed product, keeps the portfolio format so a save never loses information. Hence existing file/HTML/Excel tools and tests keep seeing v1 files for single cases, and export -> open of a single-product portfolio is identical (A9).

The autosave record is the exact portfolio (`full` mode, never collapsed to v1) plus its history, because the undo patches address product and wave positions; a record without `format: 'portfolio'` (written before P2) restores its document but not its case-level history.

| Adapter | Files | Behaviour |
|---|---|---|
| Snapshot JSON | `snapshot.ts` | `toSnapshot` adds `savedAt` and `_schema: 'agentcase.snapshot.v1'`; `fromSnapshot` deep-copies through `sanitize` (drops `__proto__`, `constructor`, `prototype`), requires the form inputs (`dom`), and fills missing keys from the code defaults so new defaults reach old files |
| Autosave | `autosave.ts`, `idb.ts` | debounced (1.5 s default) record per tab `{ tabId, savedAt, label, snapshot, history }` in IndexedDB `agentcase-v19` (store `autosave`), so Ctrl+Z survives a reload (decision D5). `memoryStorage()` for tests. `restoreRecord` puts the history back |
| Boot | `controllers/boot.ts`, `src/main.tsx` | opens an embedded case before the first paint, then offers the newest autosave of another tab that is **newer than the file's own `savedAt`** (never auto-restores) |
| Multi-tab | `broadcast.ts` | `BroadcastChannel('agentcase-v19')`: local changes are posted as patches (the inverse for an undo); a message from another tab is applied with `applyRemote` |
| HTML snapshot | `html/embed.ts`, `read.ts`, `legacy.ts` | the running page is cloned, `#root` emptied, transient nodes dropped, the case embedded in `<script type="application/json" id="agentcase-snapshot">` with `<` and the JS line separators escaped; re-saving replaces the script. Opening accepts this build's files, legacy v18.x snapshots (the object after `try{ applySnapshotState(` is located by a balanced-brace scan and `JSON.parse`d, nothing is evaluated; any other shape is rejected) and plain JSON. File name `AgentCase_<customer>_<vTag>_Snapshot_<stamp>.html` |
| Re-fit on open | `controllers/openFile.ts#refitOnOpen`, `store/derive.ts#refitPortfolio` | like the legacy `applySnapshotState`, a restore re-runs the scope fit; used for file open, the embedded case and snapshot activation (not in `fromSnapshot`). For a portfolio every product's potential follows ITS effective scope (most frequent value shared as common, others as overrides); edits re-fit the active product only, as before |
| Parameters workbook | `excel/params/` | export and hardened import, one undoable batch; sheet families in `registry.ts` (47 sheets per the migration log). ExcelJS is loaded by dynamic `import()` (`excel/lazy.ts`) |
| Parameters workbook, portfolio part (P5) | `excel/portfolio/` | for a real portfolio (`hasPortfolioContent`) "Export all" appends `PortfolioSettings`, `Products`, `Waves`, `TeamIn`, `Overrides`, `KnowledgeSubsets`, `KnowledgeDomains`; the 47 case sheets describe the common case. A workbook with a `Products` sheet imports through `interpretPortfolioParams` (strict, caps, whitelist) and `excel.importPortfolio` (ONE undoable `definePortfolioCommand`); no refit on import |
| Results workbook, due-diligence pack | `excel/results/`, `excel/dd/` | export (and DD import); cell-by-cell equal to the legacy on fixtures |
| Results workbook, portfolio part (P5) | `excel/results/portfolio/` | `Portfolio`, `Wave <name>`, `Knowledge transfer`, per product `Product <name>` + the existing six sheets on the effective case (`P<n> ROI`...); numbers only from `consolidate` / `portfolioHeadline` / `consolidationView` / `knowledgeTable`; Excel-safe unique names (`sheetName`); the display scope picks the leading group. The DD pack is the ACTIVE product's (annotations are common to the portfolio) |
| Report | `report/` | "Critical & Regulated Software Delivery" HTML report; its visible text equals the legacy report on 11 fixtures |
| Report by scope (P5) | `report/index.ts#buildScopedReport`, `report/portfolio/` | Produit = the legacy report of the product's effective case (byte for byte); Portefeuille / Vague = the portfolio report built from the domain views; the controller reads the (unsaved) `displayScope`, tests pass the scope |
| Snapshot manager | `controllers/snapshots.ts`, `domain/snapshots/` | named snapshots in the document (capture, activate as one undo step, rename, delete, baseline, protected golden entries, compare) |
| Snapshots of a portfolio (P5) | `controllers/snapshotPortfolio.ts` | a capture of a real portfolio also stores the whole portfolio (`NamedSnapshot.portfolio`, no view state, no nested library); activate / baseline are portfolio commands (one undo step, current library kept, active product kept); compare reads the active product |

There is no schema-migration table: legacy files are accepted as they are (missing keys take defaults), and the only version tag is
`_schema`. Every saved case (JSON, HTML snapshot, autosave record) carries the canonical calculation package `{schemaVersion, calculationVersion, inputHash, curveModelId, headline, annual}` (`domain/calcPackage.ts`, stamped by `toSnapshot`, dropped by `fromSnapshot`: it is never part of the document). On open, `controllers/calcStaleness.ts#checkLoadedCase` recomputes the package and compares it (`domain/calcStaleness.ts`: valid / stale / versionMismatch / notCalculated; figures to 1e-6). A portfolio file stamps `calculationPackages: {[productId]: package}` (each product's resolved case, exactly the single-case package) plus a portfolio-level `calculationPackage` (`inputHash` `pf1:`, consolidated headline and calendar-year table from `domain/portfolio/package.ts`); `checkPortfolioStaleness` compares both levels, worst state wins, `staleProducts` names the products that moved. A mismatch shows the legacy banner (`ui/shell/CalcStaleBanner.tsx`, `role=status`, Dismiss). The banner state lives in the controller, outside the document and the undo history; files without a package (older fixtures) open silently. Figures are always recomputed from the inputs, the package is only compared. The Excel workbooks already read the same engine, so they equal the package figures without change.

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
bundled legacy catalogue (`ui/zones/data/*.json`: 85 sections in 15 groups, the 15th being the multi-product Portefeuille group). Domain logic is in `domain/nav/` (`layout`, `groupBar`,
`moves`, `sequence`); edits go through `controllers/nav*.ts` and the Persona-management section (sequence editor, menu layout board,
persona layout board). The same data round-trips through the parameters workbook.

**Multi-product interface (P3, UI only; no calculation changed).** Progressive disclosure (spec F23): with ONE product nothing is added (no
selector, banner, badge, nav group). From two products on (`useIsMulti`, `store/portfolioHooks.ts`; selectors return stable references):
- `shell/ProductBar.tsx` (top bar): "Produit" selector (name and wave label) and the "Modifier : tous les produits / ce produit seulement"
  radio group (`product.setActive` / `product.setEditScope`, non-undoable). Default scope: **tous les produits** (the entry team always goes
  to the active product whatever the scope). The KPI bar shows the ACTIVE product by default; the display scope (P4, below) switches it to the Portefeuille or a Vague.
- `zones/SectionFrame.tsx` shows `widgets/ProductBanner.tsx` ("Produit : X (hérité / n surcharges)") for sections that declare override refs;
  `widgets/OverrideBadge.tsx` (`OverrideBadge`, `InheritedField`): chip hérité / surchargé with the common value as tooltip, "Revenir au commun",
  "Appliquer à tous les produits" (controllers `productOverrides`; state through `domain/portfolio` `isOverridden`). Wired into: Scope selection
  (SDLC and regulatory artefacts), Phase scope, S-curve, Normes / regulatory include, Engagement context (context and coefficients), Location mix;
  team-in shows `TeamOwnerLabel` ("Équipe de : X"). Not wired (left for later): the other overridable keys have no badge; the banner still applies.
- Navigation: `zones/portfolioNav.ts` adds the **Portefeuille** group and its sections to the persona lists only with 2+ products (document-driven
  data in `sectionCatalog/groups/sectionGroups.json`); `frame/home/AddProductEntry.tsx` (Welcome) adds the first extra product.
  Sections `portfolio/products` (table and P2 actions, Ctrl+Z restores a removed product; indicators from the product's own `computeCase`) and
  `portfolio/overrides` (common vs product value per overridden key, revert, apply to all).

**Sections.** One folder per section under `ui/sections/<group>/<id>/` with a default-exported `index.tsx` that composes
`SectionFrame` (`input` / `result` / `diagnostic` zones and a `help` note). `ui/sections/<group>.ts` maps section id → lazy loader;
`ui/sections/index.ts` merges the 15 group maps into `SECTION_COMPONENTS`.

| Group | Sections | Group | Sections |
|---|---|---|---|
| frame | 4 | verify | 16 |
| baseline | 3 | present | 3 |
| scope | 5 | defend | 3 |
| tune | 12 | configure | 2 |
| economics | 4 | factory | 4 |
| stress | 4 | refshare | 10 |
| verdict | 3 | model-engine | 6 |

Plus **portfolio** (6: `products`, `overrides`, `knowledge-transfer`, `waves`, `consolidation`, `portfolio-stress`, folders `ui/sections/portfolio/<id>/`, map `ui/sections/portfolio.ts`). Total **85** (`ui/zones/data/sectionCatalog.json`, counted per group with `node`); 85 loaders are registered in the group files. A
section id with no loader renders `Placeholder`; dynamic sections created by the user render through `DynamicSection` (Board).
Multi-product Knowledge Hub (P3b): the existing `tune/knowledge` section edits the ACTIVE product's knowledge subset through the same form fields (the address
layer writes the subset: see §4-5) and, with 2+ products only, adds `SubsetBadge` chips (hérité / surchargé, back to common via `product.setKnowledge`), the
`DomainsEditor` (weights must total 100, refused by `portfolioGuard`), the `ktLeadMonths` field and the shared `ui/widgets/HubSettings` card
(`portfolio.setHub`: activation, infrastructure, allocation, live conservation check). `portfolio/knowledge-transfer` shows the F29 table (from
`knowledgeTable`), the F31 hub effect by wave and the diagnostics, all computed in `domain/portfolio/{knowledge,ktview}.ts` and read through
`store/knowledgeHooks.ts` (no sum in `ui/`).
**Portfolio stress (P6).** `domain/portfolio/stress.ts` (`portfolioMonteCarlo` / `pfStressJob`): per planned product the single-case draws (`domain/stress/simulate.ts#mcDraws`, factored out of
`runMonteCarlo`, which is unchanged in behaviour) from the stream `productSeed(seed, id, planned)`; with `rho > 0` a Gaussian copula on a shared normal (`stressSeed.ts#commonShock`, `mcSampleT`
reads the triangular shock) keeps each marginal law; the portfolio draw is the sum of the products' net benefits, statistics from `mcStats` (one definition for product and portfolio), risk
reduction = portfolio P10 - sum of the products' P10. `stressFingerprint.ts` marks a run stale; `stressVerdict.ts#pfDecision` feeds the single-case rule `verdictRule` (`domain/verdict/decision.ts`)
with portfolio / wave figures. State: `store/portfolioSimulation.ts` (`pfSimStore`, hooks) and `controllers/stressPortfolio.ts` (chunked run); section `ui/sections/portfolio/stress/`; Decision
reads the verdict for the Portefeuille / Vague scope (`verdict/decision/PortfolioVerdict.tsx`); "Portfolio stress" sheet and report section 7 when a run exists. DEV-PF-STRESS lists the differences.

**Waves, consolidation and display scope (P4).** All figures come from `domain/portfolio` and are read through `store/consolidationHooks.ts`; the UI sums nothing
(rule A8: ESLint `no-restricted-syntax` bans `.reduce(` / `.reduceRight(` in `ui/sections/portfolio/**`, `store/consolidationHooks.ts`, the scope tiles and the wave Gantt; `tests/lint-rules.test.ts`).
- **Memoisation by input identity.** `corePortfolio(pf)` (`domain/portfolio/core.ts`) is the portfolio minus view state (active product, edit and display scope): its identity changes
  only with the common values, products, waves, hub, horizon or start date. `consolidate` (WeakMap on that identity), `consolidationView`, `waveBoard`, `portfolioGantt`, `knowledgeTable`
  (the `hubView` comparison is cached per resolved case) and `useProductRows` all key on it, so switching the product or the scope recomputes nothing, an edit rebuilds only the edited
  product's engine, and a wave move rebuilds none (`tests/domain/portfolio/perf-p4.test.ts`: consolidation view < 30 ms, 20-product edit < 150 ms, measured 4 ms and 25 ms).
- **Display scope (F17).** `Portfolio.displayScope` (`{ kind: 'product' | 'portfolio' | 'wave', id? }`, absent = the active product) is a transient view field like `editScope`: command
  `portfolio.setDisplayScope` (`controllers/displayScope.ts`, `undoable: false`), never saved, never undone, never broadcast (`VIEW_FIELDS`), dropped by `withoutView`; a deleted wave falls
  back to the product (`useDisplayScope`). Decision: not persisted, so a file always reopens on the active product (D-M6) and a shared file cannot open on a stale scope.
  `shell/ScopeSelect.tsx` (the single "Vue" selector: Portefeuille / Vague : X / Produit : Y — picking a product also makes it the edited product; the former separate "Produit" selector is gone; announced by toast; choosing a product makes it active) sits in `ProductBar` (2+ products only).
  `KpiZone` renders `ScopeKpis` (a "Périmètre" tile, labels and tooltips naming the scope) from `scopeHeadline` (`portfolioHeadline.ts`: `groupHeadline` over a set of planned products:
  year table, ETP-weighted velocity / effective automation / glass ceiling, cost reduction by components, payback of the consolidated cumulative cash); the product scope is the unchanged `ProductKpis`.
- **Sections.** `portfolio/waves`: board of columns (waves, then "Non planifié") from `waveBoard`; commands `wave.add/rename/reorder/remove/setStart/setNote/assign`, `product.setOffset`;
  drag and drop (HTML5, state in the section), ArrowLeft / ArrowRight on the focused card and a "Déplacer vers la vague…" select, every move announced; the Produits table's Vague column uses the same
  `wave.assign`. `portfolio/consolidation`: cards, cumulative cash chart (`ChartPanel`, named image + hidden data), by-wave and by-product tables with a totals row, yearly table, diagnostics, from `consolidationView`.
- **Gantt (F18).** `verify/gantt/Waves.tsx` (2+ products, scope Portefeuille / Vague) shows `portfolioGantt`: a bar per wave (earliest product start, KT preparation included, to the latest end of setup /
  adoption ramp) expandable to products with milestones (`engine.milestones()` shifted by wave start + offset); focusable labelled groups. With scope Produit it only adds the calendar offset of the active product.
  One product: nothing is added (legacy Gantt parity untouched).
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
- Multi-product (P4): consolidation view model ~4 ms and a 20-product team edit ~25 ms end to end (all views) on a 20 x 60-month portfolio, budgets 30 ms / 150 ms in `tests/domain/portfolio/perf-p4.test.ts`.
- Size: `dist/index.html` 2.68 MB (about 830 kB gzip) at the last local build; budgets for size, shell, edit, undo and section switches (single case and the six Portefeuille sections on the shipped example) are in `app/perf-budget.json` and checked by `tools/perf.mjs` (CI job `e2e`).

## 11. Portfolio (multi-product) at a glance

Since 20.0.0 a file is a **portfolio**: common values, 1 to 50 products (each with its own entry team, sparse overrides and a Knowledge Hub subset) and waves
(start month, products, per-product offset). The decisions D-M1..D-M12 and the phase notes P1-P6 are in [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md); the
user guide is [GUIDE_MULTI_PRODUIT.md](GUIDE_MULTI_PRODUIT.md). How the pieces connect:

| Piece | Where | Role |
|---|---|---|
| Model (P1) | `domain/portfolio/{types,resolve,validate,overrides,keys}.ts` | `Portfolio` / `Product` / `Wave`; `resolveProduct` = common < hub < whitelisted overrides < knowledge subset < own `teamIn`, memoised per product; `validate` (invariants, `multi-wave` ...) |
| Calculation (P1, P3b) | `timeline`, `series`, `consolidate`, `headline`, `waves`, `knowledge`, `ktview` | one `computeCase` per planned product, shifted onto the calendar (month 0 = wave start + offset; KT setup `ktLeadMonths` earlier) and summed; NPV discounted from portfolio month 1 (D-M4); hub infrastructure allocated to the cent (`allocateCents`) |
| Views (P4) | `consolidationView`, `waveBoard`, `portfolioGantt`, `scopeHeadline`, `corePortfolio` | pure view models memoised on `corePortfolio` (the portfolio without view state); rule A8: no financial `.reduce(` in `ui/` portfolio code (ESLint) |
| Store (P2) | `store/` (`Portfolio` is the source of truth; `doc` = effective case of the active product) and `store/address/` | the ~200 case commands are unchanged; the address layer re-addresses their patches onto team / override / common inside ONE `produceWithPatches`, so history, coalescing and remote patches are unchanged |
| Commands (P2-P6) | `controllers/{product,productOverrides,wave,portfolio}.ts`, `portfolioGuard.dispatchChecked` | every portfolio write is a named, undoable command; a result that breaks `validate` is refused |
| Persistence (P2, P5) | `persistence/{snapshot,excel/portfolio,report/portfolio}`, `snapshots`, `calc package` | `agentcase.portfolio.v1` (a plain single case is still saved as `agentcase.snapshot.v1`, rule F22); seven extra parameter sheets; results sheets per portfolio / wave / product; scoped report; photos carry the portfolio; staleness at product and portfolio level |
| Stress (P6) | `domain/portfolio/stress*.ts`, `store/portfolioSimulation.ts`, `controllers/stressPortfolio.ts` | per-product Monte Carlo (seed XOR hash(id)), global correlation `rho` (Gaussian copula on a shared factor), sum per draw, risk reduction, verdict by `verdictRule` |
| UI (P3-P6) | `ui/shell/{ProductBar,ScopeSelect}`, `ui/sections/portfolio/{products,overrides,knowledge-transfer,waves,consolidation,stress}` | active product, edit scope (all / this product only), display scope; progressive disclosure: with one product nothing is shown |

### Vue agrégée (toutes les sections suivent la Vue)

The top-bar **Vue** (Portefeuille / Vague / Produit) applies to every section, by kind (`ui/zones/data/sectionScope.json`, accessor `ui/zones/sectionScope.ts`; full table in [VUE_AGREGEE.md](VUE_AGREGEE.md)):
`R-conso` and `R-rollup` results follow the Vue, `I-input` sections stay per product but show a read-only aggregated view with "Éditer ce produit", `S-static` and `P-portfolio` ignore it (banner only).

| Piece | Where | Role |
|---|---|---|
| `useViewScope()` | `store/viewScope.ts` | `{ kind, label, multi, productIds (planned, non-archived), excludedIds, waveId?, activeProductId }`, stable reference |
| `ProductViewContext` | `store/productView.ts`, read hooks in `store/hooks.ts` / `portfolioHooks.ts` | inside it `useDoc` / `useCtx` / `useCaseResult` / `useActiveProduct` ... read THAT product's resolved case (`resolveProduct`, memoised) instead of the active one; writes are not redirected, so such a subtree is wrapped in `ui/widgets/ReadOnlyScope` (fieldset disabled + events stopped) |
| `SectionHost` + `useScopedSection(id)` | `ui/zones/` | Produit view or one product: the section untouched (no wrapper, no banner). Vague / Portefeuille on a section that follows the Vue: its registered aggregate (`ui/sections/aggregates/<group>.ts`, lazy), else `fallbacks.tsx` for its kind |
| `ScopeBanner` | `ui/widgets/ScopeBanner.tsx`, rendered by `SectionFrame` | one polite live sentence per kind; `SectionFrame` turns into `EmbeddedFrame` (no h1, zones named by product) inside a `ProductViewContext` |
| `AggregateTable`, `ProductDrill` | `ui/widgets/` | per-product rows with domain-supplied totals and "Éditer ce produit" (`showProduct`, view state, not undoable); lazy collapsible per-product render of the section |
| Domain views | `domain/portfolio/{selectionView,teams,inputSummary}.ts` | `selectionView(pf, consolidate(pf), scope)` = headline, product lines, total line, years, cash chart, exclusions of a Portefeuille / Vague; `aggregateTeams`; `inputSummary`. Same rule A8: no `.reduce` in the Vue agrégée UI files (ESLint, `Aggregate*.tsx` and `aggregate/` folders included) |

Compatibility is proven, not assumed: a one-product, one-wave portfolio built from each of the 107 fixtures gives the same numbers as the case (A1/A9, `tests/store/portfolio-a1.test.ts`),
`ui-parity` and the legacy `parallel-run` stay at zero divergences, and `tests/store/portfolio-example.test.ts` opens the shipped example (`docs/examples/AgentCase_Portfolio_Example.json`,
generated by `app/scripts/portfolio-example.ts`) through the real open path. Schema tags, the autosave database `agentcase-v19` and the BroadcastChannel name are deliberately unchanged in 20.0.0 so no autosave is orphaned.

## 12. Known gaps

The authoritative list is [MIGRATION_PLAN.md §15](MIGRATION_PLAN.md). Architecture-relevant items:

- Browser checks exist (`npm run e2e`, `npm run perf`, `npm run a11y`, `npm run ui-parity`, `npm run parallel-run`; CI job `e2e`); the differential run on real customer files needs files supplied by the user.
- Out of scope (removed from the spec): the ADVANCED lock and its unlock gestures, and tag/MVP editing. Being ported: Gantt keyboard editing. The layout boards have a read-only in-page live preview (`domain/nav/preview.ts`), not the legacy iframe.
- Golden-vs-AME comparison, AME reference capture and per-snapshot Excel export are not ported; Agent Catalog capacity and loop external % cannot be imported (catalogues are immutable).
- Legacy-only engine `TE-10b` (legacy-mode monthly derivation) fires on 2 supervision fixtures in the legacy and is reproduced only in the verification section.
- Multi-product, left out on purpose or not yet built: a **portfolio scenarios table** (the six scenarios and the sensitivity stay per product); **dependencies and capacity between waves**
  (product B after product A, a shared transformation team); **shared teams** across products (a person on two products); **per-draw horizon truncation** in the portfolio stress
  (products are simulated on their own horizon; the portfolio net is the sum, not cut at the calendar horizon); **"apply to all"** for the fields of the Knowledge subset (only "back to common" exists);
  rates, model and coefficients per product (common only, D-M3); set-up shared at portfolio level (D-M5, per product); knowledge reuse between products (`reusePct`, D-M11); a full correlation matrix (global `rho` only);
  item-level scope overrides (whole key only, D-M2); portfolio charts as images in the results workbook.
- Excel cross-version note: a parameters workbook exported by 20.0.0 from a real portfolio carries seven extra sheets that a 19.x build ignores (it reads only the common case); a 19.x workbook imports into 20.0.0 as a case on the active product. An import does not re-fit the automation potential (the workbook states the stored values; the next open re-fits).
- Opening a 20.0.0 portfolio file (`agentcase.portfolio.v1`) in a 19.x build is not supported; a plain single case is still saved as `agentcase.snapshot.v1` and stays readable by 19.x.
- `npm run release` produces `app/dist/AgentCase_v20_0_EN.html`; `APP_VERSION` is `20.0.0`.

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
| `TIME` | Time Engine L0–L3, canonical payback/NPV, calculation package | `domain/time/`, `domain/canonical.ts` | package + staleness banner ported (§5) |
| `AUTOSAVE` (IndexedDB) | per-tab sessions | `persistence/autosave.ts`, `idb.ts` | stores the undo history too |
| `saveHtmlSnapshot` | clones the rendered DOM, bakes `applySnapshotState(...)` | `html/embed.ts` | embeds JSON; `#root` emptied, no DOM state serialised |
| `exportParams/importParams` | Excel | `excel/params/` | typed, size-limited, one undoable batch |
| `escHtml`/`escJs`/`safeId`/`cleanText` | output escaping helpers | React escaping; `safeId`/`cleanText` kept for workbook import | no string-built HTML |
| `window.AgentCaseArch` | QA surface | none; tests import modules directly | |
