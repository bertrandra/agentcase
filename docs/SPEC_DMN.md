# SPEC_DMN — Parametric calculation in DMN, with a harness pack that evolves on its own

> Status: **specification, nothing built** (2026-11-02). Owner's request: model the parametric calculation (programme, scope early on, after the
> audit, at the pilot) in DMN; keep the agent-harness assumptions independent of the code because the harness will change often; document what
> lives in DMN and what stays outside; use FEEL, and let DMN trigger the calculations that stay outside.
> Builds on [SPEC_BPMN.md](SPEC_BPMN.md) (D-B1, D-B22, D-B24, D-B26; F-B51, F-B62), [SPEC_FIXES.md](SPEC_FIXES.md) (FX-D13 (d)) and
> [SPEC_HARNESS.md](SPEC_HARNESS.md) (draft: the engagement steps, cells, harnesses, statuses Simulated / Assessed / Piloted / Scaled, token
> profiles, metric versions). Terms follow SPEC_HARNESS: a **harness** is an agentic system (agents, tools, guardrails, context) covering cells.

## 1. Purpose

Today every parameter of the model is read straight from the case (`dom.values`, the BPMN document's `ac:programmeValues`, the immutable
catalogues of `domain/catalog`) by TypeScript code, and every formula that turns parameters into figures is TypeScript. Two needs are not met:

1. **The harness changes faster than the app.** Models, agent capabilities, token prices and the share of each activity an agent can take will move
   every few months. Today they are compiled-in catalogues (`domain/catalog/*.json`, the Agent Catalog, `coef.json`): a change is a code release,
   and the workbook import cannot change them (MIGRATION_PLAN § 15.2).
2. **A figure's value should depend on what we know.** Early on a parameter is an estimate; after the audit it is evidence; after the pilot it is a
   measurement. The case should use the best value it has, say where it came from and how accurate it is, without three engines.

DMN (OMG Decision Model and Notation 1.3) with FEEL gives a declarative, traceable, portable layer for both, next to the BPMN process the case
already holds. The time engine stays in TypeScript.

## 2. Decisions to take (owner)

| ID | Question | Options | Proposal |
|---|---|---|---|
| D-DM1 | Where does the parametric layer live? | (a) DMN with FEEL, evaluated by AgentCase; (b) TypeScript config objects | **(a)**: portable, traceable, editable without a release |
| D-DM2 | Where do the harness assumptions live? | (a) a separate, versioned **harness pack** (`.dmn` file); (b) inside each case | **(a)**: one pack for many cases; each case records the pack it used |
| D-DM3 | How far does DMN go? | (a) parameters, evidence selection, activity cost rules; (b) also the time series and Monte Carlo | **(a)**: see § 4; the series stay in the engine |
| D-DM4 | How does DMN reach the engine's calculations? | (a) FEEL calls to a closed registry of engine functions (§ 8); (b) DMN 1.3 Java / PMML function kinds; (c) none | **(a)**: no code in files, the registry is the contract |
| D-DM5 | Evidence stages | (a) estimate → audit → pilot → run, best available wins; (b) the user picks the stage | **(a)**, with a per-parameter override to pin a stage |
| D-DM6 | Default pack | (a) reproduces today's figures exactly (the 107 fixtures, golden); (b) a refreshed harness | **(a)** first; a refreshed pack is a recorded scenario, never a silent change |
| D-DM7 | FEEL subset | (a) extend AgentCase's safe subset (§ 7); (b) adopt a third-party FEEL interpreter | **(a)**, keeping D-B22 (no `eval`, bounded) |

## 3. What exists today (base to build on)

| Piece | Where | What it does |
|---|---|---|
| Safe FEEL subset (D-B22) | `app/src/domain/feel` | Hand-written scanner, parser and tree-walk evaluator: literals, names, lists, ranges, comparisons, `+ - * /`, `and` / `or` / `not`, unary tests; functions `count`, `sum`, `min`, `max`, `contains`. Length and depth capped, no `eval` |
| DMN 1.3 model and evaluator (D-B24) | `app/src/domain/dmn` | Input data, decisions with information requirements, decision tables of every hit policy, literal expressions; decision graph (`decide`, `decideAll`); reader / writer; DMN DI |
| Decisions in the case | `dmn/embed.ts`, `dmn/apply.ts` | Decisions live in the case's BPMN document (D-B26); a business-rule task bound to a decision applies it to the activities of its phase; gateway conditions read `decision.<id>` (F-B51) |
| Three rule families (F-B62) | `dmn/families.ts` | AI authority level per activity class, supervision split per authority level, quality-gate criteria |
| Programme cost profile | `domain/programme/{profile,costs,costProfile,catalogue}.ts`, `domain/tuneB/setup.ts` | Cost lines of the transformation programme: resources (FTE × months × target day rate × 1.15), euro inputs, curves, engine formulas |
| Time engine | `domain/time`, `domain/economics`, `domain/model` | Monthly series, ramps, S-curves, cash flow, NPV, payback, the setup spread over each activity's months |
| Stress | `domain/stress`, `domain/portfolio` | Monte Carlo per product and portfolio, correlation ρ, sensitivity |
| Catalogues | `domain/catalog/*.json` | Coefficients, engagement coefficients, locations, maturity map, model defaults, the default process |

