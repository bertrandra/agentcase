# How the transformation programme is sized — inventory

> Status: inventory of the code on `main` (2026-11-02), updated for the normalisation (docs/PROGRAMME_SIZING_DMN.md, implemented: every default in
> `programme/sizing.ts`). Every value below is read from `app/src/domain/programme/*` and the modules it calls. Spec: docs/SPEC_BPMN.md § 19 (B9a–B9e), SPEC_FIXES FX-D8 / FX-D13 / FX-D14.

The **programme layer** is the set of activities that transform the delivery (engagement stages, pilot, setup, knowledge hub, build and run,
assurance). It is a BPMN process derived from the catalogue (`programme/catalogue.ts`, `catalogueOptIn.ts`); its values are stored in the case's
BPMN document (`ac:programmeValues`, schema v4) and edited in one place, 🧩 Process › the activity's parameter panel (also 📋 Programme).

## 1. The common bases

| Base | Rule | Default | Owner |
|---|---|---|---|
| Target day rate (TJM) | Rate card × target location mix (`targetBlendedTJM`), moved by the Monte Carlo rate draw | golden: €418/day | `location.ts` |
| Role rate | TJM × AI-skill premium 1.15 (the transitional roles) | golden: €480.70/day | `profile.ts programmeRates`, `rates.ts` |
| Working days | `workdays` — the one calendar: every "days" is working days (`calendar()`) | 220 / year (18.33 / month, 4.23 / week) | `sizing.ts` |
| Horizon | `horizon` years × 12 | 3 years = 36 months | `profile.ts horizonMonthsOf` |
| Setup duration | `setupDuration` months, ≥ 0.5 | 12 months | `timing.ts setupMonths` |
| Spreading | an amount spent evenly over its duration, the last month pro rata (`spreadMonths`) | — | `timing.ts` |
| Cost profile of a line | `spread` (default), `one-off`, `adoption` (along the S-curve), `recurring` (every 12 months) per line (`costProfile_<line>`) | spread | `costProfile.ts` |
| Placement | product month 1 = the build's first month; ≤ 0 = before the build (a single case books it in month 1) | — | `timing.ts`, `placement.ts` |

## 2. Activity by activity

### 2.1 Engagement stages (case level)

| Activity | Duration | Cost rule | Sizing | Default cost |
|---|---|---|---|---|
| 0 · Discover | `rmD1` weeks (default 4) | opt-in (`optStages`) | engagement team FTE (`stagesFte` 2) × the stages' weeks × 4.23 days/week × role rate | off |
| 1 · Calibrate | `rmD2` weeks (4) | opt-in | (same line) | off |
| 2 · Validate | `rmD3` weeks (4) | opt-in | (same line) | off |
| 3 · Pilot & Prove | the pilot's weeks (D-B28) | none (the pilot below) | — | — |
| 4 · Decide & Scale | gate, no duration | opt-in | workshop `decideDays` (5) days × role rate | off |

The stages run back to back from the roadmap start and end before the pilot (`optInPlan('stages')`: from month 1 − stage months − pilot lead).

### 2.2 Pilot (per product)

| Item | Rule |
|---|---|
| Duration | `pilotWeeks` prove weeks (default 12) + 2 × `pilotBreakin` break-in sprints (default 2) = 16 weeks ≈ 3.7 months |
| Placement | before the build: it ends at the product's month 0 (lead = ⌈months⌉) |
| Effort | `pilotFte` (default 3) × total weeks / 52 × working days |
| Cost | days × the role rate — **in the euro result** (DEV-NORM-PILOT): a setup line spent over its weeks before the build (a single case from month 1); 0 FTE = no pilot |
| Owner | `profile.ts pilotLine`, `timing.ts pilotTiming` |

### 2.3 Setup (per product) — the programme cost lines in the euro result

| Line (activity) | Cost rule | Formula | Duration | Defaults → golden |
|---|---|---|---|---|
| Tooling & infra (`setupTooling`) | non-labour amount | `setupTooling` € | setup duration | the case's amount |
| Training (`setupTraining`) | **resources** (default) or **amount** (FX-D13 d, `trainPricing`) | resources: `trainFte` × months × 18.33 × role rate; amount: `setupTraining` € | `trainMonths`, else the setup duration | 0.5 FTE × 12 months → €52,877 |
| Coaching (`setupCoaching`) | **resources** or **amount** (`coachPricing`; Automatic: amount without a duration, else resources) | resources: `coachDaysPerMonth` × months × role rate; amount: `setupCoaching` € | `coachMonths`, else the setup duration (Automatic amount: the legacy calibrated months) | golden €35,000 over 36.4 months |
| Governance (`setupGovernance`) | **resources** (default) or **amount** (`govPricing`) | resources: `govFte` × months × 18.33 × role rate; amount: `setupGov` € | `govMonths`, else the setup duration | 0.25 FTE × 12 months → €26,438.50 |
| Change management (`change`, HRI on) | resources | entry headcount × days per head of the readiness band (`hriDaysLight/Std/Int`: 2.5 / 6 / 11.5) × role rate | setup duration | off unless HRI is on |
| Knowledge Hub setup (`hubSetup`, hub on) | resources | `khSetupBase` × (0.5 + 0.25 × CC gap) (gap = target CC − as-is CC) | `khSetupDays` working days (default 30 = 1.64 months) | base €120,000; golden €90,000 over 30 days |
| Knowledge transfer preparation (`ktPrep`) | same as hub setup (placed earlier, never added) | — | `ktLeadMonths` before the product's month 0 (portfolio) | — |

