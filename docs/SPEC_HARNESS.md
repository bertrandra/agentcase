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
| Audit options and price parameters (days per unit, auditor rate, expenses) | Audit header in the collaboration: `ac:auditPlan` with `ac:option` (full / sample n / sample coverage %) and the chosen one | `audit/pricing.ts` (new) |
| Sample drawn (seed, strata, drawn cells) | `ac:sample seed strata` with `ac:sampled cell="P1/A017/T3"` | `audit/sample.ts` (new) |
| Baseline (as-is, frozen at the Assessed gate) | A second `bpmn:process` `ac:baseline="true" frozenAt` in the **product's** document; the audit moves onto its elements (per product: settles FX-D6) | `process/baseline.ts` (new) |
| Link to-be → as-is | `ac:baselineRef` on each to-be task | `process/baseline.ts` |
| Harness (owner, agents, tools, capability, build pod template and drivers, sourcing share) | Organisation part: `ac:harness id owner` with `ac:agentRef`, `ac:toolRef`, `ac:capability`, `ac:build` (`ac:podRole role mix`, drivers, months), `ac:sourcing internalPct` | `org/harness.ts` (new) |
| Harness run process (activities, RACI, drivers, agent share) | A `bpmn:process ac:harnessRun="H1"` in the **common** document (default template, editable like the delivery process); platform costs on `ac:run` | `process/harnessRun.ts` (new) |
| Coverage (which cells a harness serves) | `ac:harnessRef` on each to-be activity (all its cells), narrowed by a rule on the harness when only some teams use it | `process/harnessCoverage.ts` (new) |
| Run model per slice / harness / product (R1 transfer, R2 shared, R3 external), with a switch date and the commercial model | Organisation part: `ac:runModel scope="…" model="transfer|shared|external" from="…" commercial="ET|AAH|AGS|GS"` | `commercial/runModel.ts` (new) |
| Waves (pilot = wave 0) and their slices | Portfolio data with the waves until FX-D14 (`pilot: true`, `slices: scope ids`); a single case stores them in its document | `portfolio/waves.ts`, `portfolio/slices.ts` (new) |

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

**4.3 Views.** The perimeter per unit / team / product / phase / activity: FTE and as-is cost, as a table and as the diagram's colours (§ 11).

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

`agentVfte` drives the run volume (`runs = agentVfte × wd/12 × runsPerDay`, today's rule), so the run team grows with adoption. A shared harness has
**one** run team for all its products (economy of scale), allocated by HX-D3.

**Parity.** The implicit harness H0 has a two-activity run process: "platform floor" = `max(runFloorMin, baseEtp × runFloorPct)` once any agent runs (0 before) and
"agent operations" = `agentVfte × opsPerAgent` FTE, which is today's `runTeamSizing` exactly (the legacy run-size mode keeps its fixed FTE); `runTeamFactor` and the 1.15 premium apply as today.

**10.3 Who is in which team (transition).** For each team in, the tool shows where its FTE go month by month: stays in its team (team out), joins
a pod of the team out, goes part-time to a build pod (SMEs), moves to a harness run team (reskilled), or is freed (the saving). The share of the
build pods and run teams staffed **from team in** (reskilling) versus external (provider) is an input per harness (HX-D17); under R2 / R3 the
provider's share is at the provider's rates and counts in its ledger.

## 11. 📅 Plan and the views, step by step

| View | Addition |
|---|---|
| Gantt | Assessment stage (its option's days) and gate; harness build bars (owner level, once); pilot band (wave 0); each wave's band with one bar per slice from its go-live; run-model switch milestones (transfer dates) |
| WBS | Programme → Assessment (sample, interviews, baseline) → Pilot → Waves → Wave k → slices; Harnesses → H → Build; Run → per run model |
| OBS | Four branches: **team in** (units → teams → roles, FTE as-is, each team's target / pilot cells); **team out** (per product / unit: pods → roles, by year, as today's topology per team); **build pods** (per harness under its owner: roles, SMEs with their home team); **harness run teams** (per harness: run roles, agents); provider staff marked under R2 / R3 |
| RAM | WBS × lanes + auditors + harness teams + provider run roles |
| Programme histogram | Auditors (assessment option), **build pods** by role (SMEs shown as borrowed from team in), a shared harness counted once at Unit / Portfolio scope |
| Delivery histogram | **Team in → team out** per team and role, month by month: freed FTE, pods, SMEs lent to build pods, staff moved to harness run teams, the **harness run teams** themselves; customer vs provider FTE under R2 / R3 |
| Transition view (new) | Per team in: where its FTE go (§ 10.3), as a stacked area and a table, per wave |
| Scope map (new) | Cells (product × activity × team): perimeter, sampled?, provenance, target / pilot / wave, harness, run model, FTE, as-is and to-be cost; filters at any level; the diagram's Colours → Target, Wave, Harness, Audit |

## 12. Decisions needed (the owner chooses)

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

## 13. Lots (one PR each)

| Lot | Content | Gate | Figures |
|---|---|---|---|
| S1 Cells and scopes | Cells and their FTE / cost (§ 4), selection rules and their resolver, perimeter views, schema v6 (status, scopes, harness, run model elements), migration | Σ cells = team and baseline exactly on the 107 fixtures; round trips; XSD | None |
| S2 Engine per group and slice | `agentVfte_p(T)` of § 7.3 behind the kernel, the implicit target / harness / slice | **Parity**: 107 fixtures, parallel run, excel-compat identical | None |
| S3 Assessment | Audit options and pricing (§ 6.2), sample draw, extrapolation, provenance, Monte Carlo spreads, the Assessment stage's cost line, freeze baseline | Hand-computed prices and strata; no sample = today | Opt-in |
| S4 Target and harnesses | Target rules, harness definition, coverage, costs and allocation, harness business case, scope map | Cross-surface: Σ products + owners = portfolio | Opt-in |
| S4b Teams | Team out per team and slice, build pods (§ 10.1), harness run processes and run teams (§ 10.2, parity through H0), transition view | H0 run team = `runTeamSizing` on the 107 fixtures | Opt-in |
| S5 Pilot and waves | Pilot (wave 0), slices of target − pilot, partition checks, go-live, Plan views (Gantt / WBS / OBS / RAM / histograms) | Plan exports (MSPDI, workbook, report) | Opt-in |
| S6 Run models | R1 / R2 / R3 per slice with switch dates, customer and provider ledgers, commercial view per scope | Today's commercial view = the one-model special case | Opt-in |
| S7 Screens | Scope map, audit plan, target / pilot / wave editors, harness panel, diagram colours (Target, Wave, Harness) and groups | axe, parity 0 | None |
| S8 Monte Carlo | Harness capability draws, stratum spreads | Zero-variance run = consolidated net | Opt-in |

Total about 23 days of agent work. S1 → S2 first (no figure moves); then S3 → S4 → S5 → S6 follow the engagement's order.