Missing for this spec: business knowledge models (BKM, reusable formulas), boxed contexts, `if … then … else`, a few number functions, calls to
engine functions, and a DMN file that lives outside the case.

## 4. The boundary: what is in DMN, what stays outside

**Rule of thumb.** DMN decides *which value and which rule apply*, and computes **scalars** (one number, one choice, one band per activity, role,
product or case). The engine computes **series and distributions** (anything indexed by month, draw or iteration). DMN can trigger an engine
calculation by name (§ 8); the engine never re-implements a rule that DMN holds.

### 4.1 In DMN

| Content | DMN element | Example |
|---|---|---|
| Harness assumptions | Decision tables in the harness pack (§ 5) | Agent share, human share and effort factor per activity type × capability × harness generation; token use per artefact; agent capacity per role |
| Coefficient lookups | Decision tables | Industry, maturity, regulatory class, location → coefficient (today `coef.json`, `engageCoef.json`, `maturityMap.json`) |
| Evidence selection | Decision table, hit policy FIRST (or PRIORITY) | Measured if present, else audited, else estimated (§ 6) |
| Accuracy band | Decision table | Stage → low / high range (§ 6.2) |
| Activity cost rules | BKM per rule, invoked per activity | Programme and SDLC activities: fixed amount, resources, per-unit, % of another line (§ 9) |
| Pricing mode choice | Decision table | FX-D13 (d): `mode = "amount"` → the amount; `mode = "resources"` → FTE × months × rate × uplift |
| Scope rules | Decision tables (exists: F-B62) | Authority level, supervision split, quality gate; conditions of the gateways |
| Opt-in and applicability | Decision tables | Which programme activities apply (regulatory, size, wave) |
| Triggers of engine calculations | FEEL invocation of a registered engine function (§ 8) | `ac.spread(amount, months, "linear")`, `ac.scurve(...)` returning a scalar summary or a handle the engine expands |
| Explanations | The decision graph itself | Each figure → its decisions → its inputs and their stage |

### 4.2 Outside DMN (TypeScript engine, unchanged in role)

| Content | Why not DMN |
|---|---|
| Monthly series: ramps, adoption curves (bass, logistic, Gompertz, spline), spend over an activity's months, run cost, savings | Indexed by month (12–120 values); FEEL list comprehensions would be slow, unreadable and hard to pin to the fixtures |
| Cash flow, cumulative, NPV, payback, ROI (`economics/cashflow.ts`, `headline.ts`) | One owner per figure already; parity-tested on 107 fixtures |
| Monte Carlo, correlation, sensitivity (`domain/stress`) | Thousands of draws; DMN gives the distributions' parameters, the engine samples |
| Iterative fits: potential and glass ceiling re-fit, scope fit | Iteration and convergence, not decision logic |
| Portfolio consolidation, waves, timelines | Structural, cross-product |
| Persistence, migrations, undo | Not calculation |

### 4.3 The contract between the two

DMN produces a typed **resolved-parameter set** per case (per product in a portfolio): scalars, choices and bands, each with its source (pack id
and version, decision id, evidence stage). The engine reads only that set, never `dom.values` or a catalogue directly, for every parameter that
moved to DMN. A parameter not yet moved keeps its current path (migration is gradual, § 13).

## 5. The harness pack (independent of the code)

### 5.1 What it is

The **assumptions about harnesses**, not the harnesses themselves. A case's harnesses (SPEC_HARNESS § 7: owner, coverage of cells, costs) stay
in the case's document; each references a **harness type** of the pack (e.g. "code-generation harness", "test harness", "review harness"),
whose capability profile, token profile and capacity the pack holds. When the technology moves, the pack moves; the case's harnesses and
their coverage do not.

A DMN 1.3 file (`.dmn`) with an `ac:harnessPack` header: `id`, `name`, `version` (semver), `date`, `generation` (free text, e.g. "agents
2026-Q4"), `basedOn` (previous version), `hash` (canonical content). It holds only harness assumptions and coefficient tables (§ 4.1 first two
rows), never a case's data.

