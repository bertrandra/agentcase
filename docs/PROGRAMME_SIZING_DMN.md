# Normalising the programme's sizing rules as DMN — analysis and classification

> Status: analysis (2026-11-02), no code change. Input: docs/PROGRAMME_SIZING.md (the inventory of the rules as built). Question asked: how to
> normalise the sizing of the programme activities — € amounts, time, rate card, spread over time, over the adoption curve — so they can be
> expressed as DMN decisions (the case already reads and writes DMN 1.3 with a safe FEEL subset, docs/SPEC_BPMN.md F-B51 / F-B62).

## 1. One normal form

Every cost line of the programme, whatever it is today, can be written as the product of five independent parts:

```
cost(line, month) = A(line) × Q(line) × P(line) × D(line, month)        with D laid on the window W(line) = [start, start + duration)
```

| Part | Question it answers | Unit | Today scattered in |
|---|---|---|---|
| **A — Activation** | Is the line in the cost at all? | 0 / 1 | module switches (`khEnabled`, `hriEnabled`), opt-in keys (`opt*`), pricing mode (FX-D13), FX-D8 feeds |
| **Q — Quantity** | How much work (or how many €) does it take? | effort-days, or € | `profile.ts`, `optIn.ts`, `knowledge.ts`, `engagement.ts` |
| **P — Price** | What is one unit worth? | €/day (or 1 for €) | `programmeRates` (TJM × 1.15), `targetBlendedTJM`, HRI band costs |
| **W — Window** | When does it start, how long does it last? | product months | `timing.ts`, `placement.ts`, `optInPlan` |
| **D — Distribution** | How is the amount laid on the months of its window? | weights adding to 1 | `spreadMonths`, `costProfile.ts` |

Two cross-cutting attributes ride on every line: the **level** (case: once per portfolio; product: per product) and the **uncertainty** (the
Monte Carlo rate draw moves P, never a fixed €).

## 2. The classification

### 2.1 Quantity patterns (Q)

| Code | Pattern | Formula (effort-days) | Lines today |
|---|---|---|---|
| Q-FTE | FTE × duration | fte × months × wd / 12 (or × weeks × wd / 52) | training, governance, engagement stages, hypercare, value tracking, pilot |
| Q-RATE | days per period × periods | daysPerPeriod × periods | coaching (days / month), AI Act (days / year) |
| Q-LUMP | a lump of days | days | audit interviews, procurement, Decide & Scale workshop, decommissioning |
| Q-COUNT | count × unit effort | n × daysEach | toolchain integration (tools × days) |
| Q-PARAM | a parametric € amount | base × f(driver) | Knowledge Hub setup (base × (0.5 + 0.25 × CC gap)) |
| Q-HEAD | headcount × unit € | heads × €/head | change management (entry FTE × HRI band €) |
| Q-AMOUNT | a fixed € amount | € | tooling, training / governance priced by amount, decommissioning saving |
| Q-ENGINE | derived by the engine | (not a sizing rule) | agentic run, AgentOps run team, hub run, build ramp |
| Q-CALIB | quantity calibrated from an amount | days = € / rate | coaching with no months entered |

### 2.2 Price patterns (P)

| Code | Pattern | Value | Lines today |
|---|---|---|---|
| P-ROLE | role rate: target day rate × AI-skill premium | TJM × 1.15 | every resource and opt-in line, coaching |
| P-TJM | target day rate, no premium | TJM | pilot, hub curation, hand-offs |
| P-BAND | a € per unit picked by a band | 1,200 / 3,000 / 5,500 € by HRI band | change management |
| P-NONE | already € | 1 | tooling, amounts, hub setup |

The **rate card** is one input to P-ROLE and P-TJM today: the blended target day rate (rate card × target location mix). It is not yet per role
or grade: every programme role gets the same blend × 1.15.

### 2.3 Window patterns (W)

| Code | Anchor | Duration source | Lines today |
|---|---|---|---|
| W-STAGE | case start, stages back to back | stage weeks (`rmD1..3`, 4 each) | engagement stages |
| W-PRE | ends at the product's month 0 | pilot weeks; 1 month; hub days; `ktLeadMonths` | pilot, audit interviews, procurement, hub setup, KT preparation |
| W-SETUP | product month 1 | own duration, else the setup duration | tooling, training, governance, coaching, change, integration |
| W-AFTER | after the setup | 1 month | decommissioning (and its saving from the next month) |
| W-GOLIVE | product month 1 (agent go-live) | weeks | hypercare |
| W-HORIZON | product month 1 | to the horizon | value tracking, AI Act, run lines |

### 2.4 Distribution patterns (D)

| Code | Pattern | Lines today |
|---|---|---|
| D-SPREAD | evenly over the window, last month pro rata (default of every line) | all lines unless set otherwise |
| D-ONEOFF | all in the window's first month | per line, chosen in 🧩 Process (`costProfile_<line>`) |
| D-CURVE | along the product's S-curve (the adoption gained each month) | per line, chosen |
| D-RECUR | the window's spread again every 12 months to the horizon | per line, chosen |
| D-CONT | a monthly rate while a condition holds (agents present) | run lines (engine) |

