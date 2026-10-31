# AgentCase 21 — User guide: the process model (BPMN), the transformation programme, the plan and the audit

> Audience: analysts and case owners who model **how the work is done** (the delivery process and the transformation programme), who does it,
> how it is planned and what the client's teams really observe. Labels in bold are the exact labels of the interface.
> Full specification: [SPEC_BPMN.md](SPEC_BPMN.md) (decisions D-B1…D-B37, phase notes); architecture: [ARCHITECTURE.md](ARCHITECTURE.md) § 14–§ 19;
> recorded differences from the legacy file: [DEVIATIONS.md](DEVIATIONS.md). Multi-product portfolios: [GUIDE_MULTI_PRODUIT.md](GUIDE_MULTI_PRODUIT.md).

## Summary

- **0. What the model is** — since v21.0.0 a case holds its delivery process, its transformation programme, its organisation, its audit and its
  decisions in **one BPMN 2.0 document**, the only stored form. Every screen reads it; every edit is one undoable step (Ctrl+Z / Ctrl+Y).
- **1. 🧩 Process (BPMN)** — the diagram (delivery process, then the programme with its swim lanes), the activity table, the parameter panel,
  import (Replace / Merge), export (BPMN, DMN, CMMN, audit, programme), and the optional diagram editor.
- **2. 📋 Programme** — every programme activity in one table: switch the opt-in ones on, choose how each cost is laid on the months (its type),
  set durations, coaching days and amounts.
- **3. 📅 Plan** — Gantt, WBS, OBS / RAM and resource histogram of the programme; MS Project XML, workbook and report exports.
- **4. 🏢 Organisation and 🧭 Who does what** — units, teams and roles; the RACI of every activity and its checks.
- **5. 🔎 Audit** — tools and observations per activity and role, the tool catalogue (verified against public sources, owner sign-off pending), calibration, evidence ledger.
- **6. Decisions (DMN)** — rules that set scope and parameters, imported and exported as `.dmn` files.
- **7. File format** — schema v4; older files open and migrate; the "different engine version" banner.
- **8. What changed in the figures** — the B9b programme decisions move the setup, NPV, ROI and payback of every case (golden NPV €1,359,010 →
  €1,348,910).
