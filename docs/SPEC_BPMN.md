# AgentCase — Specification: the delivery process as a native BPMN 2.0 model (export and import)

> Status: **proposed, not built**. Decisions D-B1…D-B10 (§ 12) and D-B11…D-B14 for the audit layer (§ 15.6) to be adopted. Scope: the TypeScript + React application in `app/`.
> Related documents: [ARCHITECTURE.md](ARCHITECTURE.md), [DEVIATIONS.md](DEVIATIONS.md), [SPEC_MULTI_PRODUIT.md](SPEC_MULTI_PRODUIT.md).
> Code rules unchanged: files ≤ 150 lines, no `any`, layers `ui → controllers → store → domain`, every write is an undoable
> command, one owner per figure in `src/domain`, single-product figures identical to the legacy file unless a deviation is recorded.

## 1. Objective

Today the delivery process of a case is spread over catalogues and case keys: 11 phases plus a "Cross-cutting" bucket
(`catalog/phases.json`), 53 SDLC artefacts (`catalog/artefacts.json`), 370 regulatory artefacts over 47 norms
(`catalog/regCatalog.json`), 3 rework loops (`catalog/loopPairs.json`), the role vocabulary (`skillMap`) and the case choices
(`selectedArtefacts`, `phaseOff`, `phaseSeq`, `artefactsEdited`, `regArtefactsEdited`, `selectedNorms`, `selectedRegArtefacts`,
`regInclude`). None of it can leave the application as a process model, and no client process can come in.

Target: **the delivery process of a case is one process model, stored and exchanged as native BPMN 2.0.**

- **Export** — any case (or any product of a portfolio) exports its process as a `.bpmn` file. The file is valid BPMN 2.0.2 XML,
  carries its diagram (BPMN DI), and opens as-is in standard tools: bpmn.io, Camunda Modeler, Signavio / SAP, ARIS, Bizagi.
- **Import** — a `.bpmn` file produced by AgentCase, or authored by the client in one of those tools, imports into a case. Its
  activities, actors and parameters drive the calculation exactly like today's catalogue.
- **Round trip** — export, edit in a BPMN tool, import: nothing AgentCase does not understand is lost, and an export of an
  unchanged case is byte-identical every time.
- **Beyond SDLC** — the model holds every kind of activity the case reasons about: SDLC activities, regulatory and compliance
  activities, run / support activities, governance (quality gates, approvals), review and supervision steps, agent runs,
  rework loops. Each has its actors (human roles, AI agents) and its parameters (effort, weight, value class, AI authority,
  human / agent supervision split, capability, deliverable, norm…).

- **Audit** — a capture layer on each activity and actor records the technical audit (tools in use, picked from a catalogue of
  market tools proposed per activity) and the operational audit (volumes, time, rework, hand-offs, pain points), shown against the
  model and fed back into it only by explicit calibration (§ 15).

Guiding principle: **the BPMN model is the single source of truth of the process.** The catalogues become the *default
process* (a BPMN model shipped with the application); the case keys listed above become views derived from the case's process
(read-only projections kept for the engine, Excel and legacy files). No figure is computed twice.

## 2. Vocabulary

| Term | Definition |
|---|---|
| **Process model** | The case's delivery process: a BPMN 2.0 `definitions` document (semantic model + diagram). |
| **Default process** | The process built from today's catalogues, shipped with the application. A new case starts from it. |
| **Activity** | A BPMN task: one unit of work that produces a deliverable (today: one SDLC or regulatory artefact). |
| **Phase** | A BPMN sub-process grouping the activities of one stage (L0, V1…V7, L8…L10, Cross-cutting). |
| **Actor** | Who performs or supervises an activity: a **role** (human, e.g. Dev, Test/QA) or an **agent** (AI). A BPMN `resource`. |
| **Lane** | The swimlane of an actor family in the diagram (one lane per team skill: Analysis/PO, Arch/Design, Dev, Test/QA…). |
| **Parameter** | A value of an activity, actor or flow the engine reads (effort, weight, supervision split…). |
| **In scope** | An activity the case counts (today: selected artefact in an active phase). Out-of-scope activities stay in the model. |
| **AgentCase profile** | The subset of BPMN 2.0 the application reads and writes, plus its extension namespace (§ 5). |
| **Pass-through** | BPMN content AgentCase does not interpret but keeps and writes back unchanged. |

## 3. Today's model and where each piece goes

