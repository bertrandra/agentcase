# Aggregated view: every section follows the view of the top bar

> Status: **phase V0 delivered** (foundation + classification + 2 exemplars). The following phases fill in the aggregates group by group.
> User decision: "*ALL sections are calculated on the selection of the View selector of the top bar: Portfolio, one Wave or one Product*".
>
> (File name kept for links: *vue agrégée* = aggregated view. Translated from the French original, which stays in the git history.)

## 1. Principle

1. **Result sections**: they follow the View. Portfolio / Wave / Unit = consolidated figures from the domain (`consolidate`, `groupOf`, `scopeHeadline`, `selectionView`, `portfolioGantt`...); Product = today's behaviour, unchanged.
2. **Input sections**: with the Portfolio or a Wave in view, they show at the top a **read-only aggregated view** of the selection (one row per product, button **"Edit this product"**: controller `showProduct`, the View (**Show**) becomes that product and so does **Change**), then **the section itself, editable in place** (`InPlaceEdit`), bound to the **"Change"** choice of the top bar: one product (that product's section; its edits are overrides) or **All products** (the section on the **shared values**; its edits go to the common values; the products that keep their own value are named field by field with "Back to shared"). The entry team (and, in Knowledge hub, the domains and the preparation) stays per product: with All products, a hint only. See § 2.1.
3. **The 91 sections are classified** (§ 4). No new financial formula in `ui/` (rule A8 extended: no `.reduce` in the widgets, hooks and aggregates of the aggregated view); no "synthetic aggregated case" (wrong for the glass ceiling, the overrides, the wave offsets).
4. **A single product: nothing changes** (no banner, no DOM wrapper in `SectionHost`). The Product mode of the sections stays byte-for-byte identical.

## 2. Mechanism as built

| Piece | Where | Role |
|---|---|---|
| Kind of each section | `ui/zones/data/sectionScope.json` + `ui/zones/sectionScope.ts` (`sectionKind`, `followsView`) | one entry per id (91); the test `tests/ui/section-scope.test.ts` requires exactly the catalogue ids |
| `useViewScope()` | `store/viewScope.ts` | `{ kind: 'product'|'wave'|'unit'|'portfolio', label, multi, productIds[] (planned, not archived), excludedIds[], waveId?, unitId?, activeProductId, activeProductName }` (the selection is `scopeMembers`, `domain/portfolio/scopeGroup.ts`), stable reference; inside a `ProductViewContext` the View is that product |
| `ProductViewContext` | `store/productView.ts` (+ `ProductViewProvider`, `productDocOf`) | read-only view of another product: `useDoc`, `useCtx`, `useCaseResult`, `useSimulation`, `useActiveProduct`, `useActiveProductId`, `useFieldState`, `useSubsetField` read that product's resolved case instead of the active product's. Writes are not redirected |
| `ReadOnlyScope` | `ui/widgets/ReadOnlyScope.tsx` | `fieldset disabled` + capture and stop of click / keyboard / change / input / submit / drop events + read-only message; `inert` as an option |
| `ScopeBanner` | `ui/widgets/ScopeBanner.tsx`, rendered by `SectionFrame` | one sentence per kind, `aria-live="polite"` region, nothing with a single product nor in a per-product render |
| `AggregateTable` | `ui/widgets/AggregateTable.tsx` | one row per product, columns already computed by the domain, **total row supplied by the domain** (never summed in the UI), "Edit this product" button (`showProduct` + announcement) |
| `ProductDrill` | `ui/widgets/ProductDrill.tsx` | collapsible, lazy, read-only render of the section's component for each product (`ProductViewContext`); `SectionFrame` becomes `EmbeddedFrame` there (no h1, zones named by product) |
| `InPlaceEdit` | `ui/zones/InPlaceEdit.tsx`, rendered by `SectionHost` below the aggregate of an `I-input` section (Portfolio / Wave) | region **"Changing …"** (h2: "Changing all products (shared values)" or "Changing X only"): banner, then the section's component under `ProductViewContext` = active product (Change = one product) or `COMMON_VIEW` (All products); `EmbeddedFrame` at h3 (`EmbedLevel`); `team-in` with All products: hint only |
| `COMMON_VIEW` / `commonEditDoc` | `store/productView.ts`, `store/commonEdit.ts`, `domain/portfolio/resolve.ts#resolveCommon` | pseudo-product of the **common values**: `useDoc` / `useCtx` / `useCaseResult` read the common case (common + hub layer, no override nor subset, team of the active product), memoised |
| `editsCommon(pf)` | `store/commonEdit.ts`, called by `runCommands` | true with ≥ 2 products, Edit = All products and a Portfolio / Wave View: a case command runs on the common case and the address layer writes **everything** to the common values (internal scope `'common'`), the team to the active product; one undoable step |
| `KeepersNotice` / `FieldKeepers` | `ui/widgets/KeepersNotice.tsx` (+ `OverrideBadge`, `SubsetBadge`, fields of `fields.tsx`) | in the common editor only: "N products override this: A, B — they keep their value" and "Back to shared: X" (`resetToCommon`: override or subset field); nothing elsewhere |
| `useScopedSection(id)` | `ui/zones/useScopedSection.ts` | product / single product / `S-static` / `P-portfolio`: the section as is; otherwise the registered aggregate, otherwise the kind's **generic fallback** (`ui/zones/fallbacks.tsx`) |
| Aggregate registry | `ui/sections/aggregates/index.ts` + `aggregates/<group>.ts` (15 files, one per group) | id → lazy loader, like the section loaders; `SectionHost` uses them for Portfolio / Wave |
| Domain views | `domain/portfolio/{selectionView,teams,inputSummary}.ts` | `selectionView` (consolidated figures of a selection), `aggregateTeams` (summed teams), `inputSummary` (counts per product) |
| Hooks | `store/selectionHooks.ts` | `useSelectionView`, `useInputSummary`, `useTeamAggregate` |

Generic fallbacks per kind (Portfolio / Wave, section without an aggregate):

- `R-rollup`: `AggregateTable` of the key figures per product (`SelectionRow`, total = the domain's row) + `ProductDrill`.
- `I-input`: `AggregateTable` of the inputs per product (FTE, artefacts, overrides, hub state; FTE total = `aggregateTeams`) + "Edit this product"; in-place editing is added below, as for a registered aggregate.

### 2.1 In-place editing ("Show" and "Change" lists)

- Top bar: two native lists, **👁 Show** (`aria-label="Show"`: **Portfolio**, group "Waves" = "*wave name*", group "Units" = the unit tree indented by depth with the level in each option's accessible name, then "Unassigned" (B10b), group "Products" = "*name* (*wave*)", "*name* (unscheduled)", suffix "(archived)") and **✏️ Change** (`aria-label="Change"`: **All products** then "*name*" per product; with a Wave or a Unit in view, its products first (group "Wave: X" / "Unit: X"), then "Other products" — the edited product may be outside it). Icons `aria-hidden`, one-line tooltips ("What you look at: …", "Where your changes go: …"). No "Editing:" chip.
- **Rule "Change follows Show"** (`controllers/displayScope.ts`): `showProduct` (Show = one product, or "Edit this product") = `setActiveProduct` + view `product` + scope `product`; `setDisplayScope` Portfolio / Wave sets the scope back to `all`. Choosing a product in **Change** = `setActiveProduct` + scope `product` (`chooseEditTarget`, not undoable); Show does not change (in a Product view, the shown product follows the edited product). Announcements: "Showing X", "Changing X" / "Changing all products".
- The banner of the input sections says "Changing: all products (shared values)" in Portfolio / Wave with All products, otherwise "Changing: product X".
- Product view + All products: historical behaviour (a key already overridden by the product stays written in its override). Only the Portfolio / Wave views write the common values directly.
- The result sections (R-*) and P-* do not change.
- `R-conso` without a registered aggregate: `ProductDrill` + explicit note "Consolidated view coming" (tracked in § 5).

### 2.2 The Unit scope (phase B10b, docs/SPEC_BPMN.md § 21 F-B81)

- **What it is.** Any node of the organisation's unit tree (business unit, department, sub-department… at any depth) or **Unassigned** is a View. It
  holds the products the unit owns directly or through its sub-units (`productsOfUnit`, one owning unit per product, D-B39); waves stay an
  independent grouping (a wave can span units).
- **One path for "a set of products".** `domain/portfolio/scopeGroup.ts` is the single owner of a selection: `scopeMembers(pf, scope)` (label,
  planned products, products left out) and `groupOf(consolidated, scope)` (the consolidation's own product views and their summed series). The
  Portfolio, a Wave and a Unit all go through it, so every section's aggregate works at a unit with no unit-specific code: the classification of
  § 4 is unchanged and each kind behaves at a unit as at a wave (`R-conso` = consolidated figures of the unit; `R-rollup` = one line per product of
  the unit; `I-input` = the read-only synthesis of the unit's products, then in-place editing; `S-static` / `P-portfolio` = banner only). A unit that
  owns every product gives the Portfolio's figures exactly.
- **Banner and editing.** "Calculated on: Unit: Payments (2 planned products)"; "Changing: all products (shared values)" with Change = All
  products (common editing applies to a Unit view as to a Wave view).
- **Empty state.** A Wave or a Unit with no planned product shows the empty state in every section that follows the View (`SectionFrame` renders
  `ui/zones/EmptyScope.tsx` in place of its zones: the reason and where to fix it; the section keeps its title and banner), not empty tables; an
  input section keeps its in-place editor below.
- **Not available at this scope.** The Monte Carlo distribution and the probabilistic verdict of a unit come with the strategy per unit (D-B40,
  phase B10d): 🎲 Monte Carlo, 🧭 Decision and 📋 Results say "not available at the unit scope yet" (`ui/widgets/ScopeUnavailable.tsx`) next to the
  unit's consolidated figures.
- **Plan.** 📅 Plan (Gantt, WBS, OBS, RAM, histogram) is restricted to the unit's planned products; the wave Gantt lists the waves that hold them,
  opened on them.

### 2.3 The Services tab (phase B10c, docs/SPEC_BPMN.md § 21 F-B82)

- 🏢 Organisation stays `S-static` (the same screen at every View); its **Services** tab follows the View: the products it shows are those of
  `useViewScope()` (the edited product in a Product view, the planned products of a Wave, a Unit or the Portfolio). The figures are the domain's
  (`servicesView`, `serviceLoad`), read per product, never re-aggregated: a product's FTE and cost of a service are those of its own case; the load
  lays the products on the portfolio calendar (a Product view: the product's own months); the cost table adds the products outside the View and the
  part no product holds so that each line adds up to its cost.

## 3. Recipe: adding the aggregate of a section (10 lines)

1. Find the id and its kind in `sectionScope.json` (change it only if the classification is wrong, and then update this document).
2. Write the missing **pure** function in `domain/portfolio/` (never a sum in the UI) with its test (1e-9 against `consolidate` / `computeCase`); export it through `domain/portfolio/index.ts`.
3. Add, if needed, a hook in `store/selectionHooks.ts` (`useViewScope()` gives `productIds`, `kind`, `label`).
4. Create `ui/sections/<group>/<section>/Aggregate.tsx` (`default` export), ≤ 150 lines: `<SectionFrame title=… result=…/>` with `AggregateTable` (domain totals); rule A8 applies to it automatically (`Aggregate*.tsx` or `aggregate/` folder).
5. For a per-product render: `<ProductDrill Section={…} productIds={vs.productIds} />` (the component runs under `ProductViewContext`, read-only).
6. Register **one line** in `ui/sections/aggregates/<group>.ts`: `'id': () => import('../<group>/<section>/Aggregate'),`.
7. For a section that is already view-aware, register its own component (examples: `decision`, `gantt`).
8. RTL test (real store, `threeProducts`; `unitTreeThree` for a Unit): Portfolio, Wave, Unit and Product equal to the domain within 1e-9; unplanned product excluded with the warning; single product unchanged.
9. Audit: `node ../tools/a11y.mjs --fixtures pf-three-products --sections "<label>"` (Portfolio and Wave are audited; the report goes to `test-results/a11y/report.json`).
10. Set the section's state to DONE in the table of § 4 and remove it from the tracking of § 5.

## 4. Classification of the 91 sections

Total: **91 = 79 case sections + 6 of the Portfolio group + 6 app sections, 🎨 Brand & theme, 🧩 Process (BPMN), 📋 Programme, 🏢 Organisation, 🔎 Audit and 🧭 Who does what** (no legacy equivalent) (the group has 6 sections in the catalogue, not 7: products, overrides, knowledge transfer, waves, consolidation, portfolio stress).

| Kind | Count | Meaning |
|---|---|---|
| `R-conso` | 15 | result with a natural consolidated form (sums and series of `domain/portfolio`) |
| `R-rollup` | 28 | control or per-case logic that does not add up: summary table per product + detail of the product's own render |
| `I-input` | 21 | per-product input: read-only aggregated synthesis, one row per product, "Edit this product", then the section editable in place according to "Change" (§ 2.1) |
| `S-static` | 21 | reference, documentation, common settings, management: independent of the view (banner "Independent of the view") |
| `P-portfolio` | 6 | section of the Portfolio group, already at portfolio level (banner "Portfolio level") |

State legend: **DONE** (built in V0), **NATIVE** (the section already follows the View; it is registered as its own aggregate), **TO DO** (the kind's generic fallback in the meantime).

| id | Group | Label | Kind | Planned aggregated content / reason | Domain source | State |
|---|---|---|---|---|---|---|
| `home` | frame | 🏠 Welcome | `S-static` | Banner only. Home page: navigation only, computes nothing | — | DONE (banner) |
| `engagement-context` | frame | 🧭 Engagement context | `I-input` | MSC/MSI/STA contractual frame per product (inherited/overridden) | `inputSummary` + `values.engagementCtx` of the resolved case | DONE |
| `engage` | frame | 🤝 Engage | `I-input` | Durations of the 4 onboarding steps and end of onboarding per product | resolved case of each product (`dom.values`) | DONE |
| `transform-params` | frame | 🏛️ Industry / regulatory profile | `I-input` | Industry/regulatory profile and ticked standards per product | `selectedNorms`, `values.*` of the resolved case | DONE |
| `audit` | frame | 🔎 Audit | `I-input` | Per product (F-B30): audit status, in-scope activities audited (count and share of effort), tooling gaps and overlaps, pain points, calibrations; the tooling map across the products (BPMN phase B7) | `scopeAudit`: `BPMN` of the resolved case | DONE |
| `params` | scope | 🎯 Automation & Glass ceiling | `I-input` | Target potential and glass ceiling (forced or computed) per product | `model.eff`, `model.ceiling`, `forceGlassCeiling` | DONE |
| `scurve` | scope | 📊 S-curve — adoption ramp | `I-input` | Y1/Y2/Y3 adoption ramp per product | `scurve` of the resolved case | DONE |
| `scope-sel` | scope | 🎯 Scope | `I-input` | Number of SDLC / regulatory artefacts selected per product | `inputSummary` (`artefacts`, `regArtefacts`) | DONE |
| `phase-scope` | scope | 🎯 Phase scope | `I-input` | Phases switched off per product | `phaseOff` of the resolved case | DONE |
| `process` | scope | 🧩 Process (BPMN) | `I-input` | Per product: common or own process, activities, marked in scope, not in the default process, actors (BPMN phase B4) | `scopeProcess`: `BPMN` of the resolved case | DONE |
| `programme` | scope | 📋 Programme | `I-input` | Per product (BPMN B9e): activities enabled, opt-in activities switched on, cost lines not spread, programme cost of the euro result by year and in total, the pilot outside it | `scopeProgramme`: the programme cost profile of the resolved case | DONE |
| `lc-weighting` | scope | 📊 Product status lifecycle weighting | `I-input` | Position of the product in the lifecycle | `lifecycleUse`, `lifecyclePos` | DONE |
| `team-in` | baseline | Input team | `I-input` | DONE (exemplar): FTE per product, aggregated by skill, grade, location and crossed; "Edit this product" | `aggregateTeams(pf, productIds)` | DONE |
| `ratecard` | baseline | Rate Card | `S-static` | Banner only. Day rates: common values (D-M3, key `RATE`), identical for all products | — | DONE (banner) |
| `loc-strat` | baseline | 🌍 Location strategy | `I-input` | Target split by location, per product | `targetLocPct` of the resolved case | DONE |
| `fte-vfte` | verify | FTE / vFTE | `R-conso` | Human FTE / agent vFTE trajectory by month and by calendar year (curves of the selection + one agent curve per product), table per product (entry FTE, human, agent, total effort, reduction, freed capacity) and selection row | `series.humanFte` / `series.agentVfte` of `consolidate` (selection); `fteSummary` per product; `domain/portfolio/aggVerifyFte.ts` (`fteVfteAgg`) | DONE (Portfolio and Wave tested) |
| `vfte-ov` | verify | vFTE Overview | `R-rollup` | End-of-horizon composition per product (human, agent, total effort kept, automation, FTE freed) and artefact counts (scope, VA); selection row = domain sums; ProductDrill | `periodRows`, `valueRows` per product; `aggVerifyFte.ts` (`vfteOvTable`) | DONE (Portfolio and Wave tested) |
| `team-out` | verify | Target team | `R-conso` | Aggregated target team: pools (dev, supervision, run, setup) and summed annual costs, split by location, table per product (net reduction recomputed on the sums) | `targetTeam`, `groupRows`, `locRows` per product; `aggVerifyTeam.ts` (`targetTeamAgg`) | DONE (Portfolio and Wave tested) |
| `tobe-team` | verify | 👥 TO-BE team by skill | `R-conso` | Residual human FTE and agent vFTE by skill summed over the selection for the chosen year, table per product reconciled with the aggregated model | `tobeComposition` per product; `aggVerifyTeam.ts` (`tobeTeamAgg`) | DONE (Portfolio and Wave tested) |
| `maturity-map` | tune | 📐 Maturity levels (L1–L4) | `I-input` | DONE: L1-L4 thresholds (adoption and agent share) per product, level reached, min/mean/max of each threshold (`aggMaturityMap`) | `MATURITY_MAP` | DONE |
| `readiness` | tune | 🧭 AI Readiness | `R-rollup` | DONE: index, level, weakest dimension and Human Readiness per product; summary row = mean of the assessed products; detail per product (`aggReadiness`) | `tune` readiness of each product's resolved case (drill) | DONE |
| `lifecycle-edit` | tune | 📊 Status & phase weight | `I-input` | DONE: lifecycle axis, position, profile, automation posture per status, modified cells per product; min/mean/max (`aggLifecycle`) | `statusLifecycle` | DONE |
| `token-econ` | tune | 💸 Token economics | `R-rollup` | DONE: agent runs, tokens and cost per product (end of horizon and whole horizon); total = consolidated `token` series of the selection; common price catalogue; detail per product (`aggTokens`) | `series.token` + usage per product; common inputs (`TOKEN_MODELS`) | DONE |
| `knowledge` | tune | 🧠 Knowledge hub | `I-input` | DONE: hub subset per product (activation, answer score, initial→target CC, curation, setup base, domains, KT lead time), totals `knowledgeTotals` (`aggKnowledge`) | `inputSummary.hub`, `knowledgeRow` | DONE |
| `run-sizing` | tune | 🤖 Run-team sizing | `I-input` | DONE: sizing policy (mode, floor, ops load, supervision ceiling/factor) and run team at the end of the horizon per product; min/mean/max (`aggRunSizing`) | `dom.values` of the resolved case | DONE |
| `opmodel` | tune | 🧩 Operating model | `R-rollup` | DONE: pods, residual team, run team and V7 conservation check per product at Y1 and at the end of the horizon; total = sum of the teams; detail per product (`aggOpModel`) | `domain/tune` opmodel per product | DONE |
| `phase-art` | verify | Phase / Artifact detail | `R-rollup` | Phases and artefacts selected per product, tightest supervision margin, floor violations (CC-SUP-01); totals = counts only; ProductDrill | `phaseArtRows`, `supMatrix` per product; `aggVerifyAgents.ts` (`phaseArtTable`) | DONE (Portfolio and Wave tested) |
| `agent-dir` | verify | Agent Directory | `R-rollup` | Agents by authorisation level, active roles, loop settings per product; row = union (each agent counted once); ProductDrill | `agentDirectory`, `rolesForPhase`, `loopInternalTokenCost` per product; `aggVerifyAgents.ts` (`agentDirTable`) | DONE (Portfolio and Wave tested) |
| `agent-detail` | verify | 🤖 Agent details | `R-rollup` | Agentic team: run FTE, supervision pool, rates, artefacts by authorisation level per product; FTE and counts summed; ProductDrill | `agentDetail` per product; `aggVerifyAgents.ts` (`agentDetailTable`) | DONE (Portfolio and Wave tested) |
| `agent-usage` | verify | 📊 Agent usage | `R-conso` | Runs, tokens, cost per product; token / infra cost by calendar year (consolidated series); agent effort by phase and by authorisation level, summed | `series.token`, `series.infra`, `agentUsage`, `artifactRuns`; `aggVerifyAgents.ts` (`usageAgg`) | DONE (Portfolio and Wave tested) |
| `setup` | tune | Agentic Setup | `I-input` | DONE: four setup lines, total and duration per product; total = domain sum; min/mean/max (`aggSetup`) | `domain/tuneB/setup` per product | DONE |
| `assumptions` | defend | 📒 Assumptions register | `R-rollup` | Assumptions moved away from the default, not validated by the client, measured impact, per product; common validation statuses | `domain/pdc/assumptions` per product | DONE |
| `montecarlo` | stress | 🎲 Monte Carlo | `R-rollup` | Portfolio or Wave: P10/P50/P90, P(net<0), CVaR, diversification and the histogram of the selection's draws (the wave's products added draw by draw, each cut at the portfolio horizon), P10/P50/P90 per product, from the portfolio stress if it has run, otherwise an invitation to run it | `ProductStress` of `portfolioMonteCarlo` (`store/portfolioSimulation`) | DONE |
| `model-stochastic` | model-engine | 📊 Stochastic layer (P4) | `R-rollup` | P50 and seed per product; link to Portfolio stress | `domain/model/modelState`, `portfolioMonteCarlo` | DONE |
| `model-convergence` | model-engine | 🔁 Loop convergence | `R-rollup` | Bounded/non-converged loops per product | `domain/model/lce` per product | DONE |
| `model-supervision` | model-engine | 🧑‍✈️ Supervision (P3) | `R-rollup` | Supervision mode and cost per product | `domain/model/supView` | DONE |
| `exec` | verify | Execution Timeline | `R-rollup` | Start, end of ramp-up, first agent vFTE of each product on the portfolio calendar and sprint velocity; row = span of the programme; ProductDrill | `portfolioGantt` (milestones), `execView`; `aggVerifyPerf.ts` (`execTable`) | DONE (Portfolio and Wave tested) |
| `productivity` | verify | Productivity | `R-rollup` | Throughput per engineer and per month (AS-IS, end of horizon, factor) per product; row = mean weighted by the entry team, supplied by the domain; ProductDrill | `productivityView`; `aggVerifyPerf.ts` (`productivityTable`) | DONE (Portfolio and Wave tested) |
| `velocity` | verify | Velocity | `R-rollup` | Sprint velocity (AS-IS, Y1, Y2, end), delivery lead time per product; row = `weightedVelocity`; ProductDrill | `velocityView`, `weightedVelocity`; `aggVerifyPerf.ts` (`velocityTable`) | DONE (Portfolio and Wave tested) |
| `quality` | verify | Quality | `R-rollup` | Quality indicators AS-IS → end of horizon per product (not additive), overridden anchors; ProductDrill (inputs disabled) | `qualityAnchorView`; `aggVerifyPerf.ts` (`qualityTable`) | DONE (Portfolio and Wave tested) |
| `run` | economics | Agentic Run | `R-conso` | Consolidated running cost by year and by month (run team, tokens, infrastructure, Knowledge Hub), one row per product + total | `consolidate().series` (`run`, `token`, `infra`, `khCost`) and `headline.years`; the fine team/agents split per product needs a domain view to be added | DONE |
| `annual` | economics | Annual summary | `R-conso` | Year-by-year table by calendar year of the portfolio / wave: savings, cost, setup, net, human FTE and vFTE at year end | `portfolioHeadline`/`waveHeadline` (`years`, `fte`), `series.humanFte`/`agentVfte` via `byYear` | DONE |
| `monthly` | economics | Monthly detail | `R-conso` | Calendar monthly detail: savings, cost, setup, net, cumulative cash, FTE/vFTE, optionally per product | `consolidate().series` + `summary.cum` (`selectionView.chart`) | DONE |
| `monthly-playback` | present | 🎬 Monthly Playback | `R-conso` | Monthly playback of the consolidated trajectory (FTE, cost, savings); velocity and cost per point weighted | `consolidate().series`, `weightedVelocity`; cost per point: domain view to be added | DONE |
| `compliance` | verify | Compliance | `R-rollup` | Compliance coverage per product | `verifyB` per product | TO DO |
| `financial` | economics | 💳 Financial | `R-conso` | DONE (exemplar): ROI/payback/NPV/net cards, cumulative cash, table per product, flows by calendar year, excluded products flagged | `selectionView` ← `consolidate`, `scopeHeadline`, `consolidationView` | DONE |
| `model-flow` | model-engine | ⏱️ Flow & value (P5) | `R-rollup` | Cycle time (Little) and time-to-market NPV per product | `domain/model/flow` per product | DONE |
| `gantt` | verify | 📅 Gantt / Timeline | `R-conso` | NATIVE: Gantt by wave with expandable products (`Waves.tsx`); registered as an aggregate | `portfolioGantt` ← `consolidate` | NATIVE |
| `board` | configure | 📊 Board | `S-static` | Banner only. Configuration of the dynamic sections: common | — | DONE (banner) |
| `factory-model` | factory | 🏭 Factory Model | `S-static` | Banner only. Factory meta-model: common data outside the whitelist (AMBIGUOUS, see § Ambiguities) | — | DONE (banner) |
| `release-pipeline` | factory | 🚀 Release Pipeline | `S-static` | Banner only. Same: common data, draft | — | DONE (banner) |
| `engineering` | factory | ⚙️ Engineering | `S-static` | Banner only. Same: counters entered, common | — | DONE (banner) |
| `factory-timeline` | factory | 📅 Factory Timeline | `S-static` | Banner only. Same: calendar of common events | — | DONE (banner) |
| `commercial` | present | 💼 Commercial model | `R-rollup` | Commercial model per product (non-linear gain sharing: no sum) | `domain/pdc/commercial` per product | DONE |
| `kpi` | verify | KPI Scorecard | `R-conso` | Consolidated financial KPIs (cards from `portfolioHeadline`), weighted before / after capability KPIs, table per product (FTE, run cost, automation, ceiling, velocity, test coverage, lead time) | `scopeHeadline`, `weightedAutomation`, `weightedVelocity`; `aggVerifyKpi.ts` (`kpiAgg`) | DONE (Portfolio and Wave tested) |
| `asis-tobe` | verify | AS-IS vs TO-BE | `R-conso` | Consolidated before / after: FTE, baseline cost vs TO-BE cost, setup, weighted automation and ceiling; table per product | `headline.fte`, `costReduction` (`portfolioCostReduction`); `aggVerifyKpi.ts` (`asisTobeAgg`) | DONE (Portfolio and Wave tested) |
| `sources` | refshare | Sources | `S-static` | Banner only. Documentation: sources and references | — | DONE (banner) |
| `results` | verdict | 📋 Results | `R-conso` | Verdict of the selection, key figures, uncertainty band (portfolio distribution), breakdown of the savings, team shift | `portfolioHeadline`, `pfDecision`/`groupDecision` (portfolio stress), `headline.fte`; origin of the savings: domain view to be added | DONE |
| `story-summary` | present | 📖 The story so far | `R-conso` | AS-IS → TO-BE story of the selection: team, cost, delivery; confidence as a table per product | `headline.fte`, `costReduction`, `velocityPct`, `eff`, `ceiling` | DONE |
| `strategies` | verdict | 🏆 Strategy comparison | `R-rollup` | 7 strategies: recommended strategy, ROI and TCO per product | `domain/verdict` strategies per product | DONE |
| `arch-layers` | refshare | 🏛️ Architecture — Layers | `S-static` | Banner only. Architecture documentation, content rewritten for the TypeScript + React build (DEV-ARCH-CONTENT); independent of the view | — | DONE (banner) |
| `arch-content` | refshare | 🏛️ Architecture — Layers content | `S-static` | Banner only. Architecture documentation, content rewritten for the TypeScript + React build (DEV-ARCH-CONTENT); independent of the view | — | DONE (banner) |
| `eligibility` | tune | 🎯 Eligibility & Abaques | `R-rollup` | DONE: go / conditional / no-go gate, prerequisites, code size, nature, profile, verification tax per product; row = count of the verdicts; detail per product (`aggEligibility`) | `domain/tune` eligibility per product | DONE |
| `maturity` | tune | 📐 Maturity & Measurement | `I-input` | DONE: SDD/tooling maturity, coaching curve and Y1 cost per product; Y1 coaching total; min/mean/max (`aggMaturity`) | `dom.values` of the resolved case | DONE |
| `program` | tune | 🧭 Program & Completeness | `I-input` | DONE: pilot, internal capacity, multi-pod overhead per product; pilot and capacity totals; min/mean/max (`aggProgram`) | `dom.values` of the resolved case | DONE |
| `scenarios` | stress | 🔀 Scenarios | `R-rollup` | Portfolio scenarios table (6 scenarios summed on the calendar: setup, savings, net, NPV, ROI, payback; breakdown by product, net and NPV, with the domain's total line), then product × 6 scenarios over each product's own horizon | `portfolioScenarios` (`aggScenarios.ts`, consolidation kernel), `scenarioByProduct` | DONE |
| `compare` | stress | 3-way Comparison | `R-rollup` | Gap to the reference snapshot per product | `domain/stress` compare, common snapshots | DONE |
| `sensitivity` | stress | Sensitivity | `R-rollup` | Portfolio sensitivity (tornado: each driver moved by the same relative step on every product, summed on the calendar; net and NPV at −step / +step, swing, breakdown by product), then the most sensitive parameter and amplitude per product | `portfolioSensitivity` (consolidation kernel), `domain/stress` sensitivity per product | DONE |
| `decision` | verdict | 🧭 Decision Intelligence | `R-conso` | NATIVE: verdict of the distribution of the portfolio / the wave (`PortfolioVerdict`); registered as an aggregate | `pfDecision`, `groupDecision`, `store/portfolioSimulation` | NATIVE |
| `model-evidence` | model-engine | 📋 Evidence ledger (P6) | `R-rollup` | Confidence grade A-D and provenance per product | `domain/model/evidence` per product | DONE |
| `verif` | defend | 🔍 Logic verification | `R-rollup` | Logic checks: number of failures per product (16 checks, 67 convergence rows); overall status = worst | `domain/pdc/verifChecks`, `verifConvergence`, `verifProvenance`, `verifSensi` | DONE |
| `model-verification` | model-engine | 🛡️ Verification tax (P2) | `R-rollup` | Verification tax V per product | `domain/model/vtax`, `evt` | DONE |
| `risk` | tune | 🛡️ Risk & Compliance | `I-input` | Risk register, AI Act tier and risk premium per product | `dom.values` of the resolved case | TO DO |
| `reference` | refshare | 🗺️ Reference Map | `S-static` | Banner only. Reference map of the delivery model | — | DONE (banner) |
| `deps` | refshare | 🔗 Section Dependencies | `S-static` | Banner only. Dependency matrix between sections (static) | — | DONE (banner) |
| `datamodel` | refshare | 🗄️ Data Model | `S-static` | Banner only. Data model of the application (catalogue, state registry) | — | DONE (banner) |
| `calcengine` | refshare | ⚙️ Calculation Engine | `S-static` | Banner only. Documentation of the calculation engine | — | DONE (banner) |
| `glossary` | refshare | 📖 Delivery-model glossary | `S-static` | Banner only. Glossary | — | DONE (banner) |
| `io` | refshare | 📥 Import / Export | `S-static` | Banner only. Import/export and snapshot library; the choice of the export scope already has its own selector (`ReportPanel`) | — | DONE (banner) |
| `sessions` | refshare | 🗂️ Session manager | `S-static` | Banner only. Autosave recovery: independent of the case | — | DONE (banner) |
| `duediligence` | defend | 🧾 Due diligence | `R-rollup` | Items to confirm and embedded coefficients: counts and impact per product; common annotations | `domain/dd` per product | DONE |
| `personas` | configure | 👥 Persona management | `S-static` | Banner only. Persona management: common | — | DONE (banner) |
| `brand-theme` | configure | 🎨 Brand & theme | `S-static` | Banner only. Theme library and client logo: common to the file (keys `THEMES`, `ACTIVE_THEME`, `CUSTOMER_LOGO`) | — | DONE (banner) |
| `organisation` | frame | 🏢 Organisation | `S-static` | Banner only. Units of the shown case's process document, teams derived from every product's entry team and the shared lines (BPMN B6b) | — | DONE (banner) |
| `who-does-what` | scope | 🧭 Who does what | `S-static` | Banner only. RACI of the shown case's process document, staffing checked for every product (BPMN B6b) | — | DONE (banner) |
| `products` | portfolio | 📦 Products | `P-portfolio` | Banner only. Table of the products (already all products) | — | DONE (banner) |
| `overrides` | portfolio | 🧬 Overrides | `P-portfolio` | Banner only. Overrides per product | — | DONE (banner) |
| `knowledge-transfer` | portfolio | 🔁 Knowledge transfer | `P-portfolio` | Banner only. F29 table and effect of the hub per wave | — | DONE (banner) |
| `waves` | portfolio | 🌊 Waves | `P-portfolio` | Banner only. Wave board | — | DONE (banner) |
| `consolidation` | portfolio | 📈 Consolidation | `P-portfolio` | Banner only. Consolidated trajectory (source of `selectionView`) | — | DONE (banner) |
| `portfolio-stress` | portfolio | 🎲 Portfolio stress | `P-portfolio` | Banner only. Aggregated Monte Carlo of the planned products | — | DONE (banner) |

## 5. Tracking of the following phases

Finished: the 91 sections have their behaviour for the Portfolio, Wave and Product views (V0: foundation and two pilot sections; V1: aggregates of the 12 groups; the S-static and P-portfolio sections show the banner only). No section uses the generic fallback any more; the fallbacks stay in the code for any new section (tested by temporarily removing an aggregate from the registry).

## 6. Assumed ambiguities

- `R-rollup` (28), specific summary table (status, key values) instead of the generic financial fallback: `readiness`, `token-econ`, `vfte-ov`, `opmodel`, `phase-art`, `agent-dir`, `agent-detail`, `exec`, `productivity`, `velocity`, `quality`, `compliance`, `commercial`, `strategies`, `eligibility`.
- `I-input` (18), specific synthesis of the section's input instead of the generic fallback (FTE, artefacts, overrides, hub): `engagement-context`, `engage`, `transform-params`, `params`, `scurve`, `maturity-map`, `scope-sel`, `phase-scope`, `lc-weighting`, `lifecycle-edit`, `loc-strat`, `knowledge`, `run-sizing`, `setup`, `maturity`, `program`, `risk`, `process`.
- **Input sections whose key is common** (written outside the whitelist: `RATE`, `MODEL`, `COEF`, `TOKEN_MODELS`, `DD_STATE`, `assumptValidated`, factory data): the view does not change them. Choice: `ratecard` and the four factory sections are `S-static` (identical values for all products, one row per product would add nothing); `token-econ`, the six `model-engine` sections, `assumptions` and `duediligence` are `R-rollup` (their result is specific to the product, their settings are common).
- **`factory-*`**: the data are common but the generator reads the active product. Chosen `S-static` ("draft, does not feed the financial model"). To be revisited if the factory becomes per product.
- **`readiness`**: a questionnaire (input) but above all an index: `R-rollup`, as requested. **`eligibility`**, **`opmodel`**: parameters + diagnostics, classified `R-rollup` because the point is the gate / the check per product.
- **`kpi`**, **`monthly-playback`**, **`story-summary`**: a mix of additive quantities and ratios. Classified `R-conso`; non-additive ratios must stay per-product rows or weighted means supplied by the domain (`weightedVelocity`, `weightedAutomation`).
- **`productivity`, `quality`, `compliance`, `vfte-ov`, `phase-art`, `agent-dir`, `agent-detail`**: ratios, coverages or scopes that differ per product: `R-rollup`. A sum by phase or by role (like `agent-usage`) could become `R-conso` later.
- **`commercial`**: gain sharing is non-linear: `R-rollup`, no total.
- **`compare`**, **`io`**: work on the (common) snapshots; `compare` as `R-rollup` (gap per product), `io` as `S-static` (the exports already have their scope selector).
- **`decision`** and **`gantt`** already follow the View: registered as their own aggregate.
- **`home`**: `S-static` (navigation).
- The sections of the **Portfolio group** are already at that level; `consolidation` is the source of `selectionView`.

## 7. Risks

- Common editing (All products in Portfolio / Wave): `editsCommon` applies to **all** case commands while that view is active, not only to the in-place editor. A controller that computes its payload from `getState().doc` (the active product) instead of the draft would write to the common values a value read on the active product (mostly result controllers: sensitivity, Monte Carlo, snapshots; none is triggered from an input section).
- A section component that reads the store other than through `useDoc` / `useCtx` / `useCaseResult` would escape the `ProductViewContext` (ESLint rule G4 forbids it on the `ui/` side). `useSimulation` reads the latest simulation of the **active product** (shown as stale for another product): to be handled by the "stress" phase.
- The per-product detail runs the whole section for each open product (cost proportional to the number of open products, one at a time by default).
- A custom control that would write without going through a React event (e.g. a native listener) would not be stopped by `ReadOnlyScope`: to be checked section by section during the drill.