- **9. Known limits** — what is not built yet (the owner's backlog is [SPEC_BPMN.md § 20](SPEC_BPMN.md)).

---

## 0. What the model is

AgentCase used to keep the delivery process as catalogues and case keys (phases, SDLC and regulatory artefacts, rework loops, roles). Since the
BPMN migration (v20.20.0 → v21.0.0) **the case stores one native BPMN 2.0.2 XML document** (decisions D-B1 / D-B26) that holds:

| Part | What it is | Where you see it |
|---|---|---|
| Delivery process | the SDLC and regulatory work the agents change: phases as sub-processes, activities (tasks) with their role, effort, value class, AI authority, supervision split, deliverable, norm; rework loops as back flows | 🧩 Process (BPMN), and every scope screen |
| Transformation programme | the work of the transformation itself: engagement stages, pilot, setup lines, coaching, Knowledge Hub, knowledge transfer, build, run, AgentOps, waves, governance gates, opt-in activities | 🧩 Process (BPMN) (second participant), 📋 Programme, 📅 Plan |
| Organisation | units, teams, roles; the RACI of each activity | 🏢 Organisation, 🧭 Who does what |
| Audit | tools in use, observations, pain points, evidence, calibration log | 🔎 Audit |
| Decisions | DMN decision tables bound to rule tasks | 🧩 Process (BPMN) import / export |

The document is the **only** source: the screens, the engine, the workbooks and the reports read views computed from it in memory; nothing is
copied into a second place. The default case's document reproduces the legacy catalogues exactly, so a case that does not touch the process
computes as before (except the programme changes of § 8).

The file opens as-is in standard BPMN tools (bpmn.io, Camunda Modeler, Signavio / SAP, ARIS, Bizagi): the AgentCase parameters travel as
extension elements (`ac:` namespace, XSD in `docs/bpmn/`) that those tools keep.

## 1. 🧩 Process (BPMN)

Scope group; shown to Builder and Advanced by default (any persona by assignment). In a Portfolio or Wave view it shows each product's process in
counts (common or own, activities, in scope, not in the default process, actors).

### 1.1 The diagram

- **Delivery process** first, then the **Transformation programme** under it. The delivery process is drawn from its stored diagram (lanes per
  team skill, phases as sub-processes); an activity added or imported without a shape is drawn in its phase below the others.
- The programme has **swim lanes per role**: the seven operating-model roles (orchestrator, AI reviewer, preceptor, agent architect, FinOps, Design
  Authority, AI Office lead, each with its Y1 FTE) and **AI agents** in a lane of its own; its phases (engagement stages, setup per product, build
  and run per product, assurance and value) and the **waves** (a band under the lanes) are sub-processes; per-product activities carry a
  multi-instance marker (× n products); message flows link it to the delivery process (hub ready → agents enabled, knowledge transfer done →
  the product's wave starts, pilot decision → scale).
- Zoom and pan: the **+** / **−** buttons, the keys + − 0 and the arrows, or the mouse (drag, wheel). Labels appear from 200 % zoom (100 % for the
  programme). A click selects an activity; a live region names it.

### 1.2 The tables (the accessible form of the diagram)

- **Activities of the process**: sortable; filtered by phase, actor, type, scope, regulatory and text; the first 100 rows, then "Show all". The
  scope box of a row puts the activity in or out of scope.
- The actor panel lists roles and agents with their team skill and use count; it adds a role and removes an unused one.
- **Programme activities**: every programme activity and milestone; lanes (with their Y1 FTE), message flows, the transformation-team capacity
  and the waves are listed under it.

### 1.3 The parameter panel

Selecting an activity (in the diagram or a table) opens its panel.

- **Delivery activity**: name, phase, effort and the human / agent supervision split.
- **Programme activity**: description, role (lane), RACI, phase, instances, duration and placement, effort (days), cost and cost rule, type
  (§ 2), source, the WBS code override, and its own **Parameters** (for example pilot team and weeks, hub setup base and days, coaching days a
  month, trainers' FTE). In a portfolio the knowledge-subset fields show per product.
- **Wave** (portfolio): start, dependency (the wave it starts after, the milestone it waits for, the lag) and the setup capacity.

The context screens (🤝 Engage, 📅 Plan, 🧭 Program & Completeness, Agentic Setup, 🧠 Knowledge hub, 🤖 Run-team sizing, 📐 Maturity &
Measurement, 🌊 Waves…) no longer edit programme activities: they show them as read-only references with **Open … in Process**
(DEV-B9A-CONTEXT-SCREENS). The panel and 📋 Programme are the only two editors, and they edit the same values.

**Links to the activity's detail screen** (2026-10-31). The panel links to the screen where the selected element's details live, opened on
its row (highlighted, scrolled to, keyboard focus on it), and that screen links back (**Open … in Process**). Nothing changes in the case and
there is no undo step.

| Selected | Detail screen (first link) | Other links |
|---|---|---|
| Delivery (SDLC) activity, any phase | 🎯 Scope: its artefact row, kept in sight even with "show selected only" | — |
| Regulatory activity | 🎯 Scope: its artefact row (a note when its norm is not selected) | 🏛️ Industry / regulatory profile (its norm) |
| Programme activity | 📋 Programme: its row selected, its editor open | its linked section (the one the Programme table shows) |
| Milestone, maturity gate | 📋 Programme: its row selected | its linked section |
| Wave (portfolio) | 📅 Plan | — |

Back from 🎯 Scope: the focused row's **Open … in Process**, or the artefact id in **Adjust % auto & effort weight**. The read-only references on
the context screens also have **Open … in Programme** next to **Open … in Process**.

### 1.4 Import

**Import process (BPMN)…** takes a `.bpmn`, `.dmn` or `.cmmn` file. The file is read and checked first (size, security, references); nothing is
written before you press **Import**, and the import is one undoable step.

- **Mode**: **Replace the case's process by the file** (an AgentCase file: the file's whole model, its programme values included; a foreign file:
  *Replace the case's activities by the file's*) or **Merge into the case's process** (known activities take the file's parameters and scope,
  new ones are added to their phase, missing actors copied; the case's programme and audit are kept).
- **Foreign files** (from Camunda, Signavio…): each sub-process, lane or process is mapped to a phase (a suggestion by id or name, which you can
  change); each role is mapped to a case role or becomes a new role whose team skill you pick. New activities take the parameters of their
  phase and type and are flagged "parameters to review".
- The preview lists added / updated / out of scope / removed / left out / defaulted activities; the report adds the elements not mapped and the
  net benefit, ROI and FTE before / after. An in-scope-only export cannot replace a full process.
- A `.dmn` file replaces the case's decisions (§ 6); a `.cmmn` file brings back names, roles and frequencies of the run phase.

### 1.5 Export

**Export process (BPMN)…** (also in the File menu) opens a dialog:

- **Products** (portfolio): **Product shown**, **One file per product**, **One file, one pool per product**.
- **In-scope activities only**: a lighter file for presentations (marked partial; it cannot replace a process on import).
- **Include audit data** (shown only when the case holds audit data, off by default: client data; the file name then says
  "contains_audit_data").
- **Processes**: **Delivery process** (default), **Transformation programme** (its pool, the delivery pool as a black box for the message flows) or
  **Both, in one file**.
- **Decisions as a DMN file (.dmn)** (checked when the process holds decisions; otherwise the case's current rules are written as three decision
  tables) and **Run phase as a CMMN case (.cmmn)**.

Every export is valid BPMN 2.0.2 with its diagram and BPSim data; export → import → export of an unchanged case is byte-identical.

### 1.6 The diagram editor (optional)

**Edit diagram**, under the read-only diagram, loads bpmn.io's modeler (bpmn-js, shipped inside the file, loaded only on demand, offline).
Draw or move tasks, then **Save to the case** (one undoable step), **Reload from the case** or **Close editor** (a second press, *Close and
discard the changes*, when there are unsaved edits).

- A task drawn in a phase becomes an activity with the defaults of its phase and type ("review them in the table"); a task moved to another phase
  takes that phase; events, gateways, annotations and other elements AgentCase does not model are kept as they are.
- Refused, with a message: adding or removing pools, processes or phases, changing actors or norms, moving or removing a task of a rework loop.
- Ctrl+Z on the canvas is the editor's own undo; outside it, the case's. An edited editor refuses to save over a change made elsewhere until you
  reload it.
- The **bpmn.io watermark** in the corner of the canvas is required by the bpmn-js licence and always stays visible.

## 2. 📋 Programme

Scope group; Builder and Advanced. One row per activity and milestone of the transformation programme (per product × n in a portfolio).

| Column | What it does |
|---|---|
| **Enabled** | the activity counts (cost, timing, Gantt, histogram) or not. The opt-in activities are off by default (decision D-B31): engagement stages, value tracking, AI Act obligations, audit and discovery interviews, licence procurement, agent-toolchain integration, rollout hypercare, legacy decommissioning. The hub and readiness activities follow their module; the others are required (locked). |
| **Activity** | name, phase or wave, per-product tag, gateway / milestone tag |
| **Description** | the catalogue's text or your own (blank = the catalogue's); also written into the BPMN export |
| **Type** | how the cost is laid on the months (below) |
| **Start / duration** | the placement and duration from the one timing owner |
| **Cost** | the amount with its rule; for resource activities the days, days a month, day rate and role |
| **Y1 … Yn** | the cost of each horizon year in the euro result |
| **Linked section** | the context screen that uses the activity, and "Open … in Process" |

**Edit** opens the activity's description, timing and cost parameters (the panel's own fields). The totals row is the programme cost of the euro
result by year; the pilot is shown beside it, outside the euro result (DEV-COSTMODEL-PILOT). Filters: phase, product level, type, enabled.