### 2.5 Activation patterns (A)

| Code | Pattern | Lines today |
|---|---|---|
| A-ALWAYS | always in | tooling, training, coaching, governance |
| A-MODULE | when a module is on | hub setup / run (`khEnabled`), change (`hriEnabled`) |
| A-OPTIN | off by default, switched on | the eight opt-in groups |
| A-MODE | one of two rules by a mode | training / governance (resources or amount), run team (hybrid or legacy) |
| A-ONCE | case-level line counted once per portfolio | the case-level opt-ins |

### 2.6 Every line in the grid

| Line | A | Q | P | W | D (default) | Level |
|---|---|---|---|---|---|---|
| Engagement stages | A-OPTIN, A-ONCE | Q-FTE + Q-LUMP (workshop) | P-ROLE | W-STAGE | D-SPREAD | case |
| Pilot | A-ALWAYS (not in the € result) | Q-FTE | P-TJM | W-PRE | D-SPREAD | product |
| Tooling & infra | A-ALWAYS | Q-AMOUNT | P-NONE | W-SETUP | D-SPREAD | product |
| Training | A-MODE | Q-FTE / Q-AMOUNT | P-ROLE / P-NONE | W-SETUP (own months) | D-SPREAD | product |
| Coaching | A-ALWAYS | Q-RATE (or Q-CALIB) | P-ROLE | W-SETUP (own months) | D-SPREAD | product |
| Governance | A-MODE | Q-FTE / Q-AMOUNT | P-ROLE / P-NONE | W-SETUP (own months) | D-SPREAD | product |
| Change management | A-MODULE | Q-HEAD | P-BAND | W-SETUP | D-SPREAD | product |
| Knowledge Hub setup | A-MODULE | Q-PARAM | P-NONE | W-PRE (days) | D-SPREAD | product (hub once) |
| Value tracking | A-OPTIN, A-ONCE | Q-FTE | P-ROLE | W-HORIZON | D-SPREAD | case |
| AI Act | A-OPTIN, A-ONCE | Q-RATE | P-ROLE | W-HORIZON | D-SPREAD | case |
| Audit interviews | A-OPTIN, A-ONCE | Q-LUMP | P-ROLE | W-PRE | D-SPREAD | case |
| Procurement | A-OPTIN, A-ONCE | Q-LUMP | P-ROLE | W-PRE | D-SPREAD | case |
| Toolchain integration | A-OPTIN | Q-COUNT | P-ROLE | W-SETUP | D-SPREAD | product |
| Hypercare | A-OPTIN | Q-FTE | P-ROLE | W-GOLIVE | D-SPREAD | product |
| Decommissioning | A-OPTIN | Q-LUMP (+ Q-AMOUNT saving) | P-ROLE | W-AFTER | D-ONEOFF in effect (1 month) | product |
| AgentOps run team | A-MODE | Q-ENGINE | P-ROLE | W-HORIZON | D-CONT | product |
| Knowledge Hub run | A-MODULE | Q-FTE + Q-AMOUNT (infra) | P-TJM | W-HORIZON | D-CONT | product |
| Hand-offs (FX-D8) | A-OPTIN | Q-ENGINE (hours) | P-TJM / 8 | W-HORIZON | D-CONT | product |

Eight Q patterns, four P, six W, five D and five A cover every line: the programme's sizing is a small grammar, written today as code.

## 3. What DMN would hold, what stays in code

AgentCase's FEEL subset evaluates expressions and DMN cells (no loops over lists), so the split is:

- **DMN decides the parameters** of each line: its activation, quantity rule and inputs, price rule, window and distribution type.
- **Code applies them**: the five pattern functions (one per part) lay the € on the months; the engine stays the owner of Q-ENGINE and D-CONT.

### 3.1 Decision requirements (DRD)

```
Input data:  activity (kind, level, pricing mode, switches) · case parameters (FTE, days, months, weeks, amounts) · rate card · horizon
                 │
     ┌───────────┼──────────────┬───────────────────┬────────────────────┐
     ▼           ▼              ▼                   ▼                    ▼
 dec_activation  dec_quantity   dec_price           dec_window           dec_distribution
 (table: kind,   (table: kind,  (table: role/lane,  (table: kind →       (table: kind, chosen
  switch, mode    mode → Q code  location mix → €/   anchor, duration     profile → D code)
  → in / out)     + BKM call)    day; premium)       key, default)
     └───────────┴──────────────┴─────────┬─────────┴────────────────────┘
                                          ▼
                              dec_line_cost  (literal expression: A × Q × P)  →  code: D over W, month by month
```

### 3.2 The decision tables