| Today | Count (default case) | BPMN element | Notes |
|---|---|---|---|
| Phase (`phases.json`: id, name, role, seq) | 11 + Cross-cutting | `bpmn:subProcess` per phase | Order by sequence flows (`phaseSeq`); Cross-cutting = an `adHocSubProcess` in parallel (parallel gateways). |
| Phase switched off (`phaseOff`) | per case | `ac:inScope="false"` on the sub-process | The phase stays in the model and on the diagram (greyed). |
| SDLC artefact (`artefacts.json`) | 53 | `bpmn:task` subtype by activity type (§ 4.2) | `id` A001… kept as the task id. |
| Regulatory artefact (`regCatalog.artifacts`) | 370 | `bpmn:task` with `ac:regulatory="true"`, `ac:norm` | Placed in its phase, or in Cross-cutting. |
| Norm (`regCatalog.norms`) | 47 | `bpmn:category` / `categoryValue` per norm, grouped by industry | Tasks reference it through `categoryValueRef` (a `bpmn:group` on the diagram). |
| Deliverable (artefact `deliverable` text) | per artefact | `bpmn:dataObject` + `dataOutputAssociation` | The deliverable text is the data object's `documentation`. |
| Role (artefact `skill`, `skillMap` → team skill) | 26 roles → 7 team skills | `bpmn:resource` (role) + `humanPerformer` | Lanes = team skills; `skillMap` becomes the resource's `ac:teamSkill`. |
| AI agent (activity type "Agent") | per activity | `bpmn:resource` `ac:kind="agent"` + `performer` | The agent is an actor of its own, supervised by a role. |
| Effort, weight `w`, value class, seq, capability, story id | per artefact | `ac:activity` extension (§ 5) | |
| AI authority (`aiAuth`) | 4 levels + Compliance | `ac:aiAuthority` | Assistance, Copilot, Supervised autonomous, Autonomous, Compliance. |
| Supervision split (`humanSup` / `agentSup`) | per artefact | `ac:supervision human=".." agent=".."` | |
| Case edits (`artefactsEdited`, `regArtefactsEdited`) | per case | the activity's own parameters | No separate "edited" layer: the model is edited directly. |
| Selection (`selectedArtefacts`, `selectedRegArtefacts`, `selectedNorms`, `regInclude`) | per case | `ac:inScope` on tasks and norm categories | |
| Rework loop (`loopPairs.json`) | 3 | internal iterations: `standardLoopCharacteristics` on a sub-process wrapping the pair; external rework: exclusive gateway + conditional flow back | `ac:rework probability=".." costShare=".."` on the back flow. |
| Lifecycle weights (`statusLifecycle`) | 4 stages | stays a case parameter | Not a process concept; it weights phases. |
| Quality gates, approvals (`QUALITY_GATES`, `APPROVALS`) | factory model | exclusive gateway + `userTask` approval | Read and written when present (§ 4.4). |
| Team (`teamIn`: skill, grade, location, FTE, pins) | per case / product | stays case data | Linked to the process through the team skill (lane); pins reference task ids. |

## 4. Functional requirements

### 4.1 Export

- **F-B1** — "Export process (BPMN)" in the File menu and in the Process section writes a `.bpmn` file for the active case, or for
  the product shown in a portfolio. The file name carries the customer and product names and the date.
- **F-B2** — The file is BPMN 2.0.2 XML that validates against the OMG XSD (`BPMN20.xsd`, `BPMNDI.xsd`) plus the AgentCase
  extension XSD (§ 5.3). It contains the diagram (BPMN DI) laid out by AgentCase (§ 4.5).
- **F-B3** — Every activity is exported, in scope or not; scope travels as `ac:inScope`. Option at export time: "in-scope activities
  only" (a lighter file for presentations; marked `ac:partial="true"`, and refused on re-import as a replacement of a full model).
- **F-B4** — Export is deterministic: same case → same bytes (stable ids, stable order, no timestamp in the content).
- **F-B5** — A portfolio exports one `.bpmn` per product, or one file with one `bpmn:process` per product inside a collaboration
  (one pool per product). Choice in the export dialog.

### 4.2 Activity types

| AgentCase activity type | BPMN element | Meaning |
|---|---|---|
| Human | `bpmn:userTask` | A person does the work with tool support. |
| Manual | `bpmn:manualTask` | A person does the work without a system. |
| Agent | `bpmn:serviceTask` with `implementation="##WebService"` replaced by `ac:agent` | An AI agent does the work; a role supervises (supervision split). |
| Review / approval (gate) | `bpmn:userTask` with `ac:gate="true"` | A human decision point; followed by an exclusive gateway. |
| Regulatory | any of the above with `ac:regulatory="true"` | Compliance work tied to a norm. |
| Unknown task kinds on import (`scriptTask`, `businessRuleTask`, `sendTask`, `receiveTask`, plain `task`) | read as Human unless `ac:activityType` says otherwise | Kept as written on export. |