**Types and how each changes the cost**

| Type | Months | Effect |
|---|---|---|
| **One-off** | the whole cost in the activity's first month | same amount, earlier: lower NPV, payback may move |
| **Spread** (default) | evenly over the duration, the last month pro rata | the B9b rule; no figure moves when you keep it |
| **Spread on adoption curve** | over the duration, each month weighted by the adoption the product gains that month | the cost follows the ramp: later spend, higher NPV |
| **Recurring** | the cost over its duration charged again every 12 months up to the horizon | the **total** grows (one charge per year) |
| **Milestone** | no cost | gates and maturity transitions |

The pilot, the build ramp, the run, AgentOps and the hub run keep the rule of the figure that computes them (shown read-only).

**Coaching** (decision D-B30, revised 2026-10-31): one activity priced as labour: **coaching days a month** (default 2) × **months** × the role's day
rate (the target blended rate × 1.15, like training and governance), spread over its months from the product's month 1. A case that only has the
former amount (`setupCoaching`) is calibrated: total days = amount ÷ day rate, months = days ÷ days a month, so its cost stays the amount. The
40 / 30 / 20 % coaching curve of 📐 Maturity & Measurement is informative only.

## 3. 📅 Plan

The former 📅 Gantt / Timeline section (the menu keeps that label for the legacy round trips; DEV-B9D-PLAN-SCREEN). Views only: every row opens its
activity in 🧩 Process (BPMN). Tabs:

