# AgentCase — Specification: assessment baseline, agentic harnesses and the calculation chain

> Status: **draft for the owner's review (2026-10-31)**. Base: `main` after v21.6.0 + SPEC_FIXES lot X0.
> Related: [SPEC_BPMN.md](SPEC_BPMN.md) § 15 (audit), § 16 (organisation), § 19 (programme), § 21 (organisation × portfolio),
> [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md) (waves, consolidation), [SPEC_FIXES.md](SPEC_FIXES.md) (FX-D2, FX-D6, FX-D14).
> Rules unchanged: one owner per figure in `src/domain`, every document change an undoable command, view state never undoable, existing figures
> identical unless recorded in DEVIATIONS.md, files ≤ 150 lines, one PR per lot on green CI.

## 1. The engagement story the model must follow

| Step | What happens with the customer | Model status | What the model knows |
|---|---|---|---|
| 1. First simulation | Pre-sale / framing: a first business case of the transformation | **Simulated** | Catalogue activities on the selected scope (activity level, as today), team, rates, curve; defaults where nothing is known |
| 2. Assessment | Audit of a **sample** of the scope's activities: interviews, tools, observations | **Assessed** | Observed values on the sampled activities, **extrapolated** to the rest of the scope by stratum (§ 5); the as-is is **frozen as the baseline** at the gate |
| 3. Pilot | The **pilot scope**: a slice of the selected scope (one harness on a few activities of one product or team) | **Piloted** | Measured KPIs of that slice: its harness capability and adoption are evidence, not assumption |
| 4. Scale | **Waves over the selected scope minus the pilot scope**, slice by slice | **Scaled** | Every slice of the scope with its wave, harness and go-live date |

