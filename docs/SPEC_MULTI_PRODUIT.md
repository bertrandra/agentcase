# AgentCase — Specification: multi-product portfolio and transformation in waves

> Status: **implemented (v20.0.0)**. Decisions D-M1…D-M12 adopted (§ 15); phases P1 (domain `domain/portfolio/`), P2 (store, commands, persistence), P3, P3b, P4 (interface), P5 (outputs), P6 (stress) and P7 (release) delivered. Scope: the TypeScript + React application in `app/` (v20.0.0). User guide: [GUIDE_MULTI_PRODUIT.md](GUIDE_MULTI_PRODUIT.md); example: `examples/AgentCase_Portfolio_Example.json`.
> Related documents: [ARCHITECTURE.md](ARCHITECTURE.md) (layers, commands, persistence), [DEVIATIONS.md](DEVIATIONS.md) (differences from the legacy),
> [BUMP_PROCEDURE.md](BUMP_PROCEDURE.md) (versions). Code rules unchanged: files ≤ 150 lines, no `any`, layers
> `ui → controllers → store → domain`, every write goes through an undoable command (Ctrl+Z).
>
> (File name kept for links: *multi-produit* = multi-product. Translated from the French original, which stays in the git history.)

## 1. Objective

Today an AgentCase file describes **a single case**: an entry team (AS-IS), a scope (SDLC / regulatory artefacts),
parameters, and the engine computes a trajectory (savings, cost, NPV, return on investment).

Target: a file describes a **portfolio** of several **products**. Each product has **its own entry team**. The **scope is
common by default** but **may differ** per product. The transformation is **progressive**: it is rolled out in **waves**, each wave
grouping **several products**. The application computes the trajectory of each product, shifted in time according to its wave, then
**consolidates** it for the portfolio.

Guiding principle: **one resolved product = one current case**. The existing calculation engine (`computeCase`, Time Engine, verification, verdict…)
is not rewritten: it is called once per product on an "effective case", then a consolidation layer adds the results up.
The 79 sections keep working on the **active product**.

The **Knowledge Hub** (knowledge platform that feeds the agents) is pooled at portfolio level, but each product uses a
**subset** of it and prepares its own **knowledge transfer** (KT): what is ingested, which context-completeness level
is targeted, at what cost and when (§ 3.5).

## 2. Vocabulary

| Term | Definition |
|---|---|
| **Portfolio** | The file / document. Holds the common values, the products and the waves. |
| **Product** | Unit to transform. Has an entry team, an effective scope, parameter overrides. |
| **Common values** (*defaults*) | Everything that is shared: rate card, reference scope, coefficients, model, adoption curve, discount rate, etc. |
| **Override** | Value specific to a product that replaces the common value. Stored as a difference (sparse): only the modified keys exist. |
| **Effective case** | `merge(common values, product overrides)`: a `CaseState` identical to today's, given to the engine. |
| **Wave** | Ordered set of products that start their transformation on the same date. A product belongs to **at most one** wave. |
| **Product month 0** | Start date of the wave + the product's own offset, if any. The Time Engine starts from that month. |
| **Knowledge Hub (common)** | Knowledge platform of the portfolio: activation, infrastructure, setup and base curation costs. |
| **Knowledge subset** | The part of the Knowledge Hub that serves a product: selected knowledge domains, initial state (context maturity), target level, curation load. |
| **Knowledge transfer (KT)** | Ingestion and curation work on a product's subset (entry team → hub), with a cost and a deadline; later, KT days avoided thanks to the hub. |
| **Context completeness level (CC)** | Existing 0 to 4 scale (0 = no context, 4 = complete context), from the initial state (9 maturity questions) to the target level. |
| **Calendar month** | Time axis of the portfolio (month 1 = start of the first wave). |

## 3. Functional requirements

### 3.1 Products and entry teams

- **F1** — Create, rename, duplicate, archive, delete a product. A portfolio has 1 to 50 products (performance target: § 8).
- **F2** — Each product has **its own entry team** (`teamIn`: skill, grade, location, FTE, pins). The team is **never**
  inherited nor merged: adding a team to one product does not affect the others. **Shared lines** (lot 7): a portfolio may also hold team lines
  shared between products (`sharedTeam`: skill, grade, location, FTE and `allocations` = product id -> share in percent, adding up to <= 100 %).
  A product's effective team is its own rows plus FTE x share of each line it has a share of (read-only rows marked `shared`); the portfolio
  therefore counts a line once. Shares over 100 % or held by a deleted product are diagnostics (`shared-over`, `shared-orphan`); deleting a
  product drops its shares (undoable). No field = no sharing (the files and figures of before).
- **F3** — Duplicating a product copies the team and the overrides (a practical starting point for similar products).
- **F4** — Import / export the team of a product (Excel, already available for the current case); the import of a multi-product file names
  the "Product" column.

### 3.2 Scope: common by default, different if needed

- **F5** — The portfolio holds a **reference scope** (SDLC artefacts, regulatory artefacts, standards, switched-off phases,
  regulatory inclusion, phase sequences). Every new product inherits it.
- **F6** — A product may **override** the scope. The override is at the granularity of the key (e.g. `selectedArtefacts`, `phaseOff`,
  `selectedNorms`) and **not** at the granularity of the item: an override of `selectedArtefacts` replaces the whole list.
  *(Reason: readable, predictable, no ambiguous merge. See decision D-M2.)*
- **F7** — The interface shows a state for each field concerned: **inherited** (common value), **overridden** (chip + common value in the tooltip)
  and a "Revert to common" action. An "Apply to all products" action writes the value at the common level and removes the
  identical overrides.
- **F8** — When the common scope changes, the products that **inherit** follow automatically; the products that **override** do not move
  (a banner lists the overriding products concerned).
- **F9** — The other parameters (rates, coefficients, model, curve, location targets…) follow the same inherited / overridden mechanism,
  with a whitelist of overridable keys (§ 4.3) to avoid inconsistencies (the discount rate, for example, stays common).

### 3.3 Waves

- **F10** — Create, rename, reorder, delete waves. Each wave has: name, **start date** (or offset in months from the
  start of the portfolio), list of products, note.
- **F11** — Assign a product to a wave (drag and drop and selector). A product without a wave is **unscheduled**: it is excluded from the
  consolidation (shown greyed out, with a warning in the diagnostics).