- **📅 Gantt** — the case timeline as before, then the **programme Gantt**: one bar per enabled activity placed by the timing owner,
  finish-to-start links with lag, milestones (the Decide & Scale gate, the engine's maturity and governance crossings), the critical path, and its
  schedule table. Product, Wave and Portfolio scopes (the portfolio shifts each product to its month 0).
- **🧱 WBS** — level 1 programme, level 2 engagement stages / each wave ("Rollout" for a single case) / programme assurance, level 3 product, level 4
  work packages; codes `1.2.3.4` from the tree, an override per activity (WBS code field of the panel; a duplicate is flagged and ignored).
  WBS dictionary: description, deliverable, Accountable, roles, effort, cost, duration, start, finish, predecessors.
- **🏢 OBS / RAM** — OBS: units → teams → roles of the organisation, the transformation team and the agents. RAM: work packages × roles with the
  RACI letters and the RACI checks on each row.
- **📊 Histogram** — labour per month stacked by role, in **FTE** (default) or **person-days**, with the roles' capacity line and over-allocation
  flags (no automatic levelling, D-B37); the table alternative; for a product, the delivery process's FTE before / after agents per role, read
  from the engine. Σ histogram × rate = the programme's labour cost in the cost model.

Exports: **⬇ MS Project XML** (MSPDI: summary tasks, work packages with WBS code, start, finish, durations, predecessors, a generic resource per
role, assignments; opens in MS Project / ProjectLibre and imports into Primavera; export only, D-B36), **⬇ Results workbook with the plan sheets**
(WBS, WBS dictionary, OBS, RAM, Histogram), **⬇ Plan report** (Gantt, WBS and histogram pages). They are derived views (a documented mapping, not a
standard conversion).

## 4. 🏢 Organisation and 🧭 Who does what

**🏢 Organisation** (frame group; Admin, Builder, Business journey): the unit tree of any depth (editable with the keyboard), the **Owning unit of
each product** (one unit at any level, or **Unassigned**; a unit counts the products of its sub-units), the teams with their lines (skill · grade ·
location · FTE: each product's entry team and the shared team lines, stored as teams in the organisation part of the case's process document) and the
role catalogue. The entry team and the shared team table keep their own screens; this section links to them. The **📦 Products** table has an
**Owning unit** column too. A product that has its own process keeps no copy of the organisation: units, teams and owners are common.

**Looking at one unit** (two products or more): **👁 Show** lists the units under **Units** — the tree in order, indented by level (a screen reader
says "Cards, unit level 3"), then **Unassigned**. Choosing a unit shows, everywhere, the figures of the products it owns, directly or through its
sub-units, added up exactly as a wave adds up its products: cash flow, NPV, ROI, payback, FTE before / after, run cost, the 📅 Plan views (Gantt,
WBS, OBS, RAM, histogram) and each section's aggregate view; the headline bar names the unit. A unit that owns every product shows the Portfolio's
figures. Waves stay separate (a wave can span several units). A unit with no planned product shows an empty state with where to fix it. The Monte
Carlo distribution and the verdict of a unit come from the same portfolio run (🎲 Portfolio stress, **Run**): its products' draws added up, so 🎲
Monte Carlo, 🧭 Decision and 📋 Results speak for the unit as for a wave, and choosing another unit draws nothing again. 🧭 Decision and 🏆 Strategy
comparison rank the units below the one shown (at the Portfolio: the top units and Unassigned) by verdict, confidence and NPV; **Show** on a row opens
that unit. After an owner change the run is marked stale: **⟳ Run again**.
Like the other choices of Show, it is view state: no undo step, not saved.

**Shared services** (tab **Services** of 🏢 Organisation). Tick **Service** on a unit (a test centre, an architecture office…) to make it a
shared service. In the Services tab, give it **activity types** (for example Test/QA: every Test/QA activity of every product) and **roles** (every
activity where one of them is Responsible in 🧭 Who does what); the activities pinned on its lines count too. Add its lines (**+ Add a line**) or move a
shared line into it (**Move a shared line here**). By default a service line is **split by effort**: each product gets the share of the line that the
service's activities weigh in it (a product where it does twice the work pays twice as much), so the shares always add up to 100 %. Choose **Fixed
shares (override)** to set the percentages yourself in the 📦 Products shared team table (they start from the effort split). For each service the tab
shows what it delivers to each product (open an activity in 🧩 Process from there), its load month by month against its capacity (the FTE of its
lines; a month above it is flagged) and its cost by product. The tab follows **👁 Show**: one product, a wave, a unit or the portfolio. Shared lines
that you had before keep their shares, so no figure moves until you split a line by effort.

**🧭 Who does what** (scope group): the RACI of every activity (Responsible, Accountable, Consulted, Informed), stored as standard BPMN
`resourceRole`s, so other tools keep it.

- Tabs **RACI matrix** (filtered by phase, team, unit and product staffing), **By activity**, **By role**, **By team**, **By unit**, **By product**:
  who does what, who decides, which teams serve a product, how the load splits (effort points, a view, not an engine figure).
- **RACI editor** per activity (**Save the RACI**, **Back to the default**). Default: the activity's performer is Responsible and Accountable "to
  confirm". A human Accountable is optional for agent activities (D-B18: shown as information).
- **RACI and staffing checks**: no Responsible or several Accountable (errors); no Accountable or unknown role (warnings); per product "role not
  staffed" when no team serving it has a line of the role's skill; a shared team over 100 %.

The RACI does not change any euro figure yet (§ 9).

## 5. 🔎 Audit

Frame group; Admin and Business journey. The audit records what the client's teams really do, per activity and per role, inside the same
document. **Observed values never change a figure by themselves.**

- **Header** (code, client, scope, status, as of, auditors, interviews) and the files: **⬇️ Export audit template (Excel)** (one sheet per block,
  drop-down lists) / **⬆️ Import audit workbook…** (checked row by row, one undoable step, a report of added / updated / ignored rows),
  **🖨️ Audit report** (to print or save as PDF), **⬆️ Import tool catalogue…**.
- **Activities**: progress per phase, filters (phase, actor from the RACI, capability, audited), the form of the selected activity: 25 fields in 7
  blocks (Technical readiness, Volume and frequency, Time, Quality and rework, Flow, People, Pain points and opportunities), each with its source,
  date and confidence (effort, FTE share, headcount and skill gaps can be split per role); tools in use (version, edition, licences, hosting, integration, AI use, residency, owner team); pain points; evidence.
- **Roles**: the audit at role level (workload, tools, constraints), linked to 🏢 Organisation and to the activities the role is Responsible for.
- **Tool catalogue**: 129 market tools by capability and category, neutral (alphabetical, never ranked). **Verified 2026-10-31 against public
  sources; the owner's sign-off is pending.** Each entry shows its source page and how it was checked (verified, partly verified: a blank fact could
  not be confirmed, or not verified) with a note (renames, end-of-sale dates, removed facts). A client tool can be added to the case's catalogue;
  entries can be retired, restored or removed; JSON export and import.