The **agentic transformation starts after the assessment**: no harness is built and no agentic saving is counted before the Assessed gate, except in
the Simulated status where the whole chain is a simulation (today's behaviour).

**Selected scope** = the in-scope activities of each product, as today. It is the frame of everything: the audit samples it, the pilot takes a slice
of it, the waves deploy the rest (`selected scope − pilot scope`), and the figures count it.

**Harness** = an agentic system (agents + tools + guardrails + context) that automates part of the work of **several activities**. It is owned at
any level: a **product**, an **organisation unit** (a shared service, a department) or the **portfolio**. One harness can serve several products.

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

## 3. The new layers and where their data sits

All stored data stays in the case's BPMN document (D-B26): it travels with the case file and the `.bpmn` export. **Figures are never stored.**

| Layer | Data | Where it sits | Owner in `src/domain` |
|---|---|---|---|
| Status | `Simulated / Assessed / Piloted / Scaled`, date, per product | Organisation part of the **common** document (`bpmn:collaboration` extension elements): `ac:caseStatus product="…" status asOf` (single case: "Product 1", like `ac:team`) | `org/status.ts` (new) |
| Audit sample | The sampling plan: strata, sample size, seed, the drawn activities; each activity's provenance (audited / extrapolated / declared) | Audit header in the collaboration: `ac:sample seed strata size` with `ac:sampled ref="A017"`; provenance computed, never stored | `audit/sample.ts` (new) |
| Baseline (as-is) | The as-is activities frozen at the Assessed gate: effort, human / agent shares, observed as-is automation `a⁰_i`, scope | A second `bpmn:process` `ac:baseline="true" frozenAt="…"` in the **product's** document (each product has its own as-is) | `process/baseline.ts` (new) |
| Link to-be → as-is | Each to-be activity's origin (split / merged allowed) | `ac:baselineRef="A017 A018"` on the to-be task | `process/baseline.ts` |
| Audit | Observations, tools, pain points, evidence | Moves from the working process to the **baseline's** elements (the audit describes the as-is); header and tool catalogue stay in the collaboration. Per product, which settles FX-D6 | `audit/*` |
| Harness definition | id, name, **owner** (`product:P` / `unit:U` / `portfolio`), agents (references to agent resources), tools (catalogue references), capability curve, build plan (roles × FTE × months), run cost lines | Organisation part of the **common** document: `ac:harness id owner` with `ac:agentRef`, `ac:toolRef`, `ac:capability`, `ac:build`, `ac:run` | `org/harness.ts` (new) |
| Coverage | Which activities a harness serves | `ac:harnessRef="H1"` on each **to-be** activity (process part: a product overriding its process may cover differently) | `process/harnessCoverage.ts` (new) |
| Deployment slices | The pilot slice and each wave's slices: a slice = product × harness (default), optionally narrowed by phase or by an activity list | Portfolio data with the waves (until FX-D14): wave `slices: { product, harness, phases?, activities? }[]`, the pilot as wave 0 `pilot: true`; a single case stores its waves the same way in its document's programme values | `portfolio/slices.ts` (new) |
| Go-live | When a slice goes live | Derived (§ 6), overridable per slice: `month` on the slice | `programme/harnessTiming.ts` (new) |

## 4. The calculation chain with harnesses (proposed)

Notation: product *p*, activity *i* ∈ *S_p* (to-be scope), harness *H*, calendar month *T*, product month *t = T − month0_p*.
`C_p(H)` = the activities of *S_p* covered by *H*. `U_p` = in-scope activities covered by no harness.

### 4.1 Per (product, harness) group — replaces the single product average

```
E_pH        = Σ_{i∈C_p(H)} e_i                               effort share of p covered by H
ā_pH        = Σ_{i∈C_p(H)} e_i · (a_i − a⁰_i)⁺ / E_pH         agent share still to gain (a⁰_i: as-is automation from the baseline, 0 when none)
h̄_pH        = Σ_{i∈C_p(H)} e_i · h_i / E_pH                  human supervision kept
eff_pH      = min(100 − h̄_pH, min(techCap, ā_pH) × lifecyclePosture × glassFactor × khMult)
```

The glass-ceiling and potential rules of § 2.1–2.2 are applied **per group**, with the same factors. Activities in `U_p` gain nothing: **no
harness, no agentic saving**.

### 4.2 Adoption × capability — the monthly automation of a product

Two curves, both in [0, 1]:

- **adoption** `r_p(t)/100` — the product team's change curve, exactly today's (ramps, HRI, curve family), started at the product's month 0;
- **capability** `c_H(T)` — what the harness can do on the calendar: 0 before it is ready, then rising through pilot and industrialisation to its
  maturity (it replaces today's single global `harnessMat`). Default shape: a ramp from 0.5 at ready date to 1 over `harnessRampMonths`; the pilot
  harness takes its measured value when the status is Piloted.

With deployment slices (§ 6), product *p*'s covered effort is split by slice *s* (the pilot slice, then the waves' slices), each with its go-live
month `g_s`; `E_pHs` = the effort share of the activities of *s* covered by *H* (Σ_s E_pHs = E_pH). Adoption starts at each slice's go-live:

```
R_p(T)        = Σ_s (r_p(T − g_s)/100) × Σ_H  E_pHs × eff_pH/100 × c_H(T)          (r = 0 before go-live)
agentVfte_p   = baseEtp_p × R_p(T)                    then the kernel of § 2.3 unchanged (humanFte, team cost, tokens, run team, taxes)
```

`eff_pH` is the rate of the whole group (§ 4.1): a slice only decides **when** its share of the effort starts, not **how much** it saves.

Everything after `agentVfte` stays the one kernel (`econ`): only `r × eff` becomes `R_p(T)`.

### 4.3 Harness costs

| Cost | Rule | Booked |
|---|---|---|
| Build `B_H` | Labour from resources (the B9b rule): Σ roles FTE × months × wd/12 × role rate (target blend × 1.15), spread over the build activity | On the calendar at the build months, a programme line at the owner's level |
| Run `Run_H(T)` | Harness platform (infra, licences, harness engineering team FTE × rate) from its ready date | Monthly |
| Tokens | Stay per product (they follow the product's agent runs, § 2.3) | Product |
| Infra today (`infraMonth`) | Becomes the run cost of the implicit harness (§ 4.5) | — |

**Allocation of a shared harness** (owner = unit or portfolio) to the products, by covered effort, the B10 effort rule (D-B38):

```
share_pH(T) = coveredEffort_pH / Σ_{q live at T} coveredEffort_qH              coveredEffort_pH = Σ_{i∈C_p(H)} w_i (person-days)
cost_p(T)  += share_pH(T) × (Run_H(T) + build amortisation_H(T))
```

Decision HX-D3 (§ 8): spread the build across products (amortised over the products' horizons) or carry it at the owner's level (then a product's
NPV excludes it, the unit's and the portfolio's include it).

### 4.4 Up the levels

| Level | Figure | Rule |
|---|---|---|
| Activity | gained agent share `(a_i − a⁰_i)⁺`, harness | Read, not summed alone (activities are effort shares of a team) |
| Harness × product | `E_pH`, `eff_pH`, FTE freed `baseEtp_p × E_pH × eff_pH × c_H × r_p`, cost share | View: "what H brings to p" |
| Product | the kernel's months with `R_p(T)` + its harness cost shares | As today: NPV from its month 0, payback |
| Harness | Σ_p FTE freed, Σ_p savings attributable `Σ_p grossSav_p × (E_pH eff_pH c_H / Σ_G E_pG eff_pG c_G)`, build + run cost, its own NPV | New view: a harness business case |
| Wave | Σ products of the wave (unchanged) + the harnesses it deploys (their build in the wave's months) | `scopeGroup` |
| Unit (OBS node) | Σ products the unit owns + the harnesses it owns (full cost when the owner carries it, HX-D3) | `scopeGroup` |
| Portfolio | Σ products + Σ harness costs not allocated to products; each shared harness counted **once** | `consolidate` |

### 4.5 Parity: every existing case keeps its figures

Migration (schema v6): one **implicit harness `H0`** per product, owner = the product, covering every in-scope activity, `c_H0 ≡ 1`,
one slice (the whole scope) going live at the product's month 0, run cost = today's `infraMonth`, build = 0 (the setup lines stay programme
lines); `a⁰_i = 0`; no sample (every value declared); status **Simulated**; no baseline; today's product waves become waves of whole-scope
slices. Then `E = 1`, `ā = avgAgent`, `h̄ = avgHuman`, `eff_pH0 = eff_p`, `R_p = r_p × eff_p`: **every figure identical** on the 107
fixtures, the parallel run and excel-compat (gate of lot H2). A typed potential (fit off) applies to every group of the product.

### 4.6 Worked example (illustrative numbers)

Product P1, `baseEtp` 15 FTE, factors = 1. Harness **HA** (coding + review) covers 50 % of the effort, ā 60 %, h̄ 30 %; harness **HB** (tests)
30 %, ā 50 %, h̄ 40 %; 20 % uncovered.

- `eff_A = min(70, 60) = 60 %`, `eff_B = min(60, 50) = 50 %`.
- At full adoption and capability: `R = 0.5 × 0.60 + 0.3 × 0.50 = 0.45` → 6.75 FTE of agentic capacity (today's single average would give
  something else: it averages the uncovered 20 % in as well).
- Month 6: adoption 40 %, HA ready (`c = 1`), HB in pilot (`c = 0.5`): `R = 0.4 × (0.30 + 0.15 × 0.5) = 0.15` → 2.25 FTE.
- HA is shared with P2 (covered effort P1 600 d, P2 400 d), run €20k a month: P1 pays €12k, P2 €8k once both are onboarded; before P2 is
  onboarded, P1 pays the whole run cost under HX-D3 (a); under (b) P1 pays €12k from the start and the owner carries P2's €8k until P2 goes live.

## 5. Assessment by sampling

The audit covers a **sample** of the selected scope; the baseline still needs a value for every activity. Rules:

**5.1 Strata.** The scope is cut into strata: phase × task type by default (configurable: phase × harness candidate, phase × capability). A stratum
is the unit of extrapolation: its activities are assumed to behave alike.

**5.2 Drawing the sample.** Size *n* (or a target effort coverage, e.g. 60 %). Inside each stratum, activities are drawn **with probability
proportional to effort** (the heavy activities carry the money), at least one per stratum that has effort, with a seed (reproducible; command
`audit.drawSample`, undoable; the auditor can swap an activity, recorded). The drawn activities get the audit status *planned* (they show in the
diagram's Audit colours and in 🔎 Audit's list).

**5.3 Extrapolation to the activities not sampled.** For each observed field *x* (effort per item, hours, rework rate, as-is automation
`a⁰`, human share) and each stratum *s* with audited activities *A_s*:

```
ratio_s(x)  = Σ_{i∈A_s} w_i · observed_i(x) / Σ_{i∈A_s} w_i · modelled_i(x)      (effort-weighted, ratios for efforts and hours)
mean_s(x)   = Σ_{i∈A_s} w_i · observed_i(x) / Σ_{i∈A_s} w_i                       (shares and rates: a⁰, h, rework)
not sampled i ∈ s:   x_i = modelled_i(x) × ratio_s(x)   or   x_i = mean_s(x)
stratum with no audited activity: the catalogue value stays (provenance "declared")
```

Example (illustrative): stratum "Build × Human", 10 activities, 120 modelled days. The sample holds 3 of them (50 modelled days, 42 % of the
stratum's effort); they are observed at 65 days in all and at as-is automation 10 %, 20 % and 0 % (weights 20, 20, 10 days). Then
`ratio = 65 / 50 = 1.3`, so the 7 others go from 70 to 91 modelled days; `mean(a⁰) = (20×10 + 20×20 + 10×0) / 50 = 12 %` for the 7 others.

Provenance per value: **audited** (sampled and observed), **extrapolated** (stratum rule), **declared** (catalogue / typed). The evidence ledger
(D-B33) grades them in that order.

**5.4 Uncertainty.** The spread of the observed ratios inside a stratum (effort-weighted standard deviation; a stratum with one observation takes a
default spread) becomes the Monte Carlo spread of its extrapolated values: a bigger sample narrows the distribution, a heterogeneous stratum widens
it. Coverage shown: by count, by effort, by stratum (strata without an observation are flagged before the gate).

**5.5 Gate.** `process.freezeBaseline` writes the baseline process with the audited, extrapolated and declared values and their provenance;
the to-be starts from it. The calibration log (F-B29) records the extrapolation rule and the sample.

## 6. Deployment: pilot, then waves over the selected scope minus the pilot

**6.1 Slices.** The unit of deployment is a **slice** = product × harness (the activities of that product the harness covers), optionally narrowed
by phases or an activity list. The **pilot** is wave 0 with the pilot slice(s); the following waves hold slices of `selected scope − pilot scope`.

**6.2 Checks (shown before the plan is accepted).** The slices partition the selected scope: every in-scope covered activity is in exactly one
slice (pilot or a wave); an activity in no slice is listed as **not deployed** (it saves nothing); an activity in two slices is refused. A product
can be in several waves (one slice per wave).

**6.3 Timing.**

- **Assessment stage** (programme, case level): between Calibrate and Validate; its gate freezes the baseline (§ 5.5) and sets Assessed.
- **Harness build** (programme activity per harness, owner level): after the Assessed gate of the first product it serves (Simulated: from month 1,
  today's behaviour); `ready_H` = build end. The pilot harness is built for the pilot.
- **Pilot** (wave 0): `g_pilot = max(Assessed gate, ready_H)`; lasts the pilot (`pilotTiming`, today's owner); its measured KPIs set `c_H` and,
  when the owner chooses (HX-D8), the adoption curve of the following waves.
- **Waves 1..n**: start after the pilot's Decide gate (dependency `setupEnd` / start + lag, the existing wave rules); a slice goes live at
  `g_s = max(waveStart + offset_s, ready_H(s))` (overridable). A harness built for the pilot or an earlier wave serves the later slices without a
  second build.
- The transformation team's capacity (`maxConcurrentSetups`) counts **harness builds and slice go-lives** as well as product setups.

**6.4 Figures over time.** A product's saving grows slice by slice (§ 4.2): the pilot slice first, then its slices in later waves, each on its
own adoption curve from its go-live. The cost of the not-yet-deployed scope stays the baseline cost. Waves, units and the portfolio sum as today.

## 7. 📅 Plan with the pilot, waves and harnesses (views)

| View | Addition |
|---|---|
| Gantt | Assessment stage and its gate; per harness a build bar (owner level, once); the pilot band (wave 0) and each wave's band with one bar per slice (product × harness) from its go-live; dependencies build → go-live, pilot Decide → wave 1 |
| WBS | Programme → Assessment (sample, interviews, baseline) → Pilot → Waves → Wave k → slices; Harnesses → H → Build |
| OBS | Under the owner unit (or the portfolio root): **Harness H** → harness team roles (FTE of its build and run) → agents (`ac:agentRef`) |
| RAM | WBS × lanes + the harness teams + the auditors (assessment) |
| Programme histogram | Assessment labour (auditors × sampled activities' interview days), harness build and run labour by role; a shared harness counted once at Unit / Portfolio scope, its share at Product scope |
| Delivery histogram | FTE before / after per role **and per slice / harness**: the steps as each slice goes live |
| Scope map (new) | Activities × (sampled?, provenance, harness, slice / wave, go-live), per product; the diagram's Colours → Harness / Wave / Audit, and a BPMN group per harness on export |

## 8. Baseline (as-is) and comparisons

- The baseline is read-only after the gate; the to-be (working process) is edited. A to-be activity with no `ac:baselineRef` is **new work**
  (its effort is added to the to-be, not saved).
- Comparison views: activity by activity (as-is effort / automation vs to-be, with provenance), per harness, per slice, per product.
- `baselineRun` stays the team's cost (§ 2.3); when Assessed, the team's FTE per role can be calibrated from the baseline (calibration log, F-B29).
- Evidence: Simulated = declared; Assessed = audited / extrapolated by provenance; Piloted = measured for the pilot slice.

## 9. Decisions needed (the owner chooses)

| ID | Question | Options (recommended first) |
|---|---|---|
| HX-D1 | Saving of a covered activity | (a) per group `eff_pH × c_H` as § 4.1–4.2; (b) keep the activity's own agent share, the harness only groups and costs |
| HX-D2 | Uncovered in-scope activities | (a) no agentic saving (§ 4.1); (b) they keep the product's default automation (an implicit "product harness" stays) |
| HX-D3 | Cost of a shared harness | (a) run and amortised build shared by covered effort among the products **live** at T (the first product pays all until the next goes live); (b) shared by the covered effort of **all planned** products, the part of those not yet live carried by the owner; (c) all at the owner's level |
| HX-D4 | Capability curve | (a) per harness on the calendar, 0.5 at ready → 1 over N months, measured when Piloted; (b) a single maturity % (today) |
| HX-D5 | Before the Assessed gate | (a) Simulated cases keep today's behaviour (H0); (b) no saving before the gate even in simulation |
| HX-D6 | Monte Carlo | (a) one capability draw per harness per iteration, shared by its products (a natural correlation, replaces part of the single ρ, FX-D2); (b) per product as today |
| HX-D7 | Re-baselining | (a) explicit command, previous baseline kept as history; (b) overwrite |
| HX-D8 | What the pilot measures for the waves | (a) the harness capability `c_H` only; (b) also the adoption curve of the following slices |
| HX-D9 | Strata of the sample | (a) phase × task type; (b) phase × harness candidate; (c) chosen per case |
| HX-D10 | Sample draw | (a) probability proportional to effort, ≥ 1 per stratum, seeded; (b) the auditor picks, the tool only checks coverage |
| HX-D11 | Slice granularity | (a) product × harness (narrowable by phase / activities); (b) product × phase; (c) free activity lists |

## 10. Lots (one PR each)

| Lot | Content | Gate | Figures |
|---|---|---|---|
| H1 Data model | Schema v6: status, `ac:harness`, `ac:harnessRef`, sample, slices, baseline process, implicit H0 and whole-scope slices; XSD 1.x additions; migration | Round trips; XSD; 107 fixtures identical | None |
| H2 Engine per group and slice | `R_p(T)` (§ 4.1–4.2) behind the kernel; per (product, harness, slice) views | **Parity on H0**: 107 fixtures, parallel run, excel-compat identical | None |
| H2b Sampling | Strata, draw, extrapolation, provenance, coverage by stratum, Monte Carlo spreads (§ 5) | Hand-computed strata; no sample = today's figures | Opt-in (audited cases) |
| H3 Harness costs | Build / run lines, allocation (HX-D3), harness business case | Cross-surface: Σ products + owner = portfolio | Opt-in (cases with harnesses) |
| H4 Programme & Plan | Assessment stage, harness build, pilot (wave 0), waves of slices with the partition checks (§ 6.2), Gantt / WBS / OBS / RAM / histograms / scope map | Plan exports (MSPDI, workbook, report) | Opt-in |
| H5 Screens | Harness panel (owner, coverage, capability, costs), diagram colours and groups, harness map | axe, parity 0 | None |
| H6 Baseline | Freeze / re-baseline commands, audit on the baseline, comparisons, status | Undo property tests | None (comparison views) |
| H7 Monte Carlo | Capability draws per harness (HX-D6) | Zero-variance run = consolidated net | Opt-in |

Total about 15–18 days of agent work; H1 → H2 first (no figure moves), then H2b / H3 / H4, the first lots where a case with a sample, harnesses or slices differs.