### 5.2 The interface (decision service)

The pack exposes one DMN **decision service** per family, with fixed inputs and outputs, versioned separately from the pack (`interface: 1`):

| Service | Inputs | Outputs |
|---|---|---|
| `svc_activity_split` | activity type, harness type, regulatory class, authority level, stage | agent share, human share, effort factor, confidence |
| `svc_tokens` | activity type, harness type, model tier | runs per day, context and output size, routing / cache / retry overhead, cost per 1M tokens and its trend (SPEC_HARNESS § 11) |
| `svc_agent_capacity` | role, capability | artefacts per agent-month, supervision ratio |
| `svc_coefficients` | industry, maturity, location, regulatory | the coefficient set of `coef.json` / `engageCoef.json` / `maturityMap.json` |

A new harness generation changes the tables behind a service, not the service. A change of the service's inputs or outputs is an interface
version; the engine supports the current and the previous interface (one migration step, as the file schema does).

### 5.3 Lifecycle

- **Shipped:** the app embeds the default pack (D-DM6 a: it reproduces today's figures to the cent on the 107 fixtures and the portfolio
  fixtures).
- **Imported:** a pack file is validated (DMN 1.3 XSD + `ac:` XSD, interface check, FEEL check, a dry run on the golden case) and stored in the
  workspace library next to the snapshots; nothing changes until a case adopts it.
- **Adopted per case:** the case records `harnessPack = {id, version, hash}`. Opening a case whose pack is missing or differs shows the banner of
  the calculation package ("computed with another version"), with the choice to keep the recorded figures, adopt the available pack, or import
  the missing one.
- **Compared:** two packs on one case give a side-by-side of every resolved parameter and every headline figure (a **harness scenario**).
- **Overridden by evidence:** a pilot or audit value on the case always wins over the pack for that case (§ 6).

## 6. Evidence stages across the case's lifecycle

### 6.1 Best available evidence

Each parameter that can be observed has up to four input data nodes, one per stage:

The stages are the model statuses of SPEC_HARNESS § 1 and the metric versions of its § 12:

| Stage | Status (SPEC_HARNESS) | When | Source in AgentCase |
|---|---|---|---|
| `estimate` | Simulated | As-is scope and full simulation (steps 1–2) | The harness pack and the case's typed inputs |
| `audit` | Assessed | After the sampled or full audit (step 3) | 🔎 Audit observations per cell (`ac:auditHeader`, D-B26); sampled cells only, the others keep `estimate` |
| `pilot` | Piloted | After the pilot on the selected subset (step 5) | Measured KPIs of the pilot cells ("as measured") |
| `run` | Scaled | Waves and run (step 6) | Measured values of the run, per wave |

Evidence is per **cell** (activity × team × product) where SPEC_HARNESS defines cells, per activity before that: an audited sample improves the
sampled cells; the decision table can also take a stratum's audited mean for the unsampled cells of the same stratum, with the wider band of
§ 6.2 (SPEC_HARNESS HX-D10 decides the sampling).

One decision per parameter, hit policy FIRST, rows in order `run`, `pilot`, `audit`, `estimate`: the first stage with a value wins. A per-case,
per-parameter **pin** (input `pinStage`) forces a stage, e.g. to show "what the estimate said" next to "what the pilot measured".

### 6.2 Accuracy band

A decision table maps the stage (and, where known, the sample size) to a range, by default in the spirit of AACE estimate classes:
`estimate` −30 % / +50 %, `audit` −15 % / +20 %, `pilot` −10 % / +10 %, `run` −5 % / +5 %. The band is an output of the resolved parameter;
the Monte Carlo uses it as the parameter's spread when the case has no explicit distribution, so the stress narrows as evidence arrives.

### 6.3 What the screens show

Each figure that depends on a resolved parameter can show its chain: figure → decision → parameter value → stage → source (pack and version, or
audit item, or pilot measurement) → band. This replaces hand-written provenance in the due-diligence and assumption registers.

## 7. FEEL: what we use and the extensions needed

Kept from D-B22: AgentCase evaluates FEEL itself, no `eval`, length and depth capped, no regular expression built from text.

| Already there | To add (bounded, pure) |
|---|---|
| Literals, names, lists, ranges, comparisons, `+ - * /`, `and` / `or` / `not`, unary tests; `count`, `sum`, `min`, `max`, `contains` | `if … then … else`; boxed **contexts** (`{a: 1, b: a * 2}`); **BKM invocation** with named parameters; `for x in list return …` and `some` / `every … satisfies` over lists of at most N items (N = 500); number functions `round half up`, `floor`, `ceiling`, `abs`, `mean`, `product`, `decimal`; `list contains`, `index of`, `sublist`; string `upper case`, `lower case` for matching only; `get value` on a context |