### 4.3 Import

- **F-B6** — "Import process (BPMN)" reads a `.bpmn` / `.xml` file. The import **validates fully before writing anything**
  (same rule as the parameters workbook): a file that is not BPMN, too large, or unsafe is refused with a message and the case is
  untouched. A good file is **one undoable step** ("Import process").
- **F-B7** — Two import modes:
  - **Replace** the case's process (the file becomes the process);
  - **Merge**: activities with a known id update their parameters; new activities are added to their phase; activities missing
    from the file are kept (option: switched out of scope). A preview lists added / updated / out-of-scope / ignored items.
- **F-B8** — Files authored outside AgentCase are accepted. Mapping rules for foreign content:
  - a top-level `subProcess` or a `lane` named like a known phase (id or name) maps to that phase; otherwise the importer asks
    the user to map each unknown sub-process / lane to a phase (or to "Cross-cutting"), with a remembered mapping;
  - a task without `ac:` parameters gets defaults from the closest catalogue activity (same name) or from its phase and type,
    and is flagged "parameters to review";
  - lanes and `humanPerformer` / `potentialOwner` resource names map to team skills through `skillMap` (editable); an unknown role
    is offered as a new role, attached to a team skill chosen by the user;
  - unsupported elements (events, message flows, data stores, text annotations, other pools, BPSim data, vendor extensions) are
    **kept as pass-through** and written back on export (F-B11).
- **F-B9** — After import, a report lists: counts by kind, activities whose parameters were defaulted, unmapped roles, ignored
  or pass-through elements, and the figures that changed (headline net, ROI, FTE after) with before / after values.
- **F-B10** — Security: the reader refuses any `<!DOCTYPE`, entity declaration or processing instruction other than the XML
  declaration (no XXE, no entity expansion), caps file size (5 MB), element count (20,000) and depth (64), accepts ids from a safe
  pattern only, and never renders imported text as HTML.

### 4.4 Round trip and pass-through

