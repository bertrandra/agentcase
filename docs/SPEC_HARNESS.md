# AgentCase — Specification: from the customer's as-is to the scaled transformation (scope, assessment, target, pilot, scale, run)

> Status: **draft for the owner's review (2026-10-31)**, second version (the owner's six steps). Base: `main` after v21.6.0 + SPEC_FIXES lot X0
> + the Process diagram options. Related: [SPEC_BPMN.md](SPEC_BPMN.md) § 15 (audit), § 16 (organisation, "who does what"), § 19 (programme),
> § 21 (organisation × portfolio), [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) (waves, consolidation), [SPEC_FIXES.md](SPEC_FIXES.md) (FX-D2,
> FX-D6, FX-D7, FX-D14). Rules unchanged: one owner per figure in `src/domain`, every document change an undoable command, view state never
> undoable, existing figures identical unless recorded in DEVIATIONS.md, files ≤ 150 lines, one PR per lot on green CI.

## 1. The engagement, step by step

| Step | What happens with the customer | Model status | What the model computes |
|---|---|---|---|
| 1. **As-is scope** | The customer's perimeter today: organisation, teams, products, activities, with the **as-is numbers** (FTE, rates, locations, volumes) | — | The as-is cost of the perimeter, per cell (§ 4) |
| 2. **Full transformation simulation** | A first business case of transforming the whole perimeter | **Simulated** | Exactly what the case and 📅 Plan compute today (§ 5) |
| 3. **Assessment** | A **sampled or full audit** of the perimeter, based on its organisation and activities, **priced** before it is sold | **Assessed** | The audit's price, days and expected confidence per option; after the audit, the baseline (audited + extrapolated values), frozen (§ 6) |
| 4. **Target scope** | What will be transformed: organisation, product, activities **at any level**, down to **part of a team on one activity** | (Assessed) | The target cells, the harnesses covering them, the business case of the target (§ 7) |
| 5. **Pilot** | A selected subset of the target | **Piloted** | The pilot's business case and plan; its measured KPIs (§ 8) |
| 6. **Scale** | Waves over `target − pilot`; then the **run**: the customer runs it, the run is **shared**, or the run is **fully external** | **Scaled** | The scaled business case, per wave, slice, harness, unit, portfolio, and per run model the customer's and the provider's P&L (§ 9) |

**Cell** — the smallest unit of scope: one **activity** performed by one **team** for one **product** (`c = (p, i, τ)`), with the FTE the team
spends on it. Every scope of this spec (perimeter, sample, target, pilot, wave slice) is a set of cells, possibly with a **fraction** of a cell
(`φ_c ∈ (0, 1]`: "3 of the 8 developers" on that activity).

**Selection rule** — a scope is stored as a rule, not as a list of cells, so it follows the model's edits: include / exclude by **unit** (and its
sub-units), **team**, **product**, **phase**, **activity**, **harness** or one **cell**, each with an optional fraction. The rule is resolved to
cells by one owner (`scope/cells.ts`, new).

**Harness** — an agentic system (agents + tools + guardrails + context) that automates part of the work of **several cells**, owned by a
**product**, an **organisation unit** (a shared service) or the **portfolio**; one harness can serve several products.

## 2. Today's calculation chain (what exists, file by file)

### 2.1 Activity → product drivers (`domain/scope.ts`, `model/ceiling.ts`, `inputs.ts`, `store/derive.ts`)

For product *p* with scope *S_p* (the in-scope activities of the active phases), each activity *i* has an effort weight *w_i*, a human supervision
share *h_i* (%) and an agent share *a_i* (%):

- effort share: `e_i = w_i / Σ_{j∈S_p} w_j`
- `avgAgent_p = Σ e_i · a_i`, `avgHuman_p = Σ e_i · h_i` (`phaseScope`, rounded)
- automation potential: `auto_p = min(techCap, avgAgent_p)` when "Fit to selected scope" is on (`fitPotential`), else the typed input
- glass ceiling: `ceiling_p = avgHuman_p` (`computeGlassCeiling`; a forced ceiling overrides it)

**Activities enter the engine only through these two averages.** Nothing downstream is per activity.

### 2.2 Product drivers → effective automation (`model/drivers.ts`)

`eff_p = min(100 − ceiling_p, auto_p × lifecyclePosture × glassFactor × khMult)` — one number per product (%).
Ramps: `ramp_y = min(rampCap, input_y × rampSpeed × hriFactor)` for Y1..Y3, then a fitted curve (spline by default) gives the monthly adoption
*r_p(t)* ∈ [0, 100] %.

### 2.3 Product month *t* (`time/kernel.ts` `econ`, the single source of the monthly arithmetic)

```
agentVfte(t)  = baseEtp × r(t) × eff                      (capped by supervision capacity, supCeilVfte)
humanFte(t)   = baseEtp − agentVfte(t)
teamCost(t)   = humanFte × dayRate × wd/12
tokenCost(t)  = agentVfte × wd/12 × runsPerDay × tokensPerArt / 1e6 × tokenUnitCost
infraCost(t)  = infraMonth (when agents > 0)
runTeam(t)    = (floor + agentVfte × opsPerAgent) × dayRate × 1.15 × wd/12
totalRun(t)   = teamCost + tokens + infra + runTeam + knowledgeHub
grossSav(t)   = baselineRun/12 − totalRun + ktAvoided − vTax − loopExt − complianceTax + optInSavings
setup(t)      = setupProfile[t]   (programme lines, `programme/profile.ts`, B9b)
net(t)        = grossSav(t) − setup(t);   NPV at the case rate, payback = first month the cumulative stays ≥ 0
```

`baseEtp` and `baselineRun` come from the **team** (FTE × rate card × location mix), not from the activities.

### 2.4 Product → wave → unit → portfolio (`portfolio/*`)

- **Wave schedule** (`waveSchedule.ts`): `month0_p = waveStart + offset_p`, moved by wave dependencies (start / setup end + lag) and the
  transformation team's capacity (`maxConcurrentSetups`).
- **Consolidation** (`consolidate.ts`, `series.ts`): every portfolio figure = Σ over products of the product's own engine months shifted to the
  calendar (`T = month0_p + t`). Flows are 0 outside a product's months, stocks are held. NPV at the common rate.
- **Shared lines / services** (`sharedTeam.ts`, `serviceShares.ts`, B10c): a shared line gives each product FTE × share; `split: 'effort'` shares
  by the effort of the service's activities in each product (D-B38).
- **Unit / Wave scopes** (`scopeGroup.ts`): the same sums over the products a unit owns (directly or through sub-units) or a wave holds.
- **Monte Carlo**: per-product draws, one correlation ρ for the portfolio (FX-D2).