- **Coverage and calibration**: coverage (count and effort-weighted), the tooling map (gaps, overlaps), **Observed versus modelled** (hours per
  month, rework, automation → authority, FTE share). **Calibrate from the audit** proposes parameters with their formula (effort scaled by
  k = Σ modelled ÷ Σ observed, rework probability = the observed rate, AI authority from the automation level, never for a regulatory activity);
  only the proposals you tick are applied, as one undoable step, logged `CAL-n` with before → after.
- **Evidence ledger** (decision D-B33, DEV-AUDIT-EVIDENCE): an audited observation counts as evidence for the driver it supports — acceptance rate
  `p` ← first-pass yield and rework rate; supervising capacity ← FTE share. Its tier comes from its confidence (high MEASURED, medium BENCHMARK, low
  ASSUMPTION; no source or date → ASSUMPTION; an estimate or a date older than ~18 months → at most BENCHMARK), weighted by the effort of the
  in-scope activities. The ledger, the grade and the upgrade path use the stronger of the declared and the audited tier; the Defend section, the
  audit report and the results workbook show the same rows. Without audit data nothing changes.

Audit data are client data: the BPMN export, the workbook, the report and the HTML snapshot ask before including them and say "contains audit
data" in their names.

## 6. Decisions (DMN)

A case can hold DMN 1.3 decision tables inside its process. A **business-rule task** bound to a decision applies it to every activity of its
phase (AI authority, human / agent supervision split), and gateway conditions can read a decision to switch parts of the scope on or off. The
evaluator supports the hit policies UNIQUE, FIRST, PRIORITY, ANY, COLLECT (SUM, COUNT, MIN, MAX), RULE ORDER and OUTPUT ORDER over a safe FEEL
subset; an ambiguous result is an error, never a guess.