| Decision | Hit policy | Inputs | Outputs | Replaces |
|---|---|---|---|---|
| `dec_activation` | FIRST | activity kind, module flags, opt-in switch, pricing mode, level, carrier product | in / out, counted once | `optInOn`, `khEnabled` / `hriEnabled` tests, FX-01 carrier, FX-D13 mode |
| `dec_quantity` | UNIQUE | activity kind, pricing mode | Q code + the input names it reads (e.g. Q-FTE: `trainFte`, `trainMonths`) | the per-line arithmetic of `profile.ts`, `optInPlan` |
| `dec_price` | UNIQUE | lane role (preceptor, orchestrator…), price rule | €/day factor (1.15 for the transitional roles, 1 for P-TJM) and the rate source | `programmeRates`, `AI_SKILL_PREMIUM` |
| `dec_rate_card` | COLLECT (SUM, weighted) | role / grade, location, target mix | blended €/day | `targetBlendedTJM` (today one blend for all roles) |
| `dec_window` | UNIQUE | activity kind | anchor (W code), duration input key, default, unit (days / weeks / months) | `timing.ts`, `placement.ts`, `DURATION_KEY` |
| `dec_distribution` | UNIQUE | activity kind, chosen profile | D code | `costProfile.ts lineProfile` |

The **business knowledge models** (BKMs) are the eight Q formulas, written once in FEEL (all within the subset: arithmetic on numbers):

```
bkm_fte(fte, months)              = fte * months * workdays / 12
bkm_rate(daysPerPeriod, periods)  = daysPerPeriod * periods
bkm_lump(days)                    = days
bkm_count(n, daysEach)            = n * daysEach
bkm_param(base, gap)              = base * (0.5 + 0.25 * gap)
bkm_head(heads, unitCost)         = heads * unitCost
bkm_amount(amount)                = amount
bkm_calib(amount, rate)           = amount / rate
```

### 3.3 What it gives

- **One grammar for every line**: a new activity is a row in five tables, not a new branch in `profile.ts`.
- **Readable and exportable**: the `.dmn` the case already exports (F-B62) gains the sizing; a DMN tool edits it; the DRD diagram (FX-26) shows it.
- **The rate card per role** becomes a table (`dec_rate_card`), the natural place for a grade or location mix per programme role (today one
  blend × 1.15).
- **One place for defaults**: the defaults now live in three places (constants in `profile.ts`: `TRAIN_FTE`, `GOV_FTE`, `COACH_DAYS_PER_MONTH`;
  the catalogue's parameter labels; `optIn.ts P(…, def)`), which become the tables' default rows.

## 4. Irregularities to settle before normalising

| # | Irregularity | Where | Normalisation proposed |
|---|---|---|---|
| 1 | The pilot is priced at the TJM (no 1.15) and kept out of the € result | `pilotLine`, DEV-COSTMODEL-PILOT | decide: P-ROLE and in the result, or keep as a view (A-VIEW) |
| 2 | Three calendars: working days / 12 (FTE lines), weeks × 12 / 52 (stages, pilot, hypercare), days × 12 / 365 (hub setup) | `timing.ts`, `optIn.ts` | one unit table in `dec_window`: days, weeks, months with one conversion each |
| 3 | Coaching mixes quantity and amount (Q-CALIB when no months) | `coachingPlan` | an explicit pricing mode, as training / governance (FX-D13) |
| 4 | HRI change cost per head is a band constant, not on the rate card | `hriCostPerFTE` | keep P-BAND as its own table, or express it as days per head × P-ROLE |
| 5 | Value tracking is "FTE over the horizon", AI Act "days per year": two forms of a recurring effort | `optInPlan` | one Q-RATE (per year) with W-HORIZON |
| 6 | Defaults written in three places | see § 3.3 | the tables' default rows |
| 7 | Decommissioning's saving is a negative cost on another line | `engineProfile.saving` | a separate output (saving) of the line, not a sign trick |
| 8 | Hub run: curation priced at TJM (no premium) while hub setup is an amount | `khRunAnnual`, `khSetupCost` | decide P-ROLE or P-TJM for curation, Q-PARAM kept for setup |
| 9 | The Monte Carlo moves P only; a fixed € never moves | `programmeRates` × rate draw | an uncertainty column in `dec_quantity` (spread per Q code), so amounts can be drawn too |

## 5. A path, if adopted

1. **No figure moves**: write the five tables and the BKMs from today's rules (the grid of § 2.6), evaluate them beside `profile.ts`, and test
   that every line of the 107 fixtures gives the same months to the cent (the parity method of the earlier migrations).
2. **Switch the owner**: `programmeLines` reads the decisions; `profile.ts` keeps the D and W functions and the engine lines.
3. **Settle § 4** one decision at a time (each a figure change, with its deviation), starting with the units (#2) and the defaults (#6).
4. **Rate card per role** (`dec_rate_card`), a new input, opt-in.

Decisions for the owner: adopt the normal form (§ 1)? DMN as the owner of the parameters, code as the owner of the months (§ 3)? Which of § 4 to
settle, and in which direction?