- **F12** — A product may have **its own offset** (in months) inside its wave, to stagger the start without creating a wave.
- **F13** — Waves may overlap in time. **Built after v1 (lot 7, optional, absent = v1 behaviour):**
  - *Dependency between waves.* A wave may start after another wave reaches a milestone, plus a lag `L` in months (whole, ≥ 0). Two milestones:
    `start` (the other wave's effective start + `L`) and `setupEnd` (the latest end of setup of the other wave's planned products,
    `month0 + setup profile months`, + `L`; the other wave's start when it has no planned product). The **effective start** of a wave is
    `max(own start, dependency-derived start)`; a product starts at `effective start + offset`. At most one dependency per wave.
  - *Cycles are never followed.* A choice that would close a cycle is refused (and not offered by the Waves section); a cycle that comes from a file
    is flagged (`wave-dep-cycle`) and the dependencies of the waves on it are ignored. A dependency on an unknown wave is dropped on open (note) or
    flagged (`wave-dep-unknown`).
  - *Transformation-team capacity.* Optional portfolio parameter `maxConcurrentSetups` (whole, ≥ 1): at most that many products have their own
    setup months `[month0, month0 + setup)` overlapping (KT preparation not counted; a product with no setup counts for one month). Placement is
    greedy in a fixed order: wave order (a wave after the wave it depends on), then the wave's product order; a product that does not fit is pushed
    to the first month where it does. Each push is a diagnostic (`setup-pushed`), as is each wave moved by its dependency (`wave-delayed`).
  - *One owner.* `domain/portfolio/waveSchedule.ts` (`resolveSchedule`, pure; memoised per portfolio by `timeline.ts#waveSchedule`) computes the
    effective starts; `scheduledProducts` reads them, so the consolidation, Gantt, KPI bar, stress, Excel and report use them without their own rule.
- **F14** — The duration of a transformation (adoption ramp, setup, S-curve) is the product's; it runs from its
  month 0. The portfolio horizon is calendar-based (`portfolioHorizon` in months); each product is truncated at the horizon.

### 3.4 Consolidation and outputs

- **F15** — **Portfolio view**: savings, running cost, investment, cumulative cash, **NPV**, **return on investment**,
  **payback month**, **human FTE / vFTE**, velocity, by calendar month, by year, **by wave** and **by product**.
- **F16** — The portfolio figures are **exactly the sum** of the product figures, shifted in time. No parallel formula
  (principle: one calculation, several displays).
- **F17** — The **display-scope selector** (top bar, **"Show"** list) chooses: *Portfolio*, *Wave X*, or *Product Y*. The indicators of the top
  bar (savings, cost, savings over N years, velocity, payback, automation, glass ceiling) are those of the chosen scope. **Revised (v20.11+)**,
  rule "Change follows Show": choosing a product shows it, makes it active **and** makes it the target of the **"Change"** list (scope `product`); choosing the
  Portfolio or a Wave sets "Change" back to **All products** (scope `all`). The user can then choose a product in "Change" without changing
  the view (see "Notes: Show / Change lists and in-place editing").
- **F18** — **Gantt**: one row per wave (aggregated bar) with expandable products; the adoption milestones (L1 → L4), the payback and the first vFTE
  are each product's.
- **F19** — **Report / Excel / HTML / snapshots**: the results workbook contains a "Portfolio" sheet, a sheet per wave
  and a sheet per product; the critical-delivery report is produced for the chosen display scope.
- **F20** — **Stress and verdict**: scenarios and Monte Carlo run per product (effective case); the portfolio view aggregates the draws
  (§ 6.3) and sums the six scenarios on the calendar like F16 (portfolio scenarios table, `portfolioScenarios`; sensitivity stays per product). The verdict (decision) exists at product level and at portfolio level.

### 3.5 Knowledge transfer: a subset of the Knowledge Hub per product

Today the Knowledge Hub is set **once for the case**: activation (`khEnabled`), 9 initial maturity questions (`khA0`…`khA8`,
score 0 to 4 → score → initial CC level), target CC level (`khTargetCC`, capped by the engagement context), setup cost
(`khSetupBase × (0.5 + 0.25 × level gap)`), annual cost (`khCurationFTE × target day rate × working days + khInfraMonthly × 12`), automation
potential multiplier (`CC_MULT[target]`) and knowledge-transfer days avoided per year (`starting FTE × 0.2 × 15 × day rate × KT_RED[CC]`).
With several products, these settings become **per product**, on a portfolio hub.

- **F24** — **Common hub, subset per product.** The portfolio carries the common setting of the hub (default activation, infrastructure cost, allocation
  mode § 5.3). Each product owns a **knowledge subset** (`product.knowledge`), independent of the others'.
- **F25** — **Content of a subset.** (a) `enabled`: the product uses the hub (inherits the common value, overridable); (b) `domains`: free list of
  selected knowledge domains (documentation, code, tickets, operating procedures, architecture decisions, …) with a **weight** (%) that
  splits the curation load; (c) the product's own **9 initial maturity answers** (→ the product's initial CC); (d) the product's target `targetCC`
  (≤ the context cap); (e) the product's `curationFTE` and `setupBase`; (f) `ktLeadMonths` (≥ 0): preparation of the transfer before the start
  of the wave (F28).
- **F26** — **Defaults identical to today.** A new product inherits the common hub: same answers, same target, same costs as the current single
  case. Each field of the subset follows the "inherited / overridden" mechanism of F7 (chip, revert to common, apply to all).
- **F27** — **Effects specific to the product.** A product's subset acts **only** on that product: potential multiplier (`CC_MULT`), CC
  level per year from the product's month 0, KT days avoided (computed on the product's entry team), setup cost and annual curation cost.
  It feeds the same fields of the effective case (no new formula in the engine).
- **F28** — **Preparation before the wave.** `ktLeadMonths = k` places the **KT setup cost** (ingestion, initial curation) *k* months **before** the
  product's month 0 in the consolidation (prepare wave N+1 during wave N). The benefits stay from month 0. Default 0 = current behaviour.
- **F29** — **Portfolio "Knowledge transfer" table.** One row per product: starting state (initial CC), target, domains, setup cost,
  annual cost, KT days avoided, wave, preparation deadline, plus totals; filterable by wave; flags the products without a hub (disabled) and those whose
  target is capped by the context.
- **F30** — **Allocation of the common infrastructure.** The hub infrastructure cost (`khInfraMonthly`) is a portfolio cost allocated to the products according to
  one of the modes of § 5.3 (v1: full cost per product; option: split in proportion to the entry headcount). The consolidation never adds the same
  infrastructure twice.
- **F31** — **"Tipping effect" reading.** The table and the Consolidation view show, per wave, the share of the benefit attributable to the hub (difference with the same wave with the hub
  disabled), computed by the existing with/without-hub comparison function (`hubView`), applied product by product.

### 3.6 Compatibility

- **F21** — A current file (single case) opens as a portfolio of **one product "Product 1"** and **one wave "Wave 1"** starting at
  month 0. All figures are **identical** to the former display (acceptance criterion A1).
- **F22** — A single-product portfolio can be **re-exported as a single-case file** (lossless) for the tools and the users
  that are not on multi-product.
- **F23** — The single-product mode stays the default behaviour: as long as only one product exists, the interface shows neither a product selector
  nor wave views (progressive disclosure, § 7).

## 4. Data model

### 4.1 Document

Schema version: `agentcase.portfolio.v1` (the single case stays `agentcase.snapshot.v1`, accepted on read).