Each line is laid on the months by its cost profile (§ 1) and summed per month into the setup row of the Time Engine (`profile.ts
programmeLines`, `engineProfile`). Effort days shown for resource lines; amounts have no labour behind them (no rate draw).

### 2.4 Build and run (per product) — engine figures, displayed

| Activity | Sizing | Owner |
|---|---|---|
| Agentic build and adoption ramp | the adoption ramp (S-curve, Y1–Y3 ramps) over the setup duration, then to the horizon | `time/engine.ts` |
| Agentic run | agent vFTE = base FTE × adoption × effective automation (supervision ceiling); token cost = runs/day × tokens per run × price | `time/kernel.ts econ` |
| AgentOps run team | `runSizeMode` hybrid: max(`runFloorMin` 0.5 FTE, base FTE × `runFloorPct` 4 %) + agent vFTE × `runOpsPerAgent` 0.15; legacy: fixed on the base team | `time/kernel.ts runTeamSizing` |
| Knowledge Hub run (hub on) | `khCurationFTE` (0.5) × TJM × `COEF.khCurationPremium` (1.15 in a new case: the role rate; absent in a case saved before: 1) × working days + `khInfraMonthly` (€2,500) × 12, per year with agents | `knowledge.ts khRunAnnual` |
| Hand-off coordination (FX-D8, opt-in `feedHandoff`) | the process's hand-off hours a release × releases a year × TJM / 8, monthly, from the first month with agents | `process/feeds.ts` |

### 2.5 Opt-in activities (D-B31: off by default; on, days × role rate)

| Activity | Level | Switch | Effort (defaults) | Placement |
|---|---|---|---|---|
| Value tracking | case | `optValue` | `valueFte` 0.1 FTE × horizon months × 18.33 | month 1 → horizon |
| Risk mitigations and AI Act | case | `optAiAct` | `aiActDays` 10 days/year × years | month 1 → horizon |
| Audit and discovery interviews | case | `optAudit` | `auditDays` 10 days | 1 month, at the start of the pilot (before the build) |
| Licence procurement | case | `optProcure` | `procureDays` 20 days | month 0 (before the build) |
| Agent-toolchain integration | product | `optIntegr` | `integrations` 5 × `integrDays` 5 days | over the setup |
| Rollout hypercare | product | `optHypercare` | `hypercareFte` 1 × `hypercareWeeks` 6 weeks × 4.23 | from month 1, its weeks |
| Legacy decommissioning | product | `optDecom` | `decomDays` 10 days; `decomSaving` €/month saved only when entered (an output of the line, `saving`) | the month after the setup |

A case-level opt-in is counted once per portfolio, on its carrier product (FX-01).

## 3. Portfolio level

| Item | Rule | Where stored |
|---|---|---|
| Waves | each wave's start month (or its dependency: after another wave's start or setup end, plus a lag); a product's month 0 is its wave's start + its offset | portfolio process `PortfolioPlan` in the common BPMN document (schema v6, FX-D14) |
| Setup capacity | at most `maxConcurrentSetups` products in setup at once: a wave that would exceed it starts later | lane set `ac:setupCapacity` (same process) |
| Knowledge subsets | per product: hub domains, target CC, curation, setup base, `ktLeadMonths` (inherited from the common hub when absent) | `ac:knowledgeSubset` on the product's call activity |
| Common hub | set up once, before the first wave; its infrastructure shared by the products (`perProduct` or `byBaseEtp`) | portfolio hub settings |

## 4. What moves the figures, what does not

- **In the euro result** (setup row of the Time Engine, hence ROI, NPV, payback): every line of § 2.3 that is on, every opt-in of § 2.5 that is
  switched on, and the pilot (§ 2.2, DEV-NORM-PILOT).
- **Monte Carlo**: the rate draw moves every labour line (resources, opt-ins, coaching by resources, the pilot, change management); the fixed
  amounts (tooling, lines priced by amount, the hub setup's base) move with the optional amount driver (`programmeAmount`, off by default).
- **Strategies**: scale the setup amounts (`setupTooling`, `setupGov`, `setupTraining`, `setupCoaching`) — they reach the cost when the line is
  priced by amount (coaching on Automatic without a duration included).
- **Views only**: the plan (Gantt, WBS, OBS / RAM, histogram, MS Project XML) reads the same lines and durations (`plan.ts`, `histogram.ts`): the
  histogram × rate equals the programme labour cost of the cost model (a cross-surface test).

## 5. Where to read it in the app

🧩 Process (programme part) and 📋 Programme (each activity: rule, parameters, cost, placement); 📅 Plan (Gantt, WBS dictionary, histogram);
Financial › Setup breakdown; Data model › calculation zones (`run-setup-taxes`, `delivery-views`).