- **Export**: the export dialog's **Decisions as a DMN file (.dmn)**; a case without decisions exports its current rules as three tables (AI
  authority per activity class, supervision split per authority level, quality-gate review).
- **Import**: a `.dmn` file in **Import process (BPMN)…** replaces the case's decisions (checked in full first; one undoable step).
- Edit the tables in a DMN tool; AgentCase has no decision editor (§ 9).

## 7. File format

- Every file (JSON, HTML snapshot, autosave) carries `_schemaVersion: 4`. The case's BPMN document is in the key `BPMN` as XML text; since schema v4
  the programme's values (activity parameters, opt-in switches, cost profile types, descriptions, WBS overrides) are one `ac:programmeValues`
  element of that document, not separate keys.
- **Older files open and migrate on open**: v18.x snapshots and workbooks, v19 / v20 files (schema 1 and 2: the process document is written from
  their scope keys; schema 3: the programme's values move into the document). The figures of a migrated file are those of the current engine.
  Saving writes schema 4; a build older than v20.34.0 refuses it ("made with a newer AgentCase") rather than guess.
- **"This saved case was computed by a different engine version"**: the B9b decisions changed the results of the same inputs, so the Time Engine's
  calculation version is `agentcase.timeengine.v2`. A case saved with its figures by an earlier build shows this banner with the saved and the
  live headline; the figures shown are always recomputed live (**Dismiss** hides it; saving the case stores the new figures).
- The parameters workbook keeps its legacy sheets (written from the document); a product override of the process travels in the Overrides sheet as
  the document itself.

## 8. What changed in the figures

The BPMN migration is figure-neutral except where a decision moved a figure on purpose. Each change is recorded in [DEVIATIONS.md](DEVIATIONS.md):

| Id | What changed |
|---|---|
| DEV-B9B-SETUP-SPREAD | each setup line is spent over its activity's duration (the setup duration, 12 months by default) instead of the engine's fixed 6 months (D-B27) |
| DEV-B9B-PILOT | the Pilot & Prove stage is the pilot (16 weeks, before the build); onboarding runway 18 → 28 weeks; the pilot stays outside the headline (D-B28) |
| DEV-B9B-HUB-TIMING | the Knowledge Hub setup is spent over its own days, before the product's month 0 (month 1 for a single case) (D-B29) |
| DEV-B9B-COACHING | coaching is days a month × months, calibrated to the old amount: same amount, spent over its months (D-B30) |
| DEV-B9B-RESOURCES | training and governance are labour from resources: training €45,000 → €52,877, governance €20,000 → €26,438.5 (§ 19.3) |
| DEV-REGINCLUDE-DERIVED | "Include regulatory artefacts" is the process's value only; a case whose box and value disagreed now shows the value (no euro figure) |
| DEV-AUDIT-EVIDENCE | audited observations count in the evidence ledger; no change without audit data |

**Golden case, all B9b changes together:**

| Figure | Before (v20.30.0 and the legacy file) | After (v20.31.0 onward) |
|---|---|---|
| Setup total | €225,000 | €239,315.5 |
| Net benefit | €1,603,919 | €1,589,603 |
| ROI | 7.13 | 6.64 |
| NPV (8 %) | €1,359,010 | €1,348,910 |
| Payback | month 9 | month 6 |
| Y3 savings, run cost | unchanged | unchanged |

The parallel run and the Excel cross-check report these differences under their ids; every other figure is identical to the legacy file.

## 9. Known limits

The full list, with the section that records each item, is the owner's backlog in [SPEC_BPMN.md § 20](SPEC_BPMN.md). In short:

- **Catalogues**: the JSON catalogues still generate the default process (D-B9 not done); the agent factory stays out of the BPMN scope.
- **Process screen**: a pinned value cannot target a custom activity; per-phase tables do not show a custom phase; the editor has no properties
  panel, shows the first diagram only and loses its own undo history on save; the delivery diagram keeps its team-skill lanes (no agents' lane).
- **Extended profile** (data, events, volumes, library, interfaces, colours): built in the model, without screens; hand-off cost, cadence, waits and
  change-failure rate are views, not figures; the shared process library is not applied to portfolio products; the import report does not show
  what foreign content was kept or dropped.
- **Decisions and CMMN**: no screen edits or binds a decision; the CMMN read-back drops what it does not map; decisions are not drawn.
- **Organisation**: the RACI does not drive a figure; a product's own process carries its own RACI (the RACI is part of the activities); the organisation
  lane view is not offered in the export dialog and has no geometry; programme lanes are not linked to the organisation's roles.
- **Audit**: the tool catalogue awaits the owner's sign-off; no audit on programme activities; a Merge import does not merge audit data; the header and role-level audits
  are not in the audit workbook; the diagram is not coloured by audit status.
- **Programme and plan**: a case-level opt-in switched on in a portfolio's common values counts in every product; the waves, the knowledge subset
  and the setup capacity are portfolio data outside the document; `setupTraining` / `setupGov` are kept (still read by legacy outputs); the
  histogram stacks by role only; the MS Project file was validated against Microsoft's schema but not opened in MS Project here.