```ts
interface Portfolio {
  _schema: 'agentcase.portfolio.v1';
  common: CommonCase;                       // common values (defaults)
  products: Product[];                      // display order
  waves: Wave[];                            // roll-out order
  activeProductId: string;                  // product the 79 sections work on (UI state persisted in the document? see D-M6)
  hub: { enabled: boolean; infraMonthly: number; infraAllocation: 'perProduct' | 'byBaseEtp' };   // common Knowledge Hub (§ 3.5, § 5.3)
  horizonMonths: number;                    // calendar horizon of the portfolio
  startDate: string;                        // ISO, month 1 of the portfolio
}

interface CommonCase extends Omit<CaseState, 'teamIn'> {}   // everything except the entry team

interface Product {
  id: string; name: string; note?: string; archived?: boolean;
  teamIn: TeamRow[];                        // own entry team, never inherited
  knowledge: KnowledgeSubset;               // subset of the Knowledge Hub (§ 3.5); absent fields = inherited from the common values
  overrides: Partial<Overridable>;          // sparse overrides (whitelist § 4.3)
  waveId: string | null;                    // null = unscheduled
  offsetMonths: number;                     // offset inside the wave (≥ 0)
}

interface KnowledgeSubset {
  enabled?: boolean;                        // inherited from the common hub if absent
  domains?: { label: string; weightPct: number }[];   // selected domains; weight = split of the curation (Σ = 100)
  maturityAnswers?: number[];               // 9 scores 0..4 (khA0..khA8) specific to the product
  targetCC?: number;                        // 0..4, capped by the engagement context
  curationFTE?: number; setupBase?: number; // curation load, base of the setup cost
  ktLeadMonths?: number;                    // KT preparation before month 0 (≥ 0)
}

interface Wave {
  id: string; name: string; note?: string;
  startMonth: number;                       // 0 = start of the portfolio (≥ 0)
  productIds: string[];                     // display order; consistent with Product.waveId
  dependsOn?: { waveId: string; milestone: 'start' | 'setupEnd'; lagMonths: number };   // F13 (lot 7); absent = none
}
// Portfolio.maxConcurrentSetups?: number   // F13 (lot 7): transformation-team capacity, whole >= 1; absent = no limit
```

Invariants (checked by a property test): a product is in only **one** wave; `Wave.productIds` and `Product.waveId` are
consistent; `offsetMonths ≥ 0`; `ktLeadMonths ≥ 0`; the weights of `domains` add up to 100; `targetCC` ∈ [0, 4]; `startMonth ≥ 0`; the ids are unique; at least one product.

### 4.2 Effective case

```ts
resolveProduct(p: Portfolio, productId): CaseState   // pure domain function
  = { ...p.common, ...pick(overrides, whitelist), teamIn: product.teamIn }
```

- The product's `knowledge` fields are written into the existing keys of the effective case (`dom.checked.khEnabled`, `dom.values.khA0`…`khA8`, `khTargetCC`,
  `khCurationFTE`, `khSetupBase`, `khInfraMonthly` allocated according to § 5.3): the engine (`domain/knowledge.ts`) stays unchanged.
- **Shallow** merge by key (no deep merge), except `dom.values` / `dom.checked` where the override is a difference per form
  field (keys of `dom.values`).
- The result is memoised (`WeakMap` on `common`, `product.overrides`, `product.teamIn`), so changing one product does not recompute the others.
- The result is a valid `CaseState`: **the whole existing domain works unchanged**.

### 4.3 Overridable keys (whitelist v1)