### 2.5 📅 Plan (`programme/planBundle.ts` and siblings) — views, nothing stored

| View | Today's rule |
|---|---|
| Gantt (`plan.ts`) | Case-level bars once (engagement stages, assurance) + each product's programme bars shifted by `month0_p` (− onboarding end) |
| WBS / dictionary (`wbs.ts`) | Programme → stages / setup / build / run, codes 1.x |
| OBS (`obs.ts`) | Organisation → units → teams → roles (FTE); Transformation team (operating-model roles, Y1 FTE); AI agents |
| RAM | WBS × programme lanes |
| Programme histogram (`histogram.ts`, `histogramPortfolio.ts`) | Each programme line's monthly spend / its day rate = person-days, stacked by lane; capacity = Y1 operating-model FTE; portfolio = sum on the calendar + setup-capacity flags |
| Delivery histogram (`histogramDelivery.ts`) | Engine FTE before / after per role, Product scope only |

### 2.6 Audit and calibration today (`audit/analysis.ts`, `audit/calibrate.ts`)

- Each activity is audited or not; coverage = share of the in-scope activities audited, by count and by effort (`coverage`).
- Calibration proposes new parameters **only for the audited activities themselves** (effort scaled by the observed hours, rework probability,
  automation → AI authority); an activity that was not audited keeps its catalogue values. There is no sample and no extrapolation.

### 2.7 Who does what today (`org/views.ts`, F-B38) — a view, no figure reads it (FX-D7)

An activity's effort is split evenly between its RACI **Responsible** roles (`rShare`); each role's share is carried by the teams that provide
its team skill to the product, in proportion to their FTE on that skill (`fteOn` = the team's lines on the skill × its share of the product).
That is already the **cell** of this spec, in effort points, not yet in FTE or euros.

### 2.8 Engagement and commercial models today (`engagement.ts`, `pdc/commercial.ts`)

One engagement context per case — **STA** (staff augmentation), **MSI**, **MSC** (managed service, full control) — sets the ramp, the glass
factor and the billable share of the setup (`setupBillable`). The Commercial screen compares four models on the engine's years: **ET** (effort &
tools: human FTE × day rate + pass-through with a markup), **AAH** (AI-augmented humans: uplifted day rate), **AGS** (Agentshore: human + billed
share of agent capacity × a capacity price), **GS** (gain sharing: discounted baseline + a share of the savings), each with revenue, cost, margin
and the client's saving. It is one context and one model for the whole case and the whole horizon; it does not move the headline.

## 3. Where the data sits

All stored data stays in the case's BPMN document (D-B26), so it travels with the case file and the `.bpmn` export. **Figures are never stored.**

| Data | Where it sits | Owner in `src/domain` |
|---|---|---|
| Perimeter (step 1): units, teams (lines: skill, grade, location, FTE), products, activities, RACI, as-is numbers | As today: organisation part of the **common** document (units, teams, owners, B10a), process part (activities, RACI), form values (rates, volumes) | `org/*`, `process/*` |
| Status per product (`Simulated / Assessed / Piloted / Scaled`, date) | Organisation part: `ac:caseStatus product status asOf` | `org/status.ts` (new) |
| Scopes as rules: **perimeter**, **audit sample**, **target**, **pilot**, **wave slices** | Organisation part: `ac:scope id kind="perimeter|sample|target|pilot|slice"` with `ac:include` / `ac:exclude` (`unit`, `team`, `product`, `phase`, `activity`, `harness`, `cell`, `share`) | `scope/cells.ts` (new) |
| Audit options (full / sample n / sample coverage %) and the chosen one; price parameters (days per unit, auditor rate, expenses) | Options: audit header `ac:auditPlan` with `ac:option`; **prices and rates: case values, not the BPMN model** (§ 17) | `audit/pricing.ts` (new) |
| Sample drawn (seed, strata, drawn cells) | `ac:sample seed strata` with `ac:sampled cell="P1/A017/T3"` | `audit/sample.ts` (new) |
| Baseline (as-is, frozen at the Assessed gate) | A second `bpmn:process` `ac:baseline="true" frozenAt` in the **product's** document; the audit moves onto its elements (per product: settles FX-D6) | `process/baseline.ts` (new) |
| Link to-be → as-is | `ac:baselineRef` on each to-be task | `process/baseline.ts` |
| Harness (owner, agents, tools, capability, build pod template and drivers, sourcing share) | Organisation part: `ac:harness id owner` with `ac:agentRef`, `ac:toolRef`, `ac:capability`, `ac:build` (`ac:podRole role mix`, drivers, months), `ac:sourcing internalPct` | `org/harness.ts` (new) |
| Harness run process (activities, RACI, drivers, agent share) | A `bpmn:process ac:harnessRun="H1"` in the **common** document (default template, editable like the delivery process); platform costs on `ac:run` | `process/harnessRun.ts` (new) |
| Coverage (which cells a harness serves) | `ac:harnessRef` on each to-be activity (all its cells), narrowed by a rule on the harness when only some teams use it | `process/harnessCoverage.ts` (new) |
| Run model per slice / harness / product (R1 transfer, R2 shared, R3 external), with a switch date and the commercial model | Who runs what: the provider as a **participant** in the organisation part; the run model, commercial model and fees: **case values per scope id, not the BPMN model** (§ 17) | `commercial/runModel.ts` (new) |
| Token profiles: per activity type (runs per day, context, output), per harness (routing, cache, retry, overhead), price trends and volume tiers | Activity types: process part (catalogue defaults); harness routing: `ac:tokenProfile` on `ac:harness`; **prices, trends and tiers: case tables with `TOKEN_MODELS`, not the BPMN model** (§ 17) | `tokens/*` (new folder) |
| Frozen versions (as simulated, as proposed): inputs + computed series + calculation version | The snapshot library (case snapshots), with the series attached, read-only | `snapshots/versions.ts` (new) |
| Measurements (as measured) | A measurements part of the case (`metric, scope, month, value, source`), **not the BPMN model** (§ 17) | `metrics/measures.ts` (new) |
| Waves (pilot = wave 0) and their slices | The **portfolio-level BPMN document** (FX-D14 decided (a)): waves as sub-processes (the pilot as wave 0), slices as scope rules, capacity on lanes; a single case stores them in its own document | `portfolio/waves.ts`, `portfolio/slices.ts` (new) |

## 4. Step 1 — the as-is scope

**4.1 Cells and their FTE.** For product *p*, activity *i* with effort weight *w_i* (all activities of the process, in or out of scope), Responsible
roles *R_i*, team *τ*:

```
load_piτ   = Σ_{r∈R_i} (w_i / |R_i|) × fteOn(τ, skill_r, p) / Σ_τ' fteOn(τ', skill_r, p)        effort points of the cell (the F-B38 rule)
FTE_c      = FTE_τp × load_c / Σ_{c' of τ and p} load_c'                                       each team's FTE for p (its lines × its share of p) spread over its cells
cost_c     = FTE_c × dayRate_τ × wd                                                             as-is cost a year (the team's own rate and location mix)
```

A product without RACI or teams has one implicit team (the product team, today's `teamIn`) and one cell per activity: `FTE_c = baseEtp × w_i / Σ w`.

**4.2 Consistency.** Σ_c FTE_c = Σ_τ FTE_τp = baseEtp_p and Σ_c cost_c = baselineRun_p by construction (each team's FTE and rate stay its own). A team whose skills no activity uses is flagged
(capacity without work); an activity whose Responsible skill no team provides is flagged (work without capacity).

**4.3 Views.** The perimeter per unit / team / product / phase / activity: FTE and as-is cost, as a table and as the diagram's colours (§ 14).

## 5. Step 2 — the full transformation simulation (today's case)

Status **Simulated**. The perimeter is the target, one implicit harness covers every in-scope cell, one slice goes live at the product's month 0,
and the run model is the case's engagement context: the business case and 📅 Plan are **exactly today's** (§ 2). This is the parity anchor of
every later step: a case that defines nothing new keeps all its figures (gate of lot S2).

## 6. Step 3 — the assessment: sampled or full audit, priced

**6.1 Strata.** The perimeter's cells are cut into strata, phase × task type × team by default (HX-D9); a stratum is the unit of extrapolation.

**6.2 Options and their price.** The tool prices several options before the audit is sold: **full audit** (every cell), **sample n cells**, or
**sample to an effort coverage** (e.g. 60 %). For an option *O* with sampled cells *A_O*, the teams *Θ_O* and roles *Ρ_O* they touch:

```
fieldDays_O = d_frame + Σ_{τ∈Θ_O} d_team + Σ_{c∈A_O} (d_interview + d_observe) + Σ_{r∈Ρ_O} d_role
days_O      = fieldDays_O × (1 + α_analysis) + d_report
price_O     = days_O × auditorRate × (1 + expenses %)
```

Defaults (editable in the audit plan): `d_frame` 2, `d_team` 0.5 (workshop), `d_interview` 0.25, `d_observe` 0.25, `d_role` 0.25,
`α_analysis` 30 %, `d_report` 3, auditor rate = the programme's role rate (target blend × 1.15) unless typed.

For each option the tool shows days, price, **effort coverage** and the **expected confidence**: the half-width of the 80 % interval of the
perimeter's as-is cost, from the strata's spread (a default coefficient of variation per stratum before any observation, the observed spread
after). The chosen option becomes the **Assessment stage's cost line** (labour from resources, the B9b rule): it is in the business case, the
programme histogram (auditors' lane) and the Plan.

Example (illustrative): one product, 3 teams, 8 roles, 180 cells. Full audit: field 2 + 1.5 + 90 + 2 = 95.5 d, × 1.3 + 3 = 127.15 d, at €900
a day = **€114,435**. Sample of 30 cells (about 60 % of the effort, drawn proportionally to effort): field 2 + 1.5 + 15 + 2 = 20.5 d, × 1.3 + 3 =
29.65 d = **€26,685**, with a wider interval on the baseline.

**6.3 Drawing the sample.** Cells drawn **with probability proportional to FTE** inside each stratum, at least one per stratum that has FTE,
seeded (reproducible; `audit.drawSample`, undoable; the auditor can swap a cell, recorded). Drawn cells get the audit status *planned*.

**6.4 Extrapolation.** For each observed field *x* (effort per item, hours, rework rate, as-is automation `a⁰`, human share) and stratum *s* with
audited cells *A_s* (weights FTE_c):

```
ratio_s(x) = Σ_{c∈A_s} FTE_c · observed_c(x) / Σ_{c∈A_s} FTE_c · modelled_c(x)      efforts and hours
mean_s(x)  = Σ_{c∈A_s} FTE_c · observed_c(x) / Σ_{c∈A_s} FTE_c                       shares and rates
not audited c ∈ s:  x_c = modelled_c(x) × ratio_s(x)   or   mean_s(x);   a stratum with no audited cell keeps the declared value
```

Provenance per value: **audited**, **extrapolated**, **declared** (the evidence ledger, D-B33, grades them in that order). The spread inside a
stratum becomes the Monte Carlo spread of its extrapolated values. Example: stratum "Build × Human × T3", 10 cells, 120 modelled days; 3 audited
(50 modelled days) observed at 65 days and at `a⁰` 10 / 20 / 0 % (weights 20 / 20 / 10): `ratio` 1.3, the 7 others go from 70 to 91 days,
`a⁰` = 12 % for them.

**6.5 Gate.** `process.freezeBaseline` (undoable; re-baselining is an explicit command, HX-D7) writes the baseline with values and provenance,
sets **Assessed**, and the team FTE per role can be recalibrated from it (calibration log, F-B29).

## 7. Step 4 — the target scope and its business case

**7.1 Target.** A selection rule at any level (§ 1): e.g. "unit Payments, phases Build and Test, except team T4", or "activity A017, team T3,
share 0.375" (3 of 8 developers). Resolved to cells with their fraction `φ_c`; the **addressable FTE** is `F_target = Σ_{c∈target} φ_c FTE_c`.

**7.2 Harnesses** cover target cells (§ 3). Per (product, harness) group, on the covered cells with weights `φ_c FTE_c`:

```
E_pH    = Σ_{c∈C_p(H)} φ_c FTE_c                                   covered FTE
ā_pH    = Σ φ_c FTE_c · (a_i − a⁰_c)⁺ / E_pH                       agent share still to gain (a⁰ from the baseline, 0 when none)
h̄_pH    = Σ φ_c FTE_c · h_i / E_pH                                 human supervision kept
eff_pH  = min(100 − h̄_pH, min(techCap, ā_pH) × lifecyclePosture × glassFactor × khMult)
```

**7.3 Monthly automation.** With the slices *s* of § 8–9 (pilot, then waves), each going live at `g_s`, and the harness capability `c_H(T)` ∈ [0, 1]
(0 before the harness is ready, rising to its maturity; it replaces today's single `harnessMat`):

```
agentVfte_p(T) = Σ_s (r_p(T − g_s)/100) × Σ_H  E_pHs × eff_pH/100 × c_H(T)        E_pHs: covered FTE of slice s; r = 0 before go-live
```

then the kernel of § 2.3 unchanged (`humanFte = baseEtp − agentVfte`, team cost, tokens, run team, taxes). Cells outside the target, or in the
target but covered by no harness, keep their human cost: they save nothing (HX-D2).

**7.4 Parity.** With no explicit target, the target is the whole perimeter, one implicit harness covers the in-scope cells, and its group values are
today's averages applied to the whole team (`E = baseEtp`, `eff_pH = eff_p`): `agentVfte = baseEtp × r × eff`, **today's figures**. With an
explicit target, automation applies to the **target's FTE only** (HX-D12): a case that defines a target moves on purpose (recorded deviation
class, not a regression).

**7.5 Harness costs.** Build `B_H` = labour from resources (roles × FTE × months × role rate, the B9b rule), at its owner's level; run `Run_H(T)`
(platform, licences, harness team) from its ready date; tokens stay per product (they follow its agent runs). A shared harness is allocated to the
products by covered FTE: `share_pH(T) = E_pH / Σ_{q live at T} E_qH` (HX-D3: or by all planned products with the owner carrying the part not yet
live, or all at the owner's level).

**7.6 Levels.** Cell (FTE freed, as-is vs to-be) → harness × product → product (kernel months + harness shares, NPV from its month 0) →
**harness** (Σ FTE freed, attributable savings, build + run, its own NPV) → wave / slice → **unit** (its products + the harnesses it owns) →
portfolio (each shared harness counted once). Waves, units and the portfolio sum on the calendar as today (`consolidate`, `scopeGroup`).

**7.7 Worked example (illustrative).** Product P1, 15 FTE. Target: Build and Test of team T3 (6 FTE) and Review of team T1 (1.5 FTE): `F_target`
7.5 FTE. Harness HA covers Build + Review (5 FTE, ā 60 %, h̄ 30 % → `eff` 60 %), HB covers Test (2.5 FTE, ā 50 %, h̄ 40 % → `eff` 50 %). At full
adoption and capability: `agentVfte = 5 × 0.60 + 2.5 × 0.50 = 4.25` FTE of the 7.5 targeted; the 7.5 FTE outside the target are untouched. Month 6, adoption 40 %, HA ready,
HB in pilot (`c` 0.5): `0.4 × (3 + 1.25 × 0.5) = 1.45` FTE.

## 8. Step 5 — the pilot on a selected subset

The pilot is a **scope rule inside the target** (`kind="pilot"`, e.g. "team T3, activity A017, share 0.375") and **wave 0**. It needs the harnesses
covering it: they are built for the pilot (`ready_H` before the pilot starts). Timing: `g_pilot = max(Assessed gate, ready_H)`, duration = the
pilot (`pilotTiming`, today's owner). The tool shows the pilot's own business case (its cells' FTE freed, its cost: harness build share, pilot
labour, Assessment already sunk) and its plan. At the Decide gate the measured KPIs set `c_H` (and, HX-D8, the adoption curve of the waves) and the
status becomes **Piloted**.

## 9. Step 6 — scale on the scope, then run

**9.1 Waves.** Waves 1..n hold **slices** of `target − pilot` (each a scope rule: by default product × harness, narrowable to teams, phases,
activities, a share). Checks before the plan is accepted: every target cell (or fraction) is in exactly one slice — pilot or a wave; the rest is
listed **not deployed** (it saves nothing); a double assignment is refused. A harness built for the pilot or an earlier wave serves the later
slices without a second build. Slice go-live `g_s = max(waveStart + offset_s, ready_H(s))` (overridable); the wave rules (dependencies, the
transformation team's capacity, which now counts harness builds and slice go-lives) are today's.

**9.2 Run models.** After a slice goes live, who runs it — per slice, harness or product, with a switch date (e.g. provider-run for 12 months of
hypercare, then transferred):

| Model | Who runs what | Customer's cost | Provider's revenue / cost |
|---|---|---|---|
| **R1 Transfer** (provider transforms, customer runs) | Customer: human team, run team, harness run, tokens, at the customer's rates | Internal costs + the transformation fees (setup billable share, hypercare) | Fees − the provider's transformation labour |
| **R2 Shared run** | Provider: harness platform and agent operations (Run_H, run team, tokens); customer: the human delivery team | Its human team + the provider's run fee | Run fee (pass-through + markup, or capacity price) − the provider's run cost |
| **R3 Full external run** | Provider: the whole scope as a managed service (humans and agents) | The service fee (ET, AAH, AGS or GS, today's commercial formulas) | Fee − the provider's full run cost (its team at its rates, agents, harness) |

Each cost line *L* (human team, run team, harness run, harness build, tokens, infra, knowledge hub) has an **owner** per slice and month:

```
customerCost(T) = Σ_{L owned by the customer} L(T) + fee(T)
providerCost(T) = Σ_{L owned by the provider} L(T)        (at the provider's rates and locations)
providerMargin(T) = fee(T) − providerCost(T)
```

The **customer's business case** (headline, NPV, payback) reads `customerCost`; the **provider's deal** reads `providerMargin` per slice, wave,
harness, unit and portfolio (HX-D13). Today's engagement contexts map onto it (STA ≈ R1, MSI ≈ R2, MSC ≈ R3) and today's commercial view is the
one-model, whole-case special case. Parity: without a run model, R1 with no fee, i.e. today's headline (the engine's own costs).

## 10. Teams: team in, team out, the build pod and the harness run team

The output of the model is not only euros: it is **four teams**, as 📅 Plan already separates the team in from the team out today.

| Team | What it is | Today | Proposed |
|---|---|---|---|
| **Team in** | The customer's teams of the perimeter, as-is | `teamIn` / the organisation's teams | Unchanged; read per cell (§ 4) |
| **Team out** | The delivery team after the transformation: the residual human FTE organised in pods (orchestrator, reviewers, engineers) plus preceptors, architects, FinOps, design authority, lead | `opModelCompute` on the product's residual FTE (EV-09 topology), per product and year | The same topology, **per team and per slice**: each team's residual = its FTE − the FTE its target cells free; the pods follow the slices' go-live |
| **Build pod** (per harness) | The team that builds the harness, then stabilises it in the pilot's break-in sprints | Not modelled (the pilot pod is a cost line, `pilotLine`) | Sized from the harness (§ 10.1), a programme activity at its owner's level |
| **Harness run team** (per harness) | The team that operates the harness **as an automation process** | A formula: `floor + agentVfte × opsPerAgent` (`runTeamSizing`) | The FTE of the harness's **run process** (§ 10.2) |

**10.1 Build pod.** A template of roles per harness (default: agent architect, harness engineers, a reviewer, a product owner, and subject-matter
experts **taken part-time from the teams whose cells the harness covers**), sized by drivers:

```
buildDays_H = d_base + d_agent × #agents_H + d_tool × #toolIntegrations_H + d_activity × #coveredActivities_H + d_team × #coveredTeams_H
FTE_role    = buildDays_H × mix_role / (buildMonths_H × wd/12)            mix: the template's share of each role (Σ = 1)
B_H         = Σ_role FTE_role × buildMonths_H × wd/12 × rate_role          (the build cost of § 7.5; the SMEs at their own team's rate)
```

The SMEs' days are **taken from team in** during the build (their cells' human capacity drops by that much in those months, shown in the delivery
histogram). The pod then runs the pilot's break-in sprints for the pilot harness. Under R1 the pod can be the customer's, under R2 / R3 the
provider's (its rates, § 9.2).

**10.2 The harness run team, from the harness's run process.** Each harness carries a small BPMN **run process** (`bpmn:process`
`ac:harnessRun="H1"`), built from a default template and editable like the delivery process: its activities, their RACI, their drivers and an agent
share (the run is itself partly automated). Default activities and drivers:

| Run activity | Driver (per month) | Effort |
|---|---|---|
| Monitor agent runs and quality | agent runs of the products live on H | `runs × min_monitor` |
| Handle exceptions and escalations | runs × exception rate | `exceptions × min_exception` |
| Evaluate and release (eval suites, regression) | releases of the harness | `releases × d_release` |
| Maintain prompts, context and knowledge | change requests from the covered teams | `changes × d_change` |
| FinOps (tokens, licences, capacity) | fixed + per product live | `d_finops + d_product × #products` |
| Security and compliance review | fixed + per regulatory covered activity | `d_sec + d_reg × #regCovered` |

```
runFTE_H(T) = Σ_a effort_a(T) × (1 − agentShare_a) / (wd/12)          human run FTE of the harness
runCost_H(T) = runFTE_H × rate (run roles × 1.15, the AI-skill premium) + platform (infra, licences)      = Run_H(T) of § 7.5
```

The kernel's `runTeamFte` and run-team cost **are** this owner's values (§ 13): there is no second run-team formula. `agentVfte` drives the run volume (`runs = agentVfte × wd/12 × runsPerDay`, today's rule), so the run team grows with adoption. A shared harness has
**one** run team for all its products (economy of scale), allocated by HX-D3.

**Parity.** The implicit harness H0 has a two-activity run process: "platform floor" = `max(runFloorMin, baseEtp × runFloorPct)` once any agent runs (0 before) and
"agent operations" = `agentVfte × opsPerAgent` FTE, which is today's `runTeamSizing` exactly (the legacy run-size mode keeps its fixed FTE); `runTeamFactor` and the 1.15 premium apply as today.

**10.3 Who is in which team (transition).** For each team in, the tool shows where its FTE go month by month: stays in its team (team out), joins
a pod of the team out, goes part-time to a build pod (SMEs), moves to a harness run team (reskilled), or is freed (the saving). The share of the
build pods and run teams staffed **from team in** (reskilling) versus external (provider) is an input per harness (HX-D17); under R2 / R3 the
provider's share is at the provider's rates and counts in its ledger.

## 11. Token economy, at every level

**11.1 Today.** One product-level formula (`time/kernel.ts`, `tokens.ts`): `tokens(t) = agentVfte × wd/12 × runsPerDay × tokensPerArt / 1e6 ×
blendedPrice`, where `blendedPrice` is the model mix (`TOKEN_MODELS`: share, price in / out) at the case's output share; a Monte Carlo multiplier
scales it. The token profile and the cache view (EV-28) are informative only (FX-D8).

**11.2 Proposed: bottom-up demand, priced by routing.** Per cell *c* (activity *i*, harness *H*), month *T*:

```
runs_c(T)    = agentVfte_c(T) × wd/12 × runsPerDay_i                         runs of the agents on the cell (agentVfte_c: its share of § 7.3)
tokIn_c      = runs_c × ctxIn_i × (1 − cacheHit_H × cacheDiscount)           input tokens, with the harness's context cache
tokOut_c     = runs_c × out_i
tok_c        = (tokIn_c + tokOut_c) × (1 + retry_H)                           retries and self-corrections
tok_H(T)     = Σ_{c covered by H} tok_c + overhead_H(T)                       overhead: evaluations, guardrails, monitoring, the run process's own agents (§ 10.2)
price_H(T)   = Σ_model route_H,model × (inShare × priceIn_model + outShare × priceOut_model) × priceTrend(T) × tier(owner volume)
cost_H(T)    = tok_H(T) / 1e6 × price_H(T)
```

The kernel's `tokenCost` **is** the product's sum of these cells (§ 13): one token calculator, read by the engine and every view.

- **Per activity type** (catalogue defaults, editable): runs per day, context size, output size: a code-generation run is not a review run.
- **Per harness**: model **routing** (which share of runs goes to which model: a frontier model to plan, a small one to execute), cache hit rate,
  retry rate, overhead.
- **Price trend**: a yearly price change per model family (editable; default 0 %, today's flat price), and **volume tiers** negotiated at the owner's level
  (a portfolio contract lowers every product's price): the tier is read on the owner's total volume, so a shared harness or a portfolio contract
  is cheaper per token.
- **Monte Carlo**: one price draw per model family per iteration, shared by every harness that routes to it (correlated), plus the volume driver.

**11.3 Up the levels.** Cell → activity → **harness** (its routing, overhead, cache) → product (Σ of its cells' shares of each harness) → slice /
wave → unit → portfolio. Views per level: tokens and cost per month, **cost per unit of work** (per item, per story point), **tokens per FTE freed**,
the share of tokens in the run cost, a **token budget** per harness with its alerts (FinOps, the run process's FinOps activity), and the
token-price sensitivity (at which price the case stops paying back).

**11.4 Who pays.** R1: the customer (internal cost). R2: the provider, passed through with a markup or inside a capacity price. R3: inside the
service fee, the provider carrying the price risk (the provider's ledger shows its token margin).

**11.5 Parity.** One implicit profile per product: every activity at the case's `runsPerDay` and `tokensPerArt`, the case's model mix as the
routing, no cache, retry, overhead, trend or tier: today's formula exactly.

## 12. Performance metrics in four versions: as-is, as simulated, as proposed, as measured

**12.1 Versions.**

| Version | What it is | When it is fixed | Source |
|---|---|---|---|
| **As-is** | The customer's metrics today | At the Assessed gate (with the baseline) | Declared at step 1, then audited / extrapolated (§ 6) |
| **As simulated** | The full transformation simulation (step 2) | When the first offer is sent (a **frozen version**) | The engine on the simulated case |
| **As proposed** | The target business case: target, pilot, waves, run model (steps 4–6) | When the proposal is signed (a **frozen version**: the commitment) | The engine on the proposed case |
| **As measured** | The actuals of the pilot and the run, month by month | Continuously | Imported or typed measurements per scope (product, team, harness, slice) |
| (As forecast) | The proposed case re-projected from the measured months (adoption and capability curves refitted to the actuals) | Recomputed | The engine, HX-D21 |

A frozen version stores the **inputs** (a case snapshot, the snapshot library exists) **and the computed series** with the calculation version:
the proposed numbers are a commitment and must not move when the engine changes (the one exception to "figures are never stored", read-only).

**12.2 Metric catalogue** — each metric defined once (one owner in `src/domain`), with its unit, its level rule and its aggregation:

| Family | Metrics | Aggregation up the levels |
|---|---|---|
| Cost | Run cost, team cost, tokens, harness run, cost **per unit of work**, savings, NPV, payback | Sum (costs, savings); ratio of sums (per unit) |
| Velocity | Throughput (items / month), velocity (story points / sprint), lead time, cycle time, deployment frequency | Sum (throughput); work-weighted mean (velocity per FTE); median-of-weighted (lead / cycle time) |
| Quality | Defect leakage, bugs / KLOC, change failure rate, rework rate, test coverage, review findings | Work-weighted mean |
| People | Human FTE (team in → team out), freed FTE, adoption %, eNPS, reskilled FTE | Sum (FTE); FTE-weighted mean (adoption, eNPS) |
| Agentic | Effective automation %, agent runs, tokens per item, exception rate, human review time per item, harness capability | Sum (runs, tokens); run-weighted mean (rates) |

Today's KPI scorecard (`verifyB/kpi.ts`: AS-IS vs TO-BE at the horizon end, anchors clamped by the ramp) becomes the **as-is vs as-proposed**
column pair of this catalogue for one product; its anchors stay the source of the velocity and quality to-be values.

**12.3 Measurements.** Imported per month and scope (CSV / Excel template per level, or typed): `metric, scope (product / team / harness /
slice), month, value, source`. Stored in a measurements part of the case, outside the BPMN model (§ 17), validated (unit, range), each value with its provenance.
A measured month overrides nothing in the model; it feeds the comparison views, the forecast (HX-D21) and the evidence ledger (measured =
the highest tier).

**12.4 Views.** For any metric, scope and level: the four lines over time (as-is flat, as simulated, as proposed, as measured, and the forecast),
the variance (measured − proposed, and % of proposed) and the **benefit realisation** (measured savings / proposed savings to date). Gates read
them: the pilot's Decide gate compares the pilot's measured KPIs with the proposed Y1 values (today's rule "Pilot KPIs ≥ 80 % of Y1 targets",
now computed); the Scaled status shows each wave's realisation.

## 13. One monthly calculation engine, one owner per figure

**13.1 Today.** There is one monthly calculation: the Time Engine's kernel (`time/kernel.ts` `econ`, one row per product month), fed by the
programme's one cost profile (`programme/profile.ts`) and the programme's one timing owner (`programme/timing.ts`); the portfolio is the same rows
shifted to the calendar and summed (`consolidate.ts`, `series.ts`). 📅 Plan computes **no figure of its own**: the delivery histogram reads the
engine's rows (`histogramDelivery.ts`: "READ from the Time Engine, never recomputed"), the programme histogram reads the same cost profile the
engine reads (Σ days × rate = the line's cost, a cross-surface test), the Gantt reads the timing owner. Each figure has one `@owner` module (the
registry of 23 owners, `tests/domain/figure-owners.test.ts`, and the cross-surface tests `sot-cross-surface*.test.ts`), and every screen,
workbook, report and export prints that value.

**13.2 The rule for this spec.** Every new monthly quantity is computed **once**, by one owner, inside or for the one engine; Plan, the screens,
the workbooks, the reports and the MS Project export read it. Nothing is re-derived on a surface.

| Monthly quantity | Its one owner (new unless stated) | Read by the engine | Read by Plan and the other surfaces |
|---|---|---|---|
| Cells' FTE and as-is cost | `scope/cells.ts` | `baseEtp`, `baselineRun` (Σ cells = today's values) | Scope map, OBS (team in), delivery histogram |
| Agentic capacity per (product, harness, slice) | `time/automation.ts`, called by `econ` in place of `r × eff` | Yes: `agentVfte` | Delivery histogram (per slice / harness), transition view |
| Token volume and cost | `tokens/demand.ts`, per cell and harness; the kernel's `tokenCost` **is** its product sum (owner `token-volume` moves there) | Yes | Token view, workbook, provider ledger |
| Harness run team FTE and cost | `process/harnessRun.ts` (the run process); the kernel's `runTeamFte` **is** its product share (owner `run-team` moves there) | Yes | OBS (run teams), delivery histogram, RAM |
| Harness build (build pod) and assessment labour | The programme's cost profile (`programme/profile.ts`, today's owner) with new lines | Yes: `setupProfile` | Programme histogram, Gantt, WBS, cost model |
| Slice go-live, harness ready, pilot and assessment dates | The timing owner (`programme/timing.ts`, today's owner) | Yes: the slices' `g_s` | Gantt, WBS, MS Project export |
| Allocation of a shared harness | `portfolio/harnessShares.ts` (the B10 allocation rule, `alloc.ts` cents) | Yes: product cost shares | Unit / portfolio views, harness business case |
| Customer / provider ledgers | `commercial/ledger.ts`, from the engine's cost lines and their owners | — (reads the engine) | Headline under HX-D13, commercial view, provider deal |
| Metrics (four versions) | `metrics/*`, from the engine's rows (simulated, proposed), the measurements (measured) | — (reads the engine) | Metrics view, gates, reports |

**13.3 Tests that hold it.** The figure registry gains the new owners (agentic capacity per group, token volume, harness run team, harness
allocation, ledgers); cross-surface tests assert that Plan's histograms, the token view, the OBS, the workbook and the report print the owners'
values (Σ days × rate = cost; Σ products of a harness's allocation = its cost; Σ cells = team; Σ slices = product). On the implicit harness, slice
and profiles, every owner returns today's numbers (the parity gate of lot S2).

## 14. 📅 Plan and the views, step by step

| View | Addition |
|---|---|
| Gantt | Assessment stage (its option's days) and gate; harness build bars (owner level, once); pilot band (wave 0); each wave's band with one bar per slice from its go-live; run-model switch milestones (transfer dates) |
| WBS | Programme → Assessment (sample, interviews, baseline) → Pilot → Waves → Wave k → slices; Harnesses → H → Build; Run → per run model |
| OBS | Four branches: **team in** (units → teams → roles, FTE as-is, each team's target / pilot cells); **team out** (per product / unit: pods → roles, by year, as today's topology per team); **build pods** (per harness under its owner: roles, SMEs with their home team); **harness run teams** (per harness: run roles, agents); provider staff marked under R2 / R3 |
| RAM | WBS × lanes + auditors + harness teams + provider run roles |
| Programme histogram | Auditors (assessment option), **build pods** by role (SMEs shown as borrowed from team in), a shared harness counted once at Unit / Portfolio scope |
| Delivery histogram | **Team in → team out** per team and role, month by month: freed FTE, pods, SMEs lent to build pods, staff moved to harness run teams, the **harness run teams** themselves; customer vs provider FTE under R2 / R3 |
| Token view (new) | Tokens and cost per month by harness, product, model and level; budget and alerts; cost per unit of work; price sensitivity |
| Metrics view (new) | Any metric × scope × level: as-is, as simulated, as proposed, as measured, forecast; variance and benefit realisation |
| Transition view (new) | Per team in: where its FTE go (§ 10.3), as a stacked area and a table, per wave |
| Scope map (new) | Cells (product × activity × team): perimeter, sampled?, provenance, target / pilot / wave, harness, run model, FTE, as-is and to-be cost; filters at any level; the diagram's Colours → Target, Wave, Harness, Audit |

## 15. Decisions needed (the owner chooses)

| ID | Question | Options (recommended first) |
|---|---|---|
| HX-D1 | Saving of a covered cell | (a) per group `eff_pH × c_H` (§ 7.2–7.3); (b) the activity's own agent share, the harness only groups and costs |
| HX-D2 | Target cells covered by no harness | (a) no agentic saving; (b) the product's default automation (an implicit product harness stays) |
| HX-D3 | Cost of a shared harness | (a) by covered FTE among the products live at T; (b) by all planned products, the owner carrying the part not yet live; (c) all at the owner's level |
| HX-D4 | Harness capability | (a) a curve per harness on the calendar, measured when Piloted; (b) a single maturity % (today) |
| HX-D5 | Before the Assessed gate | (a) the full simulation keeps today's behaviour (§ 5); (b) no saving before the gate |
| HX-D6 | Monte Carlo | (a) one capability draw per harness shared by its products (a natural correlation, FX-D2); (b) per product as today |
| HX-D7 | Re-baselining | (a) explicit command, previous baseline kept as history; (b) overwrite |
| HX-D8 | What the pilot measures for the waves | (a) the harness capability only; (b) also the adoption curve |
| HX-D9 | Strata | (a) phase × task type × team; (b) phase × harness candidate; (c) per case |
| HX-D10 | Sample draw | (a) proportional to FTE, ≥ 1 per stratum, seeded; (b) the auditor picks, the tool checks coverage |
| HX-D11 | Slice granularity | (a) product × harness, narrowable to teams / phases / activities / share; (b) free cell lists |
| HX-D12 | Base of the automation with an explicit target | (a) the target's FTE only (§ 7.4); (b) the whole team, as today |
| HX-D13 | Headline under R2 / R3 | (a) the customer's cost including fees; (b) the engine's costs (today), fees shown apart |
| HX-D14 | Audit price parameters | (a) the defaults of § 6.2, editable per case; (b) a price per cell only |
| HX-D15 | Build pod sizing | (a) template + drivers (§ 10.1); (b) typed FTE and months per harness |
| HX-D16 | Harness run team | (a) the run process (§ 10.2), parity through H0; (b) today's floor + per-agent formula per harness |
| HX-D17 | Staffing of build pods and run teams | (a) a share from team in (reskilled, their FTE leave team out) and the rest external, per harness; (b) all external |
| HX-D18 | Token routing | (a) per harness (model shares, cache, retry, overhead); (b) the case's single mix (today) |
| HX-D19 | Token price trend and tiers | (a) a yearly trend per model family and volume tiers at the owner's level; (b) flat prices (today) |
| HX-D20 | Frozen versions | (a) inputs + computed series stored, read-only (commitment); (b) inputs only, recomputed |
| HX-D21 | Forecast from the measured months | (a) refit the adoption and capability curves to the actuals and re-project; (b) no forecast, variance only |
| HX-D22 | Measurement granularity | (a) month × product / team / harness / slice; (b) month × product only |

## 16. Lots (one PR each)

| Lot | Content | Gate | Figures |
|---|---|---|---|
| S1 Cells and scopes | Cells and their FTE / cost (§ 4), selection rules and their resolver, perimeter views, schema v6 (status, scopes, harness, run model elements), migration | Σ cells = team and baseline exactly on the 107 fixtures; round trips; XSD | None |
| S2 Engine per group and slice | `agentVfte_p(T)` of § 7.3 behind the kernel, the implicit target / harness / slice | **Parity**: 107 fixtures, parallel run, excel-compat identical | None |
| S3 Assessment | Audit options and pricing (§ 6.2), sample draw, extrapolation, provenance, Monte Carlo spreads, the Assessment stage's cost line, freeze baseline | Hand-computed prices and strata; no sample = today | Opt-in |
| S4 Target and harnesses | Target rules, harness definition, coverage, costs and allocation, harness business case, scope map | Cross-surface: Σ products + owners = portfolio | Opt-in |
| S4c Token economy | Bottom-up demand, routing, cache, retries, overhead, trends, tiers, budgets, views per level (§ 11) | Parity: implicit profile = today's tokens on the 107 fixtures | Opt-in |
| S4b Teams | Team out per team and slice, build pods (§ 10.1), harness run processes and run teams (§ 10.2, parity through H0), transition view | H0 run team = `runTeamSizing` on the 107 fixtures | Opt-in |
| S5 Pilot and waves | Pilot (wave 0), slices of target − pilot, partition checks, go-live, Plan views (Gantt / WBS / OBS / RAM / histograms) | Plan exports (MSPDI, workbook, report) | Opt-in |
| S6 Run models | R1 / R2 / R3 per slice with switch dates, customer and provider ledgers, commercial view per scope | Today's commercial view = the one-model special case | Opt-in |
| S7 Screens | Scope map, audit plan, target / pilot / wave editors, harness panel, diagram colours (Target, Wave, Harness) and groups | axe, parity 0 | None |
| S8 Monte Carlo | Harness capability draws, stratum spreads, token price draws per model family | Zero-variance run = consolidated net | Opt-in |
| S9 Metric versions | Metric catalogue (one owner each), frozen versions (as simulated, as proposed), measurements import, variance, benefit realisation, forecast, computed pilot gate (§ 12) | Today's KPI scorecard = as-is vs as-proposed for one product | None (views) |

Total about 30 days of agent work. S1 → S2 first (no figure moves); then S3 → S4 → S5 → S6 follow the engagement's order.

## 17. Inventory: what the case holds today, what is in the BPMN model, what should not be

**17.1 In the BPMN document today** (key `BPMN`, one document, D-B1 / D-B26; in a portfolio the **common** document, plus a product's own
document when it overrides its process part, B10a)

| Part | Content | Since |
|---|---|---|
| Delivery process | Phases (sub-processes), activities and their parameters (effort, value class, AI authority, capability, human / agent supervision split, sequence, regulatory, scope marks), flows and rework pairs (probability, cost share), actors (roles, agents), RACI, diagrams (DI) | B1–B5, B6b |
| Extended profile | Data stores, tools, states, volumes, timers, boundary events, the process library (global tasks), conversations | B5b |
| Decisions | DMN 1.3 `dmn:definitions` in the main process's extension elements (rule families, bound to rule tasks) | B7b |
| Transformation programme | The second participant: programme activities (kind, level, cost rule, timing, cost profile), lanes per operating-model role, the agents' lane; `ac:programmeValues` (the programme's parameters and opt-in switches) | B9a–B9e |
| Organisation | Units (hierarchy), teams (lines: skill, grade, location, FTE, pins; owning unit; shared lines and their shares), each product's owning unit, services | B6b, B10a–B10c |
| Audit | `ac:audit` on tasks and resources (observations, tools in use, pain points, evidence, status), `ac:auditHeader` (and the calibration log), the case's tool catalogue entries | B7 |

**17.2 Outside the BPMN document today**

| Where | Content |
|---|---|
| Case values (`dom.values`, `dom.checked`) | Horizon, ramps Y1–Y3, automation potential and fit, glass ceiling, working days, runs per day, tokens per artefact, run sizing, infrastructure, engagement context, roadmap dates and stage weeks, pilot, setup tooling and coaching, Knowledge Hub, HRI, discount rate, commercial inputs (`cm*`), harness maturity |
| Case tables | Rate card (`RATE`), target location mix, token models and output share, coefficients (`COEF`), model settings (`MODEL`: flags, LCE loops, EVT classes, supervision, CBD, discount rate), engagement coefficients, curve (`scurve`), lifecycle, maturity bounds |
| Shipped catalogues | The artefact catalogue (JSON, still generating the default process: D-B9 / FX-02), the tool catalogue, the programme catalogue (code), the role catalogue |
| Portfolio file | Common case, products (knowledge subset, per-field overrides, wave, offset), waves (start, dependencies), hub, horizon, start date, ρ, setup capacity |
| Snapshot library | Saved versions of the case |
| Never stored | Figures (computed by their owner), view state (filters, selection, diagram options) |

**17.3 The rule: what belongs in the BPMN model and what does not**

The BPMN document is **the model of the work and of who does it**: it can be exchanged with BPM tools, reviewed by the customer and diffed. It
holds structure and observations about the work. It does **not** hold:

1. **Figures** — computed, never stored. The frozen versions of § 12 go to the snapshot library, not into the model.
2. **Prices, rates and commercial terms** — rate card, location mix prices, token prices and contracts, fees, margins, gain share, auditor
   rates, discount rate: commercially sensitive, they must never leave with a `.bpmn` export sent to the customer or a tool.
3. **Engine and market assumptions** — curves, ramps, coefficients, Monte Carlo settings, engagement coefficients: parameters of the calculation,
   not of the work.
4. **Time series of measurements** — the as-measured values of § 12: high volume and frequent updates; a separate part of the case.
5. **Personal data beyond what the audit needs** — interviewees' identities stay in the audit header, filtered from exports (D-B14); never
   credentials or secrets.
6. **View state and preferences** — never stored in the case.

**17.4 This spec's data, classified** (this corrects § 3 where it disagreed)

| Data | In the BPMN model? | Where |
|---|---|---|
| Status per product, scopes as rules (perimeter, sample, target, pilot, slices) | **Yes** (structure of the work) | Organisation part |
| Sample drawn, strata, provenance | **Yes** (audit) | Audit header |
| Audit options' **prices** and the auditor rate | **No** (commercial) | Case values (`audit pricing`) |
| Baseline process, `ac:baselineRef` | **Yes** | Product's document |
| Harness: owner, agents, tools, coverage, capability curve, build pod roles and drivers, sourcing share | **Yes** | Organisation part, process part |
| Harness **run process** (activities, RACI, drivers, agent share) | **Yes** (it is a process) | `bpmn:process ac:harnessRun` |
| Harness platform **costs**, licences | **No** | Case values per harness id |
| Token profile per activity type (runs, context, output), routing per harness (model shares, cache, retry) | **Yes** (how the work uses agents) | Process part, harness |
| Token **prices**, trends, volume tiers, contracts | **No** (commercial) | Case tables (with `TOKEN_MODELS`) |
| Who runs what (customer / provider) | **Yes**, as structure: the provider is a **participant** (its own pool), run activities and teams assigned to it | Organisation part, a provider participant |
| Run **model**, commercial model, fees, margins | **No** (commercial) | Case values per scope id |
| Waves and slices | **Yes** (FX-D14 decided (a)) | The portfolio-level BPMN document |
| Frozen versions (as simulated, as proposed) | **No** | Snapshot library, with their series |
| Measurements (as measured) | **No** | A measurements part of the case (per metric, scope, month) |
| Metric catalogue | **No** (definitions in code, one owner each) | `src/domain/metrics` |

**17.5 Moves to plan for what is already there**

- `setupTraining` / `setupGov` in `ac:programmeValues`: stored, read by no figure; **retired** (FX-D13 decided (a), lot X7), with the deviations of
  the legacy outputs.
- The artefact catalogue JSON still generates the default process (FX-02): the default process should be the shipped `.bpmn`, the JSON retired.
- Prices that today sit next to process parameters (e.g. any euro amount among the programme values) are checked against rule 2 and moved to the
  case values when they are commercial.
- A `.bpmn` export keeps filtering the audit (D-B14) and must also leave out everything rule 2 lists (an export test asserts it).