- **F-B11** — Export after import writes back every element AgentCase did not interpret, in place, with its attributes and
  extension elements (other vendors' `extensionElements` untouched). AgentCase's own elements are regenerated from the model.
- **F-B12** — Idempotence: import(export(case)) gives the same case (same figures, same model) and export(import(file)) gives
  the same file for any file AgentCase wrote. Both are tested on every fixture (§ 11).
- **F-B13** — Diagram positions from an imported file are kept (BPMN DI of known elements is preserved); elements added in
  AgentCase are placed by the layout (§ 4.5) without moving the others.

### 4.5 Diagram

- **F-B14** — AgentCase lays out a process it generated: one pool per process, lanes per team skill (horizontal), phases as
  expanded sub-processes left to right in `phaseSeq` order, activities ordered by `seq` inside a phase, Cross-cutting as a band
  across the bottom, rework flows as back arcs. The layout is deterministic.
- **F-B15** — The Process section draws the diagram in SVG from BPMN DI (read-only in the first release, zoom and pan by
  keyboard and pointer), with an accessible table alternative listing the same activities (§ 8).

### 4.6 Editing in AgentCase

- **F-B16** — The Process section edits the model as a table (one row per activity) and in panels: add / rename / move / delete an
  activity, change its type, actors, parameters and scope; add / rename a role or an agent; add / remove a phase; reorder phases.
  Each change is one undoable command; continuous edits coalesce.
- **F-B17** — Existing scope sections (phase scope, scope selection, artefact editors, regulatory selection) keep their screens but
  read and write the process model through the same commands: there is no second copy of the scope.
- **F-B18** — Custom activities (not from the catalogue) count in every figure like catalogue activities, with their parameters.
  A custom activity must carry: phase, type, actor role (→ team skill), effort, weight, value class, AI authority, supervision split.
- **F-B19** — "Reset to default process" (per phase or whole) restores the catalogue activities and parameters, as one step.

### 4.7 Portfolio

- **F-B20** — The process is an overridable key at whole-key granularity (spec F6 rule): common process by default, a product may
  override it entirely ("overridden" chip, "Revert to common", "Apply to all products"). Import / export act on the scope shown.
- **F-B21** — Consolidation is unchanged: each product's effective case carries its effective process.

### 4.8 Other outputs

- **F-B22** — The HTML snapshot embeds the BPMN of the case; the results workbook gains a "Process" sheet (activities × actors ×
  parameters, read from the model); the report gets a process summary page. The parameters workbook keeps its legacy sheets
  (written from the derived views, so excel-compat stays identical) and adds a "Process" sheet; importing a workbook with that
  sheet updates the model, without it the legacy sheets apply as today.

## 5. The AgentCase BPMN profile

### 5.1 BPMN elements read and written

`definitions`, `collaboration`, `participant`, `process`, `laneSet`, `lane`, `subProcess`, `adHocSubProcess`, `task`, `userTask`,
`manualTask`, `serviceTask`, `startEvent`, `endEvent`, `sequenceFlow` (with `conditionExpression`), `exclusiveGateway`,
`parallelGateway`, `standardLoopCharacteristics`, `dataObject`, `dataObjectReference`, `dataOutputAssociation`, `resource`,
`resourceRole` / `humanPerformer` / `performer` / `potentialOwner`, `category`, `categoryValue`, `group`, `documentation`,
`extensionElements`, and BPMN DI (`BPMNDiagram`, `BPMNPlane`, `BPMNShape`, `BPMNEdge`, `Bounds`, `waypoint`, `BPMNLabel`).
Everything else is pass-through (F-B11).

### 5.2 Extension namespace

Namespace `https://agentcase.app/schema/bpmn/1.0`, prefix `ac`. Values live in `extensionElements` (and two attributes for the
most common flags, so standard tools keep them when they drop unknown elements):

```xml
<bpmn:serviceTask id="A017" name="Source code" ac:inScope="true">
  <bpmn:documentation>Production code implementing the specified behaviour.</bpmn:documentation>
  <bpmn:extensionElements>
    <ac:activity type="Agent" phase="V3" seq="1" effort="5" weight="3.2" value="VA" capability="Coding"
                 aiAuthority="Supervised autonomous" storyId="" regulatory="false"/>
    <ac:supervision human="30" agent="70"/>
  </bpmn:extensionElements>
  <bpmn:performer resourceRef="agent-coding"/>
  <bpmn:humanPerformer resourceRef="role-dev"/>
</bpmn:serviceTask>
<bpmn:resource id="role-dev" name="Dev">
  <bpmn:extensionElements><ac:actor kind="role" teamSkill="Dev"/></bpmn:extensionElements>
</bpmn:resource>
```

Flows: `<ac:rework probability="0.10" costShare="0.40" internalIterations="3"/>` on the back flow of a loop pair. Process:
`<ac:process caseSchema="3" catalogueVersion="…" partial="false"/>`. Norms: `<ac:norm industry="AERO" body="SAE"/>` on the
`categoryValue`.

### 5.3 Validation

- The extension XSD ships in `docs/bpmn/agentcase-bpmn-1.0.xsd`. CI validates every exported fixture against the OMG XSDs plus it
  (decision D-B7), and opens a sample in bpmn-js headless (moddle) as a second check of tool compatibility.
- The importer validates semantically (references resolve, one start per process, no orphan flows, ids unique, parameters in
  range) and reports each problem with the element id.

### 5.4 Optional standard: BPSim

Effort and rework probabilities can also be written as BPSim 2.0 parameters (`bpsim:BPSimData`: processing time, probability on
sequence flows, resource quantity) so that simulation tools read them (decision D-B5). AgentCase stays the owner of the values;
BPSim is a second, derived encoding on export and an accepted input on import when `ac:` values are absent.

## 6. Data model

### 6.1 Case document

- New case key `PROCESS`: the **semantic process model** as typed JSON (`domain/process/types.ts`), not an XML string
  (decision D-B1): phases, activities (id, name, kind, phase, seq, parameters, actor refs, scope, deliverable, norm refs), actors
  (roles, agents), flows (sequence, rework, gates), norms / categories, diagram (shape bounds and edge waypoints per element id),
  pass-through (the original XML fragments, keyed by parent id and position, kept verbatim).
- `_schemaVersion` 3. Migration 2 → 3 builds `PROCESS` from the default process plus the case keys of § 3, then removes the keys that
  become derived (§ 6.2). A version 2 file opens with identical figures (§ 11).
- Size: the default process is about 430 activities; the JSON stays under 400 KB per case; a portfolio stores the common process
  once and overrides per product only when a product overrides it.

### 6.2 Derived views (no second source)

`domain/process/views.ts` derives, from `PROCESS`, exactly what the engine reads today: the artefact lists with their edited
values, the selected ids, the active phases and their order, the regulatory selection, the loop pairs, the role → team-skill map.
The engine code is unchanged in the first phases; it reads the views. Legacy readers (Excel parameters sheets, old snapshot fields
in the HTML snapshot) are written from the views. A test asserts on every fixture that the views equal the version 2 keys.

### 6.3 Default process

`catalog/defaultProcess.bpmn` is generated once from today's catalogues by a script (`scripts/gen-default-process.ts`), checked
in, and read at build time. A test regenerates it and fails on any difference (like `deps:gen` / `theme:gen`). The catalogues stay
the editorial source of the default process until decision D-B9 retires them.

## 7. Engine

- **Phase 1 (parity)** — the engine reads the derived views: every figure identical on the 107 fixtures, the parallel run (40 files)
  and excel-compat (67 files).
- **Phase 2 (native)** — custom activities and actors count: a custom activity enters the same per-activity computations as a
  catalogue artefact (effort, weight, value class, AI authority, supervision split, role → team skill → rates, phase weights,
  lifecycle weights). Rework flows read their probability and cost share from the model instead of `loopPairs.json`.
- **One owner** — `domain/process` owns activity lookup, scope, ordering and parameters; no screen or export recomputes them.

## 8. Interface

- New section **🧩 Process (BPMN)** in the Scope group (persona assignment like any section): diagram (SVG, read-only),
  activity table (sortable, filterable by phase, actor, type, scope, regulatory), actor panel, import / export buttons, import
  preview and report, "Reset to default process".
- The diagram is not the only way in: every element is reachable in the table with the keyboard; the SVG has a text alternative
  and a live region announcing the selected element. axe clean in light, dark and high contrast.
- Existing sections keep their look (UI parity); their data comes from the process model.
- Phase 4 (decision D-B6): an embedded BPMN editor (bpmn-js modeler) loaded lazily from a gzipped payload, like ExcelJS, only
  when the user opens "Edit diagram".

## 9. Commands (all undoable)

`process.import` (replace or merge, one step), `process.reset`, `process.addActivity`, `process.updateActivity` (coalesced),
`process.moveActivity`, `process.removeActivity`, `process.setScope` (one or many), `process.addActor`, `process.updateActor`,
`process.removeActor` (refused while referenced), `process.addPhase`, `process.removePhase`, `process.reorderPhases`,
`process.setReworkFlow`, `process.setDiagram` (layout moves, coalesced). The existing scope commands become thin wrappers over
these. Portfolio: the process follows the override commands of spec F6–F9.

## 10. Non-functional requirements

| Topic | Requirement |
|---|---|
| Size | Default process + reader / writer + SVG renderer ≤ 250 KB in the HTML (gzip of the default BPMN like the Excel payload). The lazy editor (phase 4) is outside the 1.15× regression budget only while not loaded. Hard ceiling 5 MB kept. |
| Performance | Parse + map a 2,000-activity file < 300 ms; export < 150 ms; edit → figures < 150 ms (per-product memo unchanged). |
| Security | F-B10; imported names and documentation are text only; CSP unchanged; no network access. |
| Interoperability | Exported fixtures open without error in bpmn.io / Camunda Modeler; files saved back by those tools re-import with no loss of `ac:` data. |
| Accessibility | § 8; keyboard editing of the whole model without the diagram. |
| Determinism | F-B4; layout and ids stable; no clock in the domain. |
| Compatibility | Version 2 files, legacy files and parameters workbooks open with identical figures; excel-compat 67/67 identical. |

## 11. Acceptance criteria and test strategy

1. Migration 2 → 3 on the 107 fixtures: identical figures (oracle and cross-surface tests unchanged); views == version 2 keys.
2. Round trip: export → import → export byte-identical on every fixture and on the three sample portfolios.
3. XSD validation of every exported fixture (OMG XSDs + `ac` XSD); moddle (bpmn-js) parse with no warning.
4. Foreign files: a set of files authored in bpmn.io, Camunda Modeler and Signavio (checked in under `app/fixtures/bpmn/`) import
   with the expected mapping report and re-export with their pass-through content intact.
5. Security: XXE, billion laughs, oversized, deep, bad ids and HTML-in-names files are refused or neutralised (unit tests).
6. Custom activity and custom role: figures move by the amount computed by hand on a reference case (one dedicated test per
   parameter).
7. UI: Process section axe clean; import preview / report; undo of an import restores the exact case.
8. Gates of the repository unchanged: lint, 150 lines, dup baseline, ui-parity 0 divergence, e2e, perf budget, a11y.

## 12. Decisions to take (question, options, recommendation)

| # | Question | Options | Recommendation |
|---|---|---|---|
| D-B1 | How is the process stored in the case? | (a) BPMN XML string; (b) typed JSON semantic model + XML only at import / export | **(b)**: fine-grained undo, validation, speed; XML is the exchange format. |
| D-B2 | Granularity: one task per artefact, or explicit review tasks for supervision? | (a) one task, supervision as parameters; (b) agent task + generated human review task | **(a)** for parity; (b) as an export option ("show supervision steps"). |
| D-B3 | Phases as sub-processes or as lanes? | (a) phases = sub-processes, lanes = team skills; (b) phases = lanes | **(a)**: BPMN lanes are for performers; phases are stages. |
| D-B4 | Out-of-scope activities in exports? | (a) always, flagged; (b) never; (c) user choice | **(c)**, default (a) (F-B3). |
| D-B5 | Also write BPSim parameters? | (a) `ac:` only; (b) `ac:` + BPSim | **(b)** on export, read BPSim only when `ac:` is absent. |
| D-B6 | Diagram editing inside AgentCase? | (a) table + read-only SVG; (b) + lazy bpmn-js modeler | **(a)** first (phases B1–B5), (b) in phase B6 if the size budget holds. |
| D-B7 | XSD validation in CI how? | (a) `xmllint` on the runner; (b) a JS XSD validator in the tests | **(a)**: no new npm dependency; local `npm run gates` checks for xmllint. |
| D-B8 | Portfolio export | (a) one file per product; (b) one collaboration file | **both**, chosen in the dialog (F-B5). |
| D-B9 | When do the JSON catalogues retire? | (a) never (they generate the default BPMN); (b) after phase B5, the default BPMN becomes the source | **(b)**: one source; the generator becomes a one-off migration. |
| D-B10 | Unknown roles on import | (a) refuse; (b) map to a team skill chosen by the user, remembered | **(b)** (F-B8). |

## 13. Delivery plan (one PR per phase, merged on green CI, HTML shared)

| Phase | Content | Gate |
|---|---|---|
| B0 | This specification; extension XSD; sample foreign files | Decisions adopted |
| B1 | `domain/process`: types, default process generator, derived views, layout | Views == v2 keys on 107 fixtures |
| B2 | BPMN reader / writer (DOMParser / XMLSerializer, no new dependency), security limits, pass-through, BPSim | Round trip byte-identical; XSD-valid; security tests |
| B3 | Schema v3 + migration, `PROCESS` key, commands, existing scope sections on the model | 107 fixtures identical; parallel run 40/40; excel-compat 67/67 |
| B4 | Process section: SVG diagram, activity table, actor panel, import (replace / merge, preview, report), export | axe clean; ui-parity 0 divergence |
| B5 | Custom activities / roles / agents in the engine; rework flows from the model; portfolio override; Excel / report / HTML outputs | Hand-computed reference tests; cross-surface equality |
| B6 | Optional lazy BPMN editor (D-B6 b) | Size budget; editor round trip |
| B7 | Audit layer (§ 15): tool catalogue, `AUDIT` key and `domain/audit` (observed vs modelled, coverage, tooling map), Audit section, audit workbook, BPMN `ac:audit`, audit report, explicit calibration | Round trip with audit data; calibration log; axe clean |
| B8 | Release: guide, DEVIATIONS (if any), CHANGELOG, version bump | All gates green |

## 14. Risks

| Risk | Mitigation |
|---|---|
| Parity drift while moving the scope keys into the model | Phase B1 proves views == v2 keys before any key is removed; oracle tests unchanged. |
| Foreign files with structures AgentCase cannot map (nested pools, event sub-processes) | Pass-through + mapping dialog; never silent loss; report lists every ignored element. |
| Vendor tools dropping `extensionElements` | Key flags also as attributes; BPSim as a second encoding; re-import fills missing parameters from the default process and flags them. |
| File size of a full regulatory process (~430 tasks) | Compact DI; in-scope-only export option; gzip in the HTML. |
| XML security | F-B10, unit tests with hostile files. |
| Scope creep toward a BPMN execution engine | Out of scope (§ 15). |

## 15. Audit layer: technical and operational data per activity

### 15.1 Objective

The migration adds a **capture layer** on top of the process model, for the **audit** an engagement starts with: for every activity
(and every actor), what the client really uses and how the work really runs. The layer is **observed data**, separate from the
**model parameters** of § 3: the model says what the business case assumes, the audit says what was found. The application shows
both side by side and the gap between them.

- **Technical audit** — per activity: the tools in use, chosen from a **catalogue of market tools proposed for that activity**, with
  their integration and AI-readiness facts.
- **Operational audit** — per activity: volumes, durations, effort, rework, hand-offs, quality and pain points, with the source of each
  value (interview, tool export, measurement) and its date.

### 15.2 Tool catalogue (the application proposes market tools per activity)

- **F-B23** — A **tool catalogue** ships with the application (`catalog/tools.json`, offline, no network call). Each tool has: id,
  name, vendor, category, licence model (commercial / open source / SaaS / on-premise), the **capabilities** it serves (Documentation,
  Analysis, Design, Coding, Review, Test, Security, Release, Compliance, Run / support, Knowledge, Planning), its **AI features**
  (assistant, code generation, test generation, review, agent / autonomous mode, none), its integration surface (REST API, webhooks,
  CLI, MCP server, export formats), hosting options and an "as of" date.
- **F-B24** — For each activity the audit screen **proposes the tools of the catalogue that serve its capability** (activity
  `capability` → tool `capabilities`), ordered by category, with a search box; the auditor ticks the tools in use, or adds a tool that
  is not in the catalogue (kept in the case, flagged "client-specific", and offered for every activity of the same capability).
- **F-B25** — Indicative content of the first catalogue (curated in phase B8, each entry dated and reviewed; the list is neutral and
  never a recommendation):

  | Capability | Examples of market tools |
  |---|---|
  | Planning / backlog | Jira, Azure Boards, GitHub Projects, GitLab Issues, Linear, Rally, Polarion |
  | Documentation / knowledge | Confluence, SharePoint, Notion, GitBook, Docusaurus, MkDocs |
  | Analysis / requirements | Jama Connect, IBM DOORS Next, Polarion ALM, Codebeamer, Jira with requirements add-ons |
  | Design / architecture | Enterprise Architect, Archi, LeanIX, draw.io, Lucidchart, Structurizr, Figma |
  | Coding (IDE and AI assistants) | VS Code, IntelliJ IDEA, Visual Studio, Eclipse; GitHub Copilot, Cursor, Claude Code, Amazon Q Developer, Tabnine, JetBrains AI, Gemini Code Assist |
  | Review / source control | GitHub, GitLab, Bitbucket, Azure Repos, Gerrit; AI review: CodeRabbit, Copilot code review |
  | Test | Selenium, Playwright, Cypress, JUnit, pytest, Tricentis Tosca, Xray, Zephyr, TestRail, Katalon, mabl |
  | Security | SonarQube, Snyk, Checkmarx, Veracode, Fortify, OWASP ZAP, Burp Suite, GitHub Advanced Security, Trivy |
  | Release / CI-CD | Jenkins, GitHub Actions, GitLab CI, Azure Pipelines, CircleCI, Argo CD, Spinnaker, Octopus Deploy, Harness |
  | Run / support / observability | ServiceNow, Jira Service Management, PagerDuty, Opsgenie, Datadog, Dynatrace, Splunk, Grafana, Elastic, New Relic |
  | Compliance / quality | Polarion, Codebeamer, Jama Connect, MasterControl, Veeva Vault, LDRA, VectorCAST, Parasoft |

- **F-B26** — The catalogue is editable in the application (add, edit, retire a tool, as undoable commands on the case) and
  exchangeable: exported and imported as JSON and as a sheet of the audit workbook (§ 15.5). A newer catalogue shipped with the
  application never overwrites the case's own entries; the audit screen shows "catalogue updated since this audit" when dates differ.

### 15.3 Data captured per activity

| Block | Fields (all optional, each with source and date) |
|---|---|
| **Tools (technical)** | tools in use (catalogue ids or client-specific); per tool: version / edition, licence count, hosting, integration used (API, webhook, CLI, MCP, manual export), AI features enabled (none / pilot / production), data residency constraint, owner team |
| **Technical readiness** | automation level today (none / scripted / pipeline / agentic), data availability for agents (structured / semi / none), API access to the tool (yes / partial / no), security or regulatory constraint on AI use (free text + norm reference), test coverage or quality signal where relevant |
| **Volume and frequency** | items per period (stories, test cases, releases, tickets…), frequency (per sprint / month / release), batch size |
| **Time** | effort per item (person-hours), cycle time, waiting time, share of FTE of each role on the activity |
| **Quality and rework** | rework rate, defect escape, first-pass yield, review rounds |
| **Flow** | hand-offs (to which roles / activities), approvals, blocking dependencies, tooling breaks (manual copy between tools) |
| **People** | roles and headcount involved (linked to the team skills), skill gaps, change appetite |
| **Pain points and opportunities** | free text, severity (1–5), candidate for AI (yes / no / later), auditor's note |
| **Evidence** | attachments by reference (document name, link, interview id), confidence (low / medium / high) |

Actors get the same blocks at their level (tools a role uses across activities, workload, constraints). The process as a whole gets
an **audit header**: audit id, client, scope, auditors, interview list (who, role, date), status (planned / in progress / closed),
"as of" date.

### 15.4 Data model and engine

- **F-B27** — Case key `AUDIT` (schema v3, optional, absent = no audit): header, catalogue entries of the case, and observations keyed
  by activity id and actor id. Observations never live inside the model parameters: the process model stays the business case; the
  audit is evidence about it.
- **F-B28** — `domain/audit` derives, per activity: **observed versus modelled** (effort per item × volume against the activity's
  modelled effort; observed rework against the rework flow's probability; observed automation level against the AI authority;
  observed FTE share against the team weights), coverage (share of in-scope activities audited, weighted by effort), and a
  **tooling map** (activities × capabilities × tools, gaps where no tool serves an in-scope activity, overlaps where several tools serve
  the same capability).
- **F-B29** — **Calibration is explicit**: audit values never change a figure on their own. A "Calibrate from audit" action proposes,
  activity by activity, new model parameters from the observed values (with the formula shown); the user accepts each one; the
  accepted set is one undoable step, recorded in the evidence ledger with its source. The existing evidence tiers (Defend group) count
  audited parameters as evidence.
- **F-B30** — Portfolio: the audit is per product (an override-free per-product key, like the knowledge subset); a portfolio view
  consolidates coverage, gaps and the tooling map across products and waves.

### 15.5 Capture, export and import

- **F-B31** — **Audit screen** (new section "🔎 Audit" in the Frame group): activity list (filter by phase, actor, capability,
  audited / not audited), a form per activity with the blocks of § 15.3, the proposed tools for its capability, and progress per phase.
  Keyboard-first, works without the diagram; the Process diagram colours activities by audit status (with a text legend).
- **F-B32** — **Audit workbook** (Excel), for interviews off-line: "Export audit template" writes one sheet per block, one row per
  in-scope activity, with drop-down lists from the catalogue and the enumerations; "Import audit workbook" reads it back with the same
  validate-before-write rule as the parameters workbook, merges by activity id and reports added / updated / ignored rows.
- **F-B33** — **BPMN**: the audit travels in the `.bpmn` export when the user ticks "include audit data": `ac:audit` extension elements
  on tasks and resources (`ac:tool`, `ac:observation name value unit source date confidence`), and the catalogue entries used as
  `ac:toolCatalog` under `definitions`. Without the option the file carries the process only (client data stays in the case).
  Import reads them back; foreign tools ignore them (pass-through).
- **F-B34** — **Outputs**: an audit report (PDF / print) per scope: header, coverage, tooling map, observed versus modelled table,
  top pain points, calibration log; the results workbook gains "Audit" and "Tooling" sheets.
- **F-B35** — **Confidentiality**: audit data may contain client names and interview notes. Exports with audit data are marked
  "Contains audit data" in the file name and in the file; the HTML snapshot asks whether to include it (default: no).

### 15.6 Decisions for the audit layer

| # | Question | Options | Recommendation |
|---|---|---|---|
| D-B11 | Do audit values change figures? | (a) never directly, explicit calibration; (b) audited values override parameters automatically | **(a)** (F-B29): the business case stays explainable. |
| D-B12 | Who maintains the tool catalogue? | (a) shipped and dated with each release, editable per case; (b) per case only | **(a)**, with "client-specific" entries kept in the case. |
| D-B13 | Granularity of operational data | (a) per activity; (b) per activity and per role | **(b)** optional: per activity by default, a role split when the interview gives it. |
| D-B14 | Audit data in BPMN exports by default? | (a) no, opt-in; (b) yes | **(a)** (F-B33, F-B35): client data leaves only on purpose. |

## 16. Out of scope

Executing processes (tokens, timers, messages), process mining, DMN decision tables, CMMN, choreography diagrams, collaborative
real-time editing, BPMN 1.x or XPDL import (a later converter may be considered).