| Family | Keys | Overridable? |
|---|---|---|
| Scope | `selectedArtefacts`, `artefactsEdited`, `selectedRegArtefacts`, `regArtefactsEdited`, `phaseOff`, `phaseSeq`, `selectedNorms`, `regInclude`, `lifecycleUse`, `lifecyclePos`, `statusLifecycle` | **yes** |
| Targets | `targetLocPct`, `dom.values` (horizon excluded), `forceGlassCeiling` | yes |
| Knowledge Hub | `khEnabled`, `khA0`…`khA8`, `khTargetCC`, `khCurationFTE`, `khSetupBase` (= the product's subset, § 3.5) | **yes** |
| Knowledge Hub (infra) | `khInfraMonthly` | no (common; allocated according to § 5.3) |
| Curve | `scurve` (family, points) | yes (the product's own pace) |
| Context | `engageCoef` (engagement context), `MATURITY_MAP` | yes |
| Rates | `RATE` | not in v1 (common) — see D-M3 |
| Model / coefficients | `MODEL`, `COEF`, `TOKEN_MODELS`, `TOK_OUT_SHARE` | not in v1 (common) |
| Discount rate | `MODEL.CASE.discountRate` | **never** (portfolio) |
| Horizon | `dom.values.horizon` | **never** (calendar, portfolio) |

### 4.4 Persistence

- JSON snapshot, HTML, autosave (IndexedDB) and multi-tab: the `Portfolio` replaces `Doc`; the patches (Immer patches)
  stay at document level, so **history and Ctrl+Z cover products, overrides and waves** with no extra mechanism.
- The canonical calculation package (`calculationPackage`) becomes: one package per product + one portfolio package; the staleness detection
  compares both levels.
- Migration: `fromSnapshot` detects `_schema`; a single case is wrapped (F21). No complex migration table: the content of the case
  becomes `common` + the product "Product 1" receives `teamIn`.

### 4.5 Excel

Sheets added to the parameters workbook: `Products` (id, name, wave, offset, note), `Waves` (id, name, start, note), `Team_<product>`
(or one `TeamIn` sheet with a `Product` column), `Overrides` (product, key, JSON value), `KnowledgeSubsets` (product, activation, target, curation, setup, preparation in months) and `KnowledgeDomains` (product, domain, weight) and, when the portfolio has shared lines, `SharedTeam` (line id, skill, grade, location, FTE, product, share %; one row per share). The current sheets describe the **common values**.
The import is hardened as today (size, types, forbidden keys) and stays **one undoable step**.

## 5. Engine: consolidation

### 5.1 Principle

```
for each planned product p:
    c_p  = resolveProduct(portfolio, p)
    month0_p = wave(p).startMonth + p.offsetMonths
    rows_p(t) = Time Engine of c_p  (t = 1..N_p)                          ← unchanged
    calendar row: T = month0_p + t
consolidation(T) = Σ_p rows_p(T - month0_p)       for each additive measure
```

Exception: the **KT setup** cost of a product is placed at `month0_p − ktLeadMonths_p` (F28); its other flows stay at `month0_p + t`.
The consolidation therefore keeps the KT cost in a separate series (`ktSetup`), then adds it to the cash flow.

**Additive** measures (direct sum): monthly net savings, running cost, setup, tokens, infrastructure, human FTE, vFTE,
cash flow. **Non-additive** measures recomputed on the consolidated series: cumulative cash, **portfolio payback month**
(first month where the consolidated cumulative is ≥ 0), **NPV**, **ROI** (`roiCanonical` on the consolidated net and setup), velocity (mean weighted by
the entry team).

### 5.2 Discounting

The portfolio NPV discounts **each calendar month T** at the common rate: `Σ net(T) / (1+r/12)^T`. The NPV of a product, read alone
(its own Time Engine), is discounted from **its** month 0: the two views therefore read differently. So that the sum of the product NPVs
equals the portfolio NPV, the product view of the portfolio shows the **calendar NPV** (discounted from month 1 of the portfolio);
the NPV "from its start" is offered in a tooltip. *(Decision D-M4.)*

### 5.3 Shared investment

Some setup costs are common (platform, knowledge hub). Two options:

1. **Per product** (v1): each effective case carries its own setup; the common values have no cost of their own. Simple, additive.
2. **Shared setup** (v2): a portfolio cost line, allocated to the first wave (or split), with no duplicate in the products.

*(Decision D-M5, recommendation: option 1 in v1.)*

**Allocation of the common hub (F30).** `hub.infraAllocation`:

- `perProduct` (v1, default): each product bears `khInfraMonthly × 12` as today (conservative, additive, identical to the single case for one product);
- `byBaseEtp`: the portfolio infrastructure is split in proportion to the entry headcount of the products that use the hub; the shares add up
  exactly to the hub cost (conservation test), and a hub used by a single product costs it the full cost.

Curation and setup costs: always specific to the product (subset).

### 5.4 Code organisation

```
domain/portfolio/
  types.ts           // Portfolio, Product, Wave
  resolve.ts         // resolveProduct (merge + memoisation)
  validate.ts        // invariants (§ 4.1), diagnostics
  timeline.ts        // month0 of a product, calendar shift, truncation at the horizon
  consolidate.ts     // sum of the shifted rows → consolidated series
  headline.ts        // portfolio NPV / ROI / payback from the consolidated series (reuses roiCanonical)
  waves.ts           // aggregates per wave
  knowledge.ts       // subset → keys of the effective case; allocation of the hub infra; shift of ktSetup; Knowledge transfer view
  index.ts
```

The domain imports nothing but the existing domain. `computeCase` stays the only function that computes a product.

## 6. Commands, interface state, sections

### 6.1 Commands (all undoable, batched when they touch several keys)

`product.add / rename / duplicate / archive / remove / setNote`, `product.setTeam*` (reuses the existing team commands, addressed by
`productId`), `product.setOverride(key, value)`, `product.clearOverride(key)`, `product.applyToCommon(key)`, `portfolio.setCommon(key, value)`
(reuses the existing parameter commands when the active product is "inherited"), `wave.add / rename / remove / reorder / setStart`,
`wave.assign(productId, waveId)`, `product.setOffset`, `portfolio.setHorizon`, `wave.setDependency(id, dep | null)` and
`portfolio.setMaxConcurrentSetups(n | null)` (F13, lot 7).

Addressing rule: the **existing commands** (≈ 202) keep their signature; an **addressing** layer decides whether the write goes to
`common` (inherited key) or to `products[active].overrides` (key already overridden, or "edit this product only" mode active).
A visible switch "Edit: all products / this product only" (default: *this product only* for the team,
*all products* for the scope while the product inherits) avoids unintended changes. **Revised (after v20.10, see "Notes:
Show / Change lists and in-place editing")**: the switch becomes a "Change" list (All products / "*name*" per product) and, in a Portfolio
or Wave view, "All products" always writes the common values.

### 6.2 Interface state (not undoable)

`activeProductId`, display scope (portfolio / wave / product), expanded wave view, filters. Stored in `uiState` (like
the current state), except `activeProductId`, persisted in the document so that a file reopens on the same product (decision D-M6).

### 6.3 Sections

- The **79 existing sections** plug into `useCtx()`, which returns the **effective case of the active product**: no change to their
  logic, only a "Product: X (inherited / overridden)" banner in `SectionFrame`.
- **New "Portfolio" group** (≈ 6 sections):

| Section | Content |
|---|---|
| Products | Table of the products: team (FTE), wave, offset, state (inherited / n overrides), key indicators, actions F1–F4. |
| Overrides | Per product, list of the overridden keys with the common value vs the product value, "Revert to common", "Apply to all products". |
| Waves | Wave board (columns) with products (cards), start date, drag and drop (F10–F12). |
| Knowledge transfer | Table F29: one subset per product (domains, initial state, target, costs, KT days avoided, preparation), totals, effect of the hub per wave (F31); editing of the active product's subset (reuses the existing Knowledge Hub section with the "inherited / overridden" banner). |
| Consolidation | Trajectory of the portfolio: cumulative curve, monthly, per wave, per product, payback, NPV, ROI (F15–F16). |
| Portfolio stress | Aggregated Monte Carlo of the planned products, correlation `ρ`, risk reduction, per wave and per product (P6); the scenarios are summed on the calendar in the Scenarios section (Portfolio / Wave view). |

- Top bar: selector of the **active product** and of the **display scope** (visible as soon as there are ≥ 2 products, F23).
- The **Gantt** ("Planning") gains the wave view (F18).
- The **report** and the **exports** consume `consolidate` (never a recomputation).

### 6.4 Stress and verdict

- Monte Carlo: draws **per product** with a deterministic seed per product (`seed ⊕ hash(productId)`); the portfolio adds the
  trajectories draw by draw. **Correlation between products** parameter (`ρ ∈ [0,1]`, default 0 in v1 = independent; `ρ = 1` =
  same draws for the common factors) so as not to underestimate the aggregated risk.
- Verdict: current rules applied to the result of the chosen scope; a portfolio dashboard shows the verdicts per wave.

## 7. User journey

1. The user opens an existing file: they see the same screen as before (one product, no selector).
2. "Add a product" (Products section): the top bar shows the selector; the new product inherits the common values.
3. They fill in the team of product 2; they change the scope for that product only ("overridden" chip).
4. In "Waves", they create "Wave 1" (month 0) and "Wave 2" (month 6) and drag the products into them.
5. "Consolidation" shows the trajectory of the portfolio; the top bar switches to *Portfolio*; the report and the Gantt follow.
6. Ctrl+Z undoes a team, an override, a product move or a wave date alike.

## 8. Non-functional requirements

| Topic | Requirement |
|---|---|
| **Performance** | 20 products × 60-month horizon: refresh after a product change < 150 ms (only one product recomputed thanks to the per-product memoisation); consolidation < 30 ms. Budget added in `app/perf-budget.json`. |
| **Memory / size** | 20-product file < 1 MB; autosave diffed as today. |
| **Accessibility** | Wave board usable with the keyboard (moving a product = "Move to wave…" commands, arrows), announcements through the `aria-live` region. axe audit extended (`npm run a11y`) to the new sections. |
| **Undo** | Every change (drag and drop included) = one step; continuous gestures coalesce (`coalesceKey`). |
| **Security** | Same protections (`sanitize`, forbidden keys, no raw HTML); product / wave ids are strings from a safe list. |
| **Interface** | Same look as the rest (legacy UI parity), no new library. |

## 9. Out of scope (v1)

- ~~Dependencies between waves (product B after product A), transformation-team capacity between waves~~ — built in lot 7, see F13.
- ~~Teams shared between products~~: built in lot 7 (F2, shared lines with a share per product). Still out of scope: pins on a shared line.
- Rates / model / coefficients specific to a product (the whitelist of § 4.3 excludes them).
- Monte Carlo with a full correlation matrix (global `ρ` only in v2).
- Simultaneous collaborative editing (the existing multi-tab broadcast remains valid).

## 10. Delivery plan by phases

| Phase | Content | Exit criterion |
|---|---|---|
| **P0 — Framing** | Validate decisions D-M1…D-M8; mock-ups (Products, Waves, top bar). | Decisions recorded in this document. |
| **P1 — Model and domain** | `domain/portfolio/` (types, resolve, validate, timeline, consolidate, headline); property tests. | Invariants A2–A5 green; `computeCase` unchanged. |
| **P2 — Store and persistence** ✅ delivered | `Portfolio` instead of `Doc`; migration wrapper (F21); product / wave / override commands; addressing of the existing commands; autosave, multi-tab, canonical calculation per product. | The 202 commands pass the undo test on a 3-product portfolio; opening the 107 fixtures = A1. |
| **P3 — Product interface** ✅ delivered | Active-product selector, inherited / overridden banners, Products and Overrides sections, "all / this product" mode. | Journey 1–3 (§ 7); axe audit without violation. |
| **P3b — Knowledge transfer per product** ✅ interface delivered | `domain/portfolio/knowledge.ts`, subset in `Product`, Knowledge transfer section, `ktLeadMonths`, infrastructure allocation, Excel sheets `KnowledgeSubsets` / `KnowledgeDomains`. | A11–A13 green; a product with the default hub = current single case (A1). |
| **P4 — Waves and consolidation** ✅ delivered | Waves section (board + keyboard), Consolidation, top bar by scope, Gantt by wave. | Journey 4–6; performance budgets. |
| **P5 — Outputs** ✅ delivered | Excel (parameters and results), report, HTML, snapshots. | Cell-by-cell parity of the single-product mode; new sheets validated by tests. |
| **P6 — Stress** ✅ delivered | Monte Carlo per product + aggregate, correlation `ρ`, portfolio verdict. | Reproducibility tests (seed); documentation of the deviations. |
| **P7 — Release** ✅ delivered | Documentation, version 20.0.0, portfolio examples, `npm run ui-parity` and `a11y` extended. | All CI checks green. |

Each phase is delivered by an independent merge request, with the tests of the phase and with no regression of the current 13,000 tests.

## 11. Acceptance criteria and test strategy

| # | Criterion | Test |
|---|---|---|
| **A1** | A "1 product, 1 wave at month 0" portfolio gives **exactly** the current figures (1e-9) on the 107 fixtures. | Oracle: all fixtures loaded wrapped; same parity tests as today. |
| **A2** | N **identical** products in the same wave ⇒ the consolidated series = N × the series of one product. | Property test. |
| **A3** | Shifting a wave by *k* months ⇒ the consolidated series is shifted by *k*; the calendar NPV is multiplied by `(1+r/12)^-k`; the payback is shifted by *k*. | Property test. |
| **A4** | Σ(calendar NPV of the products) = portfolio NPV; same for savings, cost, setup, FTE. | Property test (all fixtures). |
| **A5** | A product that inherits a key follows the common value; a product that overrides it does not move; "Revert to common" restores the inheritance; `applyToCommon` removes the identical overrides. | Unit tests + `fast-check` property. |
| **A6** | Every portfolio command can be undone / redone; `undo∘apply = id`. | Extend `tests/store/undo-property.test.ts` and the command registry. |
| **A7** | A product without a wave does not enter the consolidation and raises a warning. | Test. |
| **A8** | No portfolio figure is computed outside `domain/portfolio/consolidate`; no sum in `ui/`. | Review + targeted ESLint rule (financial `reduce` forbidden in `ui/sections/portfolio`). |
| **A9** | The single-product export of a one-product portfolio reopens identically (round trip). | Round-trip test. |
| **A10** | Performance and accessibility as in § 8. | `npm run perf`, `npm run a11y`. |
| **A11** | A product whose subset is inherited gives exactly the current hub figures (setup, annual cost, `CC_MULT`, KT days avoided); changing the subset of one product changes **no** figure of the other products. | Property test + oracle on the fixtures with the hub enabled. |
| **A12** | With `perProduct`, the allocation gives back the single-case cost; with `byBaseEtp`, Σ of the shares = hub infrastructure cost (conservation, to the cent). | Property test. |
| **A13** | `ktLeadMonths = k` only moves the KT setup cost *k* months before month 0; consolidated cumulative cash, NPV and payback are recomputed accordingly; with `k = 0` nothing changes. | Property test. |

Intentional differences from the current behaviour (if any) are recorded in `DEVIATIONS.md` (rule in force: only the new
build is changed, the difference is recorded).

## 12. Decisions (question, options, recommendation, adopted)

| # | Question | Options | Recommendation | Adopted |
|---|---|---|---|---|
| **D-M1** | Can a wave contain a product already in another wave? | yes (staggering) / no | **No**: one product = one wave; staggering is done with `offsetMonths`. | Recommendation accepted (§ 15) |
| **D-M2** | Granularity of the scope override | whole key / item by item (set diff) | **Whole key** in v1; set diff in v2 if the need arises. | Recommendation accepted (§ 15) |
| **D-M3** | Rates (`RATE`) and coefficients per product | common only / overridable | **Common only** in v1 (one supplier, one rate card). | Recommendation accepted (§ 15) |
| **D-M4** | NPV of a product within the portfolio | discounted from month 1 of the portfolio / from its month 0 | **From month 1 of the portfolio** (sum = portfolio NPV); the other one in a tooltip. | Recommendation accepted (§ 15) |
| **D-M5** | Shared setup (platform, hub) | per product / portfolio line | **Per product** in v1. | Recommendation accepted (§ 15) |
| **D-M6** | `activeProductId` in the document or in the interface state | document / interface | **Document** (reopens on the same product), with no undo step. | Recommendation accepted (§ 15) |
| **D-M7** | Correlation between products in Monte Carlo | independent / `ρ` parameter | **Global `ρ`**, default 0, in P6. | Recommendation accepted (§ 15) |
| **D-M8** | Versioning | 19.x / 20.0.0 | **20.0.0** (change of document schema, reading of older files kept). | Recommendation accepted (§ 15) |
| **D-M9** | Interface name: "Product", "Application", "Service" | free | **Product** by default, label configurable in the settings (future). | Recommendation accepted (§ 15) |
| **D-M10** | Granularity of the subset | free domains with weights / closed catalogue of domains | **Free domains with weights** (information and split of the curation, no effect on the multiplier, which stays driven by the CC level). | Recommendation accepted (§ 15) |
| **D-M11** | Knowledge reuse between products (a domain already ingested for product A lowers the cost of product B) | ignored in v1 / reuse factor | **Ignored in v1**; `reusePct` factor per domain in v2. | Recommendation accepted (§ 15) |
| **D-M12** | Allocation of the hub infrastructure | per product / in proportion to the headcount | **Per product** in v1 (consistent with D-M5), proportional as an option. | Recommendation accepted (§ 15) |

## 13. Risks

| Risk | Mitigation |
|---|---|
| The existing commands write at the wrong level (common vs override) | Single addressing layer + undo test on a portfolio; visible "all / this product" switch. |
| Regression of the single-product figures | A1 on the 107 fixtures from P2 on, before any interface. |
| Slowness with many products | Per-product memoisation; linear consolidation; performance budget in CI. |
| Confusion between product NPV and portfolio NPV | Explicit labels + tooltips (already in place on the top bar). |
| File size / large Excel import | Existing import limits + size tests; per-product sheets paginated. |
| Double counting of the hub infrastructure or setup | Explicit allocation mode, conservation test (A12), "hub used by 0 products" diagnostic. |
| Complexity of the interface | Progressive disclosure (F23): nothing changes while there is only one product. |

## 14. Glossary of the consolidated figures

| Figure | Definition |
|---|---|
| Savings (month T) | Σ products, net savings of month `T - month0_p`. |
| Running cost | Σ products, total cost of the month. |
| Investment | Σ product setups, placed on their setup months. |
| Cumulative cash | Cumulative sum of the consolidated net savings (setup included). |
| Payback (month) | First calendar month where the consolidated cumulative cash is ≥ 0. |
| NPV | `Σ net(T) / (1+r/12)^T`, `r` = common rate, T = calendar month. |
| ROI | `roiCanonical(consolidated net, consolidated setup)` (same rule as for a case: null without setup). |
| Savings in % over N years | `(cumulative savings − setup) / (baseline cost × years)`, summed over the planned products. |
| Velocity | Mean velocity uplift, weighted by the entry headcount of each product. |
| Knowledge transfer (cost) | Σ products: KT setup (shifted by `ktLeadMonths`), annual curation and share of the hub infrastructure. |
| KT days avoided | Σ products, `starting FTE × 0.2 × 15 × day rate × KT_RED[CC]` per year from the product's month 0. |
| FTE / vFTE | Sum of the human FTE and agent vFTE of the products, per calendar month. |

## 15. Decisions adopted

All the recommendations of § 12 were **accepted** by the sponsor. They are the specification; phases P1 to P7 comply with them.

| # | Decision adopted | Consequence in the code |
|---|---|---|
| **D-M1** | A product belongs to **at most one** wave; staggering goes through `offsetMonths`. | Invariant `multi-wave` of `validate`. |
| **D-M2** | Override at the granularity of the **whole key**; set diff postponed to v2. | `setOverride` replaces the value of the key; `dom.values` / `dom.checked`: one entry per form field. |
| **D-M3** | `RATE`, `MODEL`, `COEF`, `TOKEN_MODELS`, `TOK_OUT_SHARE` **common** in v1. | Outside `OVERRIDABLE_KEYS`; `validate` refuses the key. |
| **D-M4** | The NPV of a product in the portfolio view is the **calendar NPV**, discounted from month 1 of the portfolio; the NPV "from its start" is that of its own `computeCase` (`ProductRun.headline().npv`). | `ProductView.summary.npv` (calendar); Σ = portfolio NPV. |
| **D-M5** | Setup **per product** in v1 (no portfolio cost line). | Each effective case carries its `setupTotal`. |
| **D-M6** | `activeProductId` is **in the document**, with no undo step. | Field `Portfolio.activeProductId` (the store, in P2, will write it outside the history). |
| **D-M7** | Global correlation `ρ`, default 0, in P6. | Out of scope of P1. |
| **D-M8** | Version **20.0.0**, delivered in P7. | `APP_VERSION` unchanged in P1. |
| **D-M9** | Interface label **"Product"** (configurable later). | `envelopeCase`: "Product 1", "Wave 1". |
| **D-M10** | **Free** knowledge domains **with weights**; information and split of the curation, no effect on `CC_MULT`. | `KnowledgeSubset.domains`: validated (Σ = 100), never read by the engine. |
| **D-M11** | No knowledge reuse between products in v1 (`reusePct` in v2). | No cross term in `knowledge.ts`. |
| **D-M12** | Hub infrastructure **per product** by default; `byBaseEtp` option. | `hub.infraAllocation`; `allocateCents` (conservation to the cent). |

### Implementation notes for P1 (ambiguities resolved)

- **Precedence of the layers**: common values < hub (activation, infrastructure share) < whitelisted overrides < the product's knowledge subset < `teamIn`. A layer equal to the common reading is not written: a product without an override keeps the `dom` object of the common values (lossless F22 round trip).
- **`khInfraMonthly` and `horizon`** are never overridable, not even through `dom.values`: `setOverride` throws, `resolveProduct` ignores the entry if the document contains it, `validate` flags it.
- **Portfolio payback month**: first calendar month, from the first cash movement (month 1 of the first product or first KT preparation month), where the cumulative is ≥ 0. Without this bound, a wave starting in month 7 would "pay back" in month 1 (cumulative zero). For a product at month 0 it is the engine's rule (A1); shifting by *k* shifts the payback by *k* (A3).
- **`ktLeadMonths`**: the KT cost (`khSetupCost`, spread like the engine's setup over `setupProfileMonths` months) is removed from `month0 + t` and placed at `month0 − k + t`; *k* is capped at `month0` (never before calendar month 1, diagnostic `kt-lead-clamped`). The `ktSetup` series is a subset of `setup`. Without a hub, nothing moves.
- **Truncation**: a product is cut at the calendar horizon of the portfolio; beyond its own horizon it no longer contributes (zero). The portfolio `costReduction` sums each product's components over its own horizon.
- **`byBaseEtp` allocation**: shares computed among the planned, non-archived products whose effective case actually uses the hub (engagement context included); entry headcount = Σ FTE of `teamIn`; shares in cents (largest remainder), a single user pays the full cost. A product outside the split shows the full cost (no effect if it does not use the hub).
- **Velocity**: mean of the `velocityUpliftPct` of the planned products weighted by the entry headcount; monthly adoption weighted the same way (product not started = 0).

### Implementation notes for P2

- **Architecture**: the portfolio is the source of truth of the store; `doc` is derived from it (effective case of the active product). The existing commands are unchanged; an *addressing layer* (`store/address/`) rewrites their patches onto the portfolio inside one `produceWithPatches`. Details in ARCHITECTURE.md § 4-5.
- **Command names**: `product.setActive` and `product.setEditScope` (not undoable, outside the history and the multi-tab broadcast); `activeProductId` is saved with the file (D-M6), `editScope` never is.
- **F22 save rule**: v1 if and only if the file reopens to the same portfolio (one product, one wave, neither override nor subset, default names and offset); otherwise `agentcase.portfolio.v1`. The autosave always keeps the exact portfolio.
- **Scope selection**: "This product only" writes to `overrides` without ever touching the common values; a key already overridden is changed as an override whatever the scope; the keys outside the whitelist always go to the common values.
- **Tests**: A1/A9 at store level (107 fixtures, real open path), A5 (addressing layer), A6 (registry on 3 products / 2 waves + `fast-check` property mixing case, product, wave, override and scope commands), persistence, two-level staleness, cleaning (`sanitize`).

### Implementation notes for P3b

- **Existing "Knowledge hub" section**: with 2 or more products, same form fields (the addressing writes the subset: "This product only" creates the product's own value, "All products" changes the common hub), `SubsetBadge` chips per field (activation, answers, target, curation, setup, domains, preparation) with "Revert to common" (`product.setKnowledge` with `clear`). "Apply to all products" is not offered for the subset fields (postponed). The infrastructure field moves to the common hub card (`HubSettings`).
- **Domains**: local draft (interface state) saved by "Save the domains"; weights ≠ 100 refused by `dispatchChecked` with an announced message (`role="alert"`); empty label refused on the interface side.
- **Preparation**: integer ≥ 0; an invalid value does not reach the store; the `kt-lead-clamped` diagnostic is shown in the card.
- **"Knowledge transfer" section** (`portfolio/knowledge-transfer`): F29 table from `knowledgeTable` (filter by wave, totals of the displayed rows via `knowledgeTotals`), effect of the hub per wave F31 (`waveEffects`: sum of the `hubView` differences of the wave's products), conservation check of the allocation (`infraView`) and diagnostics. The Excel sheets `KnowledgeSubsets` / `KnowledgeDomains` are delivered in P5.

### Implementation notes for P4

- **Sections**: "Waves" (`portfolio/waves`) and "Consolidation" (`portfolio/consolidation`), 84 sections in the catalogue at the time. Board: one column per wave then "Unscheduled"; moving by drag and drop, left / right arrows on the card and "Move to wave…" menu, always `wave.assign` (undoable, announced); product offset and wave start (months, with the calendar month derived from `startDate`); the Wave column of the Products table can be edited with the same command. The totals of a wave are those of `WaveView`; the effect of the hub per wave stays in Knowledge transfer (link).
- **Display scope (F17)**: view field `displayScope` of the portfolio, command `portfolio.setDisplayScope`, not undoable, **not saved** (like `editScope`): a file always reopens on the active product. Choosing a product in "Show" activates that product and puts it in "Change"; Portfolio / Wave set "Change" back to All products (rule "Change follows Show"). Portfolio / Wave: figures of `scopeHeadline` (velocity, effective automation and glass ceiling weighted by the entry headcount; savings and cost of the **calendar year** at the end of the horizon; "savings over N years" by components). A single product: bar unchanged.
- **Consolidation**: `consolidationView` (cards, portfolio cumulative cash + one curve per wave, tables per wave and per product, total row = portfolio headline, flows per year, diagnostics `unscheduled`, `kt-lead-clamped`, `target-capped`, `hub-unused` and `truncated` — product cut by the horizon, information).
- **Gantt (F18)**: bar per wave from `portfolioGantt` (from the first start-up, transfer preparation included, to the end of the ramp — max(setup profile, last adoption / maturity milestone) — of the latest product), expandable products with the engine's milestones shifted by `month0`. With the Product scope: only one row stating the calendar shift.
- **A8**: ESLint rule `no-restricted-syntax` (`.reduce(` forbidden) in `ui/sections/portfolio`, the scope hooks / tiles and the wave Gantt; test in `tests/lint-rules.test.ts`.
- **Performance**: `corePortfolio` (the portfolio without the view state) is the memoisation key of the views; `hubView` is cached per resolved case. Measurements on 20 products × 60 months: Consolidation view ≈ 4 ms (budget 30), editing a product with refresh of all the views ≈ 25 ms (budget 150), change of scope ≈ 0 ms.

### Implementation notes for P5

- **Predicate**: the portfolio additions (Excel sheets, report, snapshot capture) apply exactly when `hasPortfolioContent(pf)` = `!isSingleCase(pf)` (rule F22: at least two products or waves, an override, a subset, a renamed / annotated / offset / unscheduled product, a start date). An ordinary single case keeps all its exports identical.
- **Parameters workbook** (`store/persistence/excel/portfolio/`): the 47 sheets describe the **common values** (`commonDocOf`: common values + team of the first product, only for the compatibility "Input Team" sheet, **ignored** on the import of a portfolio). "Export all" adds `PortfolioSettings`, `Products`, `Waves`, `TeamIn` (Product column), `Overrides` (product, key, part, JSON; whitelist `parseRef`, split into cells of 4,000 characters), `KnowledgeSubsets` (activation, target, curation, setup, preparation, 9 maturity answers), `KnowledgeDomains`. The order of the products in a wave is the "Position in wave" column. Import: any workbook with a `Products` sheet replaces the whole portfolio through one undoable command `excel.importPortfolio` ("Import portfolio parameters"); strict validation (no row ignored, unlike "Input Team"); caps of 50 products / 50 waves / 200 team rows and 120 overrides per product / 20,000 rows; the horizon of the settings sheet wins and the common horizon in years follows it (`setHorizon`); **no re-fit** of the automation potential on import (the workbook states the stored values; the next open re-fits them). Round trip: products, waves, hub, horizon, subsets identical; the common values identical except three keys that the "case" import already rebuilds identically to the previous one (`phaseOff`, `PERSONAS`, `SECTION_DEPS`), stable on the second pass.
- **Results workbook**: `Portfolio` (cards = `portfolioHeadline`, by year / wave / product and calendar NPV = `consolidationView`), `Wave <name>` (cumulative cash per month = series of the wave), `Knowledge transfer` (`knowledgeTable`, `waveEffects`, `infraView`), then per product `Product <name>` and its six sheets `P<n> <sheet>` (existing writer on the effective case, product month 0, NPV from its start and calendar NPV side by side). Archived products are not exported (listed in "Not in the consolidation"). No chart images in portfolio mode. Sheet names: 31 characters, without `[]:*?/\`, unique ignoring case. The display scope only chooses which set of sheets comes first.
- **Due-diligence pack**: decision = the **active** product only (name on `DD_Coverage`). The annotations (`DD_STATE`) are a common key of the document and the re-import reads the `DD_Register` sheet: a group of sheets per product would duplicate the same ids with contradictory states.
- **Report**: `buildScopedReport(pf, scope, now, productId?)`. Product = historical report of the effective case (byte-for-byte identical); Portfolio / Wave = "Portfolio" report (regulatory context per product, consolidated economics by wave / product / year, knowledge transfer, staged trajectory), entry gate: regulatory catalogue and one standard for at least one product of the scope. The controller reads `displayScope` from the store (not saved) or the explicit argument.
- **Snapshots**: `NamedSnapshot.portfolio` (whole portfolio without view state nor library) is added only for a real portfolio; `state` stays the case of the active product. Activate / set as baseline: commands `snapshots.activatePortfolio` / `snapshots.baselinePortfolio` (one undo step; active product and edit scope kept; potential re-fitted by `refitPortfolio`). Limits: a snapshot taken on a single case, activated on a multi-product portfolio, applies to the active product (P2 behaviour); the comparison is made on the active product (today's one if it exists in the snapshot); the size of a portfolio snapshot roughly doubles (state + portfolio).

### Implementation notes for P6

- **Domain** (`domain/portfolio/stress*.ts`): `portfolioMonteCarlo(pf, { draws, seed, rho })` (or `pfStressJob`, one step per planned product, to yield to the screen). Each product draws with the single-case engine (`mcDraws`, factored out of `runMonteCarlo`: same uncertain parameters, same spreads, same metric `mcOutcome` = net benefit over the product's horizon), seed `seed ⊕ djb2(productId)` (the seed itself with a single planned product: a one-product portfolio reproduces `runMonteCarlo` exactly, checked on the 100 `mcRun` fixtures). The result of a draw is the **sum** of the products' net benefits; the statistics (P10 / P50 / P90 / mean / CVaR 10 % / `pNetNeg`) come from `mcStats`, the same definition as the single case (`numerics.quantile`, thresholds `pNeg.ts`). Details and deviations: DEV-PF-STRESS.
- **Correlation `ρ`** (D-M7): portfolio field `rho` (absent = 0, saved, undoable command `portfolio.setRho`, validated in [0, 1], sheet `PortfolioSettings` "Correlation rho (0-1)", import without the row = 0, fingerprint `pf1:` of the calculation package if ρ > 0). Gaussian copula with a common factor: per draw and per random driver, `g = √ρ·Z + √(1−ρ)·ε`, Z shared by the products, ε the product's own, passed through Φ then through the inverse of the engine's triangular law: the marginal laws are those of the product alone whatever ρ; ρ = 0 is the historical stream (no copula), ρ = 1 gives the same shocks to all the products.
- **Risk reduction**: `portfolio P10 − Σ P10 of the products alone` (≥ 0 if diversified, 0 at ρ = 1), plus per wave and per product their own statistics and the correlation with the group.
- **Staleness**: `pfStressFingerprint` (effective case of each planned product via `mcFingerprint`, wave, start month, preparation, horizon, ρ); a run shows "the portfolio changed" as soon as the live fingerprint differs; the sheets / sections that read the run say so (Excel sheet "Stale", report).
- **Verdict**: `verdictRule` (extracted from `decide`, same thresholds `DI_THRESHOLDS`, same coherence invariant) applied to the distribution of the scope; `pfDecision(pf, run, group)` for the portfolio and each wave. The inputs change, not the rules: setup = Σ of the products, bar premium = mean of the products' premiums weighted by the entry headcount, conditions = the products that carry the risk. The Decision section shows this verdict when the display scope is Portfolio / Wave (≥ 2 products), with the deterministic net / ROI / payback of the scope and the table of the verdicts per wave; the product keeps today's screen.
- **State**: `pfSimStore` (`store/portfolioSimulation.ts`, derived data outside the document and the history, like `simStore`); `controllers/stressPortfolio.ts#runPortfolioSimulation` (asynchronous, one product per slice, progress, a new call replaces the previous one); draws and seed = view state (default: those of the active product's Monte Carlo).
- **Interface**: "Portfolio stress" section (`portfolio-stress`, Portfolio group, 85 sections in the catalogue at the time): draws, seed, ρ slider with an explanation, button, progress; cards, histogram (`ChartPanel` with hidden data), risk reduction, tables per wave and per product, staleness marker, links to Monte Carlo and Decision. No financial calculation in `ui/` (A8 extended to `store/portfolioSimulation.ts` and `verdict/decision/Portfolio*.tsx`).
- **Outputs**: Excel sheet "Portfolio stress" (after "Knowledge transfer", only if a run exists), section 7 of the portfolio / wave report.
- **Out of scope**: the sensitivity per portfolio (it stays per product; the portfolio scenarios table was added in lot 7), automatic re-run of the portfolio run. Truncation of the draws at the portfolio horizon was added later (each draw is cut like the consolidation, DEV-PF-STRESS).
- **Tests**: `tests/domain/portfolio/{stress,stressVerdict}.test.ts` (reproduction of the single case on all the `mcRun` fixtures, semantics of ρ, marginals, determinism, sign of the diversification, golden cases of the verdict, performance 20 products × 1,000 draws), `tests/store/{portfolio-rho,stress-portfolio}.test.ts` (command, undo, persistence, Excel, staleness, outputs), `tests/ui/portfolio-stress.test.tsx`.

### Implementation notes for P7

- **Version 20.0.0** (D-M8): `APP_VERSION`, `package.json` and its lock file, `index.html` title (v20); the file names (`AgentCase_v20_0_…`) are derived from the version. **Deliberately unchanged**: the schema tags (`agentcase.snapshot.v1`, `agentcase.portfolio.v1`), the name and version of the autosave database (`agentcase-v19`, 1) and the name of the `BroadcastChannel` (`agentcase-v19`), so as never to orphan the users' saves. (Since the documentation-governance lot, the version is written only in `app/package.json`; see BUMP_PROCEDURE.md.)
- **Example**: `docs/examples/AgentCase_Portfolio_Example.json` (4 products, 2 waves including an offset product, an unscheduled product, hub in proportion to the headcount with different subsets, ρ = 0.3, overrides), generated by `app/scripts/portfolio-example.ts`; `tests/store/portfolio-example.test.ts` opens it through the real open path and checks `validate()` and the conservation of the consolidated totals.
- **Exit checks**: `tools/e2e-smoke.mjs` visits every section, including the six of the Portfolio group, on two portfolio files; `tools/perf.mjs` also measures the change of section in the Portfolio group; figures in the CHANGELOG.
- **Still out of scope** (see ARCHITECTURE.md § 12 and DEVIATIONS.md DEV-PF-GAPS): portfolio sensitivity, pins on a shared team line, "apply to all" for the knowledge subset.

### Notes: "Show" / "Change" lists and in-place editing (after v20.10)

- **Top bar**: the pair of radio buttons "Edit: All products / This product only" is replaced by **one native "Change" list** (≥ 2 products,
  every view): **All products**, then "*name*" per product (in a Wave view, the wave's products first, then "Other products").
  Choosing a product = active product + scope `product`; All products = scope `all`. View state: not undoable, not saved (`editScope`
  unchanged, no new field). The View does not change; in a Product view, choosing another product shows it (the shown product is the edited product).
- **"For a child" labels (v20.11+)**: the view selector is called **"👁 Show"** (what you look at: "Portfolio", "Wave 1",
  "Payroll (Wave 1)", "Billing (unscheduled)", suffix "(archived)") and the edit list **"✏️ Change"** (where your changes go:
  "All products", "Payroll"). Icons `aria-hidden`, accessible names `Show` / `Change`, one-line tooltips. The "Editing:" chip is removed:
  the value of "Change" is enough. Announcements: "Showing Portfolio / Wave 1 / Payroll", "Changing all products / Payroll".
- **Rule "Change follows Show" (F17 revised)**: Show = a product (or "Edit this product") → that product becomes active **and** the target of Change (scope
  `product`); Show = Portfolio or Wave → Change goes back to All products (scope `all`). An explicit choice in Change does not touch Show.
- **Banners of the in-place editing**: "Changing all products (shared values)" / "Changing X only" (h2); "Shared values: every product that
  inherits a value follows; a product with its own value keeps it." / "Changing X only — the results above and elsewhere still show the Portfolio";
  button "Back to shared: X" (formerly "Reset to common"); section banner "Changing: all products (shared values)" / "Changing: product X".
- **Revised addressing rule**: with **All products** and a **Portfolio or Wave** View (`editsCommon`), a case command runs on
  the **common case** (`resolveCommon`: common values + hub layer, no override nor subset, team of the active product) and every
  change goes to the **common values**, including for a key that the active product overrides and for the Knowledge Hub fields (no subset);
  `teamIn` stays on the active product. One undoable step; undo / redo restore exactly. In a Product view, the P2 rule is
  unchanged (key already overridden → override).
- **Input sections in Portfolio / Wave**: the aggregated synthesis stays at the top; the section is **editable in place** below it, for the
  chosen product (its overrides) or for All products (the common values, with, per field, the products that keep their value and "Back to shared",
  which removes the override or the subset field). Data specific to the product (entry team; KT domains and preparation): not
  editable for All products (hint). The result sections always follow the View.
- **A single product**: nothing changes (neither list nor in-place editor).