Out of the subset: date / time arithmetic beyond month counts, `matches` with user regex, recursion, external Java / PMML function kinds.
Numbers: FEEL decimals are evaluated as IEEE doubles with the engine's rounding rules, so the default pack matches the TypeScript figures
bit for bit (D-DM6).

## 8. Engine functions triggered by DMN

DMN calls the calculations that stay outside through a **closed registry** of engine functions, invoked from FEEL as `ac.<name>(…)`. It is the
only way out of DMN; a file cannot add a function.

### 8.1 Registry rules

- Each function is pure, deterministic, bounded in time, and declared with a typed signature (`name`, parameters with FEEL types, result type,
  unit, version).
- A pack or a case lists the functions it uses (`ac:requires name@version`); a missing or newer function makes the import fail with a clear
  message, never a silent fallback.
- Results are **scalars or handles**. A handle (`{kind: "series", ref}`) names a series the engine computes and keeps; DMN can pass it to another
  engine function or reduce it to a scalar (`ac.total(h)`, `ac.at(h, month)`), but cannot iterate over its months.
- Evaluation is cached per case and per input hash; a Monte Carlo draw does not re-run DMN: DMN outputs the parameters and their bands, the
  engine applies the draws (§ 4.2).

### 8.2 First functions

| Function | Returns | Engine owner today |
|---|---|---|
| `ac.dayRate(role, location mix)` | Target blended day rate | `domain/rates.ts` (rate card), `targetBlendedTJM` in `domain/model` |
| `ac.resourceCost(fte, months, rate, uplift)` | Amount | `domain/programme/costs.ts` |
| `ac.spread(amount, start, months, profile)` | Series handle | `domain/programme/profile.ts` (one-off, spread, adoption curve) |
| `ac.curve(family, params, horizon)` | Series handle | `domain/time` S-curves (bass, logistic, Gompertz, spline, legacy) |
| `ac.total(h)`, `ac.at(h, m)`, `ac.peak(h)` | Scalar | — (new, thin) |
| `ac.tokenCost(tokens, tier)` | Amount | `domain/tokens.ts` |
| `ac.ceiling(scope)` | Glass ceiling | `domain/model/ceiling.ts` |

### 8.3 What triggers what

1. A change of a case input, an audit observation, a pilot measurement or the adopted pack marks the resolved-parameter set stale (the store's
   selective refresh already tracks inputs).
2. DMN is evaluated once (decision graph, cached by input hash): it resolves the parameters, picks each activity's cost rule and calls the engine
   functions the rules need.
3. The engine runs the time series, cash flow and headline from the resolved set and the handles.
4. The stress runs the draws on the resolved set's distributions.

## 9. Activity cost rules (programme and SDLC)

Each activity of the process gets a cost rule as a BKM, chosen by a decision table on the activity's type and its `pricingMode`:

| Rule (BKM) | Formula (FEEL, with engine calls) | Used by |
|---|---|---|
| `bkm_amount` | `ac.spread(amount, start, months, profile)` | Tooling; FX-D13 (d) training / governance in mode "amount" |
| `bkm_resources` | `ac.spread(ac.resourceCost(fte, months, ac.dayRate(role, mix), uplift), start, months, profile)` | Training / governance in mode "resources" (default), coaching, pilot |
| `bkm_per_unit` | `ac.spread(units * unitCost, start, months, profile)` | Integrations, procurement days, AI Act days |
| `bkm_share_of` | `share * ac.total(otherLine)` | Hypercare, contingency-like lines |
| `bkm_engine` | named engine function | Change management (HRI), Knowledge hub (formulas kept in the engine) |

The decision table `dec_cost_rule` (inputs: activity type, pricingMode, opt-in, wave) returns the BKM name and its arguments; FX-D13 (d) is one
row pair of it. The programme lines, the setup total and the strategies' scaling then read the resolved lines, not separate code paths.

## 10. Storage and files

| Content | Where | Format |
|---|---|---|
| Harness pack | Workspace library (IndexedDB), exported as its own file | `.dmn` (DMN 1.3 + `ac:harnessPack`, `ac:requires`) |
| Case decisions (scope rules, cost-rule table, evidence pins) | The case's BPMN document, as today (D-B26) | Embedded DMN |
| Evidence values (audit, pilot, run) | The case's BPMN document (audit already there; pilot / run measurements beside it) | `ac:` extension elements |
| Pack reference | The case (calculation package) | `{id, version, hash}` |
| Engine function registry | Code | TypeScript, versioned with the app |

Exports: the case's BPMN export carries its decisions (as today) and the pack reference; the harness pack exports on its own so DMN tools
(Camunda, Trisotech, KIE) can open it, with the `ac.*` calls shown as named functions they cannot evaluate.

## 11. Screens (sketch)

- **🧠 Harness** (Configure group): the packs in the library, the adopted one per case / product, import, compare two packs, open a table
  (dmn-js read-only first, editing later).
- **Evidence** column in the parameter screens: value, stage, band, source link; a pin control.
- **Why this figure?** on every KPI: the decision chain of § 6.3.
- The 🧩 Process activity panel shows the activity's cost rule and its arguments (FX-D13 (d)).

## 12. Tests and parity

- The default pack reproduces today's figures exactly: 107 case fixtures, 40 workbooks, portfolio fixtures, golden (D-DM6 a). Any difference
  fails, as the parallel run does.
- Pack contract tests: every service's inputs and outputs, the registry signatures, a pack from the previous interface still opens.
- FEEL: property tests of the extended subset (bounded length and depth, no exception escapes, round trip parse / print), fuzzing on hostile
  files (as `xss-test`, FX-58).
- Evidence: a parameter with estimate / audit / pilot values resolves in stage order; a pin wins; bands narrow the Monte Carlo spread.
- Performance: DMN evaluation of the golden case under 20 ms; no DMN evaluation inside a Monte Carlo draw.
- Interop: the pack opens in one external DMN modeller; the decision tables evaluate the same there for rows without `ac.*` calls.

## 13. Phases (one PR each)

| Phase | Content | Exit |
|---|---|---|
| DM0 | Decisions D-DM1…D-DM7 recorded | This file updated |
| DM1 | FEEL extensions (§ 7), BKM and boxed context in `domain/dmn`, the engine-function registry (§ 8) with 3 functions | Property tests; existing DMN tests unchanged |
| DM2 | Resolved-parameter set and its contract; one parameter family (programme training / governance, FX-D13 d) moved to DMN | Figures identical by default; mode "amount" priced as the legacy |
| DM3 | Harness pack format, the default pack (coefficients, agent split, tokens, capacity), import / adopt / banner | 107 fixtures identical |
| DM4 | Evidence stages and bands; audit values wired; pilot measurements entered | Stage tests; bands feed the stress |
| DM5 | Activity cost rules for every programme and SDLC activity (§ 9) | Programme and setup figures identical by default |
| DM6 | Screens: 🧠 Harness, evidence column, "Why this figure?", pack compare | axe clean, render budgets |
| DM7 | Release, guide, a second pack as a worked harness scenario | All gates green |

## 14. Risks

| Risk | Mitigation |
|---|---|
| Parity drift when a formula moves from TypeScript to FEEL | Move one family per phase; the default pack must match to the cent; parallel run on the full corpus |
| FEEL subset grows into a programming language | Closed list of § 7; anything indexed by month goes to an engine function |
| Performance (DMN in hot paths) | Cache by input hash; never inside a draw; budget test |
| A pack written for one interface used on another | Interface version in the pack; check at import; one-step migration |
| Users editing packs break figures silently | Packs are adopted explicitly per case; compare view before adoption; recorded in the calculation package |
| External DMN tools cannot run `ac.*` | Documented; pure tables stay portable |

## 15. Relation to SPEC_HARNESS

| SPEC_HARNESS | Here |
|---|---|
| § 1 statuses, § 12 metric versions (as simulated, as proposed, as measured) | Evidence stages (§ 6): one decision picks the version a figure uses |
| § 6 assessment priced, expected confidence | Accuracy bands (§ 6.2) per stage and sample size |
| § 7 harnesses (owner, coverage, costs) | Case data; their **type** points into the harness pack (§ 5) |
| § 11 token economy (per activity type, per harness) | `svc_tokens` of the pack |
| § 13 one monthly engine, one owner per figure | Unchanged: the engine owns every series (§ 4.2); DMN only resolves its parameters |
| § 16 lots S1…S9 | DM2–DM5 can run beside S1–S4; DM3 (pack) before S4 (harness definition) is the natural order |

## 16. Relation to the open items

- FX-D13 (d), pricing mode per activity: § 9, phase DM2 (can replace its X7 implementation).
- MIGRATION_PLAN § 15.2, immutable catalogues (Agent Catalog capacity, loop external %): § 5, phase DM3.
- SPEC_BPMN F-B62 rule families: unchanged, they become the first decisions of the case side.
