# AgentCase — Specification: the delivery process as a native BPMN 2.0 model (export and import)

> Status: **specified; phases B0, B1, B2, B3, B5 and B6b built** (B0: extension XSD, official OMG schemas, `tools/bpmn-validate.mjs`, sample and hostile files, § 5.3; B1: domain only, `app/src/domain/process`, § 6.3; B2: reader / writer, security, round trip, BPSim, export from the File menu, § 5.5; B3: schema v3, the case stores the BPMN document, § 6.4; B5: custom activities, roles, agents and rework from the model in the engine, § 7.1; B6b: organisation model, § 16.8). Decisions D-B1…D-B26 **adopted on 2026-10-30** (§ 12, § 15.6, § 16.7, § 17.9); D-B26: the case's BPMN
> document is the **only** stored form of the process, the organisation and the audit (§ 6.1). Scope: the TypeScript + React application in `app/`.
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

- **Organisation** — an organisation model in three layers (organisation, product, activity), each shared at its own level, says
  who does what: a RACI per activity (roles and agents), the teams that provide each role for each product, and the organisation
  units they belong to (§ 16).

- **Extended BPMN** — inputs and traceability, data stores bound to tools, deliverable states, volumes (multi-instance), cadence and
  service levels (timers), exceptions and rework (boundary events), conditional scope, a shared process library (call activities),
  automation types, hand-offs between units, DMN rules and a CMMN view of run (§ 17).

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
| Role (artefact `skill`, `skillMap` → team skill) | 26 roles → 7 team skills | `bpmn:resource` (role) + `humanPerformer` | Lanes = team skills; `skillMap` becomes the resource's `ac:teamSkill`. The full RACI and the organisation behind each role: § 16. |
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
  declaration (no XXE, no entity expansion), caps file size (5 MB), element count (100,000; raised from 20,000 in B2) and depth (64), accepts ids from a safe
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
The extended profile of § 17 adds: `dataInputAssociation`, `ioSpecification` (`dataInput`, `dataOutput`, `inputSet`, `outputSet`),
`dataStore`, `dataStoreReference`, `dataState`, `itemDefinition`, `import`, `multiInstanceLoopCharacteristics`, `loopMaximum` /
`testBefore`, `boundaryEvent`, `intermediateCatchEvent`, `intermediateThrowEvent`, `timerEventDefinition`, `errorEventDefinition`,
`escalationEventDefinition`, `messageEventDefinition`, `signalEventDefinition`, `compensateEventDefinition`, `error`, `escalation`,
`message`, `signal`, `messageFlow`, `eventSubProcess` (`subProcess triggeredByEvent="true"`), `callActivity`, `globalTask` /
`globalUserTask` / `globalManualTask`, global `process`, `inclusiveGateway`, default flows, `scriptTask`, `sendTask`, `receiveTask`,
`businessRuleTask`, `textAnnotation`, `association`, `lane.partitionElementRef`, `resourceAssignmentExpression`, `resourceParameter`,
`resourceParameterBinding`, `participantMultiplicity`, `conversation` / `conversationLink`, `extension` (namespace declaration), several
`BPMNDiagram` per file and the BPMN-in-Color DI attributes. Everything else is pass-through (F-B11).

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
  <bpmn:performer id="A017-R"><bpmn:resourceRef>agent-coding</bpmn:resourceRef></bpmn:performer>
  <bpmn:humanPerformer id="A017-S"><bpmn:resourceRef>role-dev</bpmn:resourceRef></bpmn:humanPerformer>
</bpmn:serviceTask>
<bpmn:resource id="role-dev" name="Dev">
  <bpmn:extensionElements><ac:actor kind="role" teamSkill="Dev"/></bpmn:extensionElements>
</bpmn:resource>
```

Flows: `<ac:rework probability="0.10" costShare="0.40" internalIterations="3"/>` on the back flow of a loop pair. Process:
`<ac:process caseSchema="3" catalogueVersion="…" partial="false"/>`. Norms: `<ac:norm industry="AERO" body="SAE"/>` on the
`categoryValue`.

Two rules of the OMG schema that the profile follows (found while writing the XSD in phase B0):

- `resourceRef` of a `performer` / `humanPerformer` / `resourceRole` is a child **element** (`xsd:QName`), not an attribute: the
  attribute form fails XSD validation (unqualified unknown attributes are not allowed by `anyAttribute namespace="##other"`).
- `bpmn:definitions` has **no** `extensionElements`. The document-level `ac:` elements (`ac:auditHeader`, `ac:toolCatalog`,
  `ac:orgUnit`, `ac:team`) are written in the `extensionElements` of the `bpmn:collaboration` (every AgentCase export has one: one
  pool per process); `ac:process` and `ac:product` in each `bpmn:process`. Only attributes (`ac:partial`) go on `definitions`.
  (Declaring `ac:` root elements in the `rootElement` substitution group would validate, but foreign tools would drop or reject them.)
- The phase sub-process carries `<ac:phase code="V3" seq="4" role="…"/>` (code, order and role of `phases.json`), so a phase keeps its
  code when a tool renames the sub-process or rewrites its id.

### 5.3 Validation

- The extension XSD ships in `docs/bpmn/agentcase-bpmn-1.0.xsd`. CI validates every exported fixture against the OMG XSDs plus it
  (decision D-B7), and opens a sample in bpmn-js headless (moddle) as a second check of tool compatibility.
- *Built in B0.* The official OMG schemas of BPMN 2.0.2 + DI are checked in, unchanged, under `docs/bpmn/omg/` (source URLs and
  SHA-256 in `SOURCES.md`, re-checked by a test); `docs/bpmn/agentcase-bpmn-validate.xsd` imports them with the extension XSD.
  `node tools/bpmn-validate.mjs [--json] [--strict] [--no-schema] file…` runs, per file: the F-B10 security checks on the raw text
  (a refused file never reaches a parser), `xmllint --nonet --schema`, then the profile checks. BPMN reads extension content with
  `processContents="lax"`, which validates a **declared** `ac:` name strictly but silently skips an undeclared one, and libxml2 does not
  enforce `xsd:IDREF`: the tool refuses any `ac:` element or attribute the XSD does not declare, and resolves the IDREF attributes of
  the extension (`ac:agent`, `ac:raci`, `supervisedBy`, units and teams) and of sequence and default flows. Samples and hostile files:
  `app/fixtures/bpmn/` (README there); tests: `app/tests/bpmn/`. CI installs `libxml2-utils` when missing; the schema tests skip
  locally without `xmllint` and fail in CI.
- The importer validates semantically (references resolve, one start per process, no orphan flows, ids unique, parameters in
  range) and reports each problem with the element id.

### 5.4 Optional standard: BPSim

Effort and rework probabilities can also be written as BPSim 2.0 parameters (`bpsim:BPSimData`: processing time, probability on
sequence flows, resource quantity) so that simulation tools read them (decision D-B5). AgentCase stays the owner of the values;
BPSim is a second, derived encoding on export and an accepted input on import when `ac:` values are absent.

### 5.5 Built in B2 (reader, writer, round trip, BPSim, export)

- **Reader** `app/src/store/persistence/bpmn/read.ts` (`parseXml`, `parseBpmn`): F-B10 checks on the raw text first, by
  `app/src/domain/process/security.ts`, whose rule table `securityRules.json` (limits, id pattern, reserved ids, markup pattern, codes) is the one
  `tools/bpmn-validate.mjs` now reads: same codes and messages, file for file (`tests/bpmn/reader-security.test.ts` compares them on every hostile
  and sample file; a refused file never reaches `DOMParser`). Then `DOMParser` (jsdom in the tests) and an immediate conversion to the B1 node tree;
  the domain stays DOM-free. Two codes of its own: `not-xml` (not well-formed) and `not-bpmn` (root not `bpmn:definitions`, as the validator).
  `controllers/bpmn.ts parseBpmnFile(file)` returns `{ doc, errors, warnings }` and writes nothing (import commands: B4).
- **Writer**: B1's `serialize` (not `XMLSerializer`, which would not keep the written prefixes / attribute order byte for byte). Round trip:
  export → parse → write is byte-identical on the 107 fixtures and on every product and the collaboration file of the three portfolio fixtures,
  and `viewsOf(parse(export))` equals the version 2 keys (`tests/bpmn/roundtrip-fixtures-*.test.ts`, `export-portfolio.test.ts`). Foreign samples:
  parse → write keeps every element, attribute, namespace, comment and vendor extension (`xmllint --c14n` of input and output identical; second pass
  byte-identical; the Signavio sample, already canonical, byte-identical on the first pass) (`foreign-roundtrip.test.ts`).
- **Export** (F-B1–F-B5): `exportDocument(case, { partial, bpsim, product })`, `collaborationDocument(products)`; File menu "Export process (BPMN)…"
  (the Process section entry comes with B4). In-scope only (F-B3) removes out-of-scope activities (marked out, or in a phase switched off), their
  deliverables, the flows touching them and their DI; it writes `ac:partial="true"` on the definitions and `partial="true"` on `ac:process`. A portfolio
  exports the product shown, one file per product (each with `ac:product code name`), or one collaboration file: one pool per product, every id
  prefixed with the product code (`P1_A017`), the pools stacked in one diagram. File name `AgentCase_process_<customer>_<product>_<date>.bpmn`.
  Every export validates (OMG XSDs + `ac:` + BPSim XSD + profile, `tests/bpmn/export-validate.test.ts`).
- **BPSim 2.0** (verified against the official schema, downloaded to `docs/bpmn/omg/BPSim-2.0.xsd`, SHA-256 in `SOURCES.md`, imported by
  `agentcase-bpmn-validate.xsd` so it is validated strictly): namespace `http://www.bpsim.org/schemas/2.0`, one `bpmn:relationship type="BPSimData"`
  (source and target: the processes) holding `bpsim:BPSimData` / `Scenario id="bpsim-agentcase"` with `ScenarioParameters baseTimeUnit="day"` and
  one `ElementParameters elementRef` per activity (`TimeParameters/ProcessingTime` = effort), per rework flow (`ControlParameters/Probability`) and
  per role whose team skill has FTE (`ResourceParameters/Quantity`). Constants only (`NumericParameter` for whole numbers, else `FloatingParameter`).
  AgentCase's effort is relative: it is written in the scenario's base unit (day) and documented in the scenario description. The typed reader takes
  BPSim processing time / probability only where `ac:activity effort` / `ac:rework probability` is absent, a BPSim probability on a flow without
  `ac:rework` as `FlowView.probability`, and a resource quantity as `ActorView.quantity`. A re-export replaces the AgentCase scenario; other BPSim
  data is pass-through.
- **Measured** (headless Chromium, built bundle, median of 7): a 2,000-activity AgentCase file (2.1 MB): parse + map (security, DOMParser,
  conversion, views) 195–275 ms (target < 300 ms); write 30–60 ms; export of a 2,000-activity document (BPSim + serialise) 60–65 ms, of the default
  case 24–37 ms (target < 150 ms). Default-case export 552 KB (424 KB of process + BPSim scenario).
- **Element limit raised to 100,000 (decision of 2026-10-30)**: an AgentCase file of 2,000 activities has about 25,300 elements and a
  collaboration file of four full products about 26,400, over the original limit of 20,000. The limit is now 100,000 in `securityRules.json`
  (reader and validator alike); the 5 MB cap, depth 64 and the DOCTYPE / entity / processing-instruction refusal are unchanged. Both round
  trips pass with the default limits; a generated file of 100,001 elements (under 5 MB) is refused before the parser.

## 6. Data model

### 6.1 Case document

- **Native XML, no duplicate (D-B1, D-B26).** The case stores **one BPMN 2.0 document** (key `BPMN`): the process, the organisation
  (§ 16: resources, participants, lanes, `ac:orgUnit` / `ac:team` elements, product assignments) and the audit (§ 15: `ac:audit`
  elements, the case's tool catalogue entries). No other key repeats any of it. In a saved file and in the HTML snapshot it is XML text;
  in the store it is the same document as a node tree (the XML infoset: elements, attributes, text, in order), which serialises back to
  the identical bytes. Commands edit that tree, so undo patches touch only the nodes that changed (an attribute, an element), never the
  whole document.
- **Typed views are computed, never stored.** `domain/process/read.ts` reads the tree into typed, memoised views (phases, activities,
  actors, flows, organisation, audit) keyed on the tree's identity; they are recomputed after an edit and discarded with the session.
- `_schemaVersion` 3. Migration 2 → 3 writes the `BPMN` document from the default process plus the case keys of § 3 (and `teamIn`,
  shared team lines for § 16), then removes the keys that become derived (§ 6.2). A version 2 file opens with identical figures (§ 11).
- Size: the default process is about 430 activities, about 600 KB of XML before compression; the case file stores it as text (gzip
  in the HTML snapshot); a portfolio stores the common process once and a product's document only when the product overrides it.

### 6.2 Derived views (no second source)

`domain/process/views.ts` derives, from the `BPMN` document, exactly what the engine reads today: the artefact lists with their edited
values, the selected ids, the active phases and their order, the regulatory selection, the loop pairs, the role → team-skill map.
The engine code is unchanged in the first phases; it reads the views. Legacy readers (Excel parameters sheets, old snapshot fields
in the HTML snapshot) are written from the views. A test asserts on every fixture that the views equal the version 2 keys.

### 6.3 Default process

`catalog/defaultProcess.bpmn` is generated once from today's catalogues by a script (`scripts/gen-default-process.ts`), checked
in, and read at build time. A test regenerates it and fails on any difference (like `deps:gen` / `theme:gen`). The catalogues stay
the editorial source of the default process until decision D-B9 retires them.

**Built in B1** (domain only, no store / UI / schema change; details in ARCHITECTURE.md § 14):

- `domain/process/xml.ts` is the node tree (D-B1); `npm run process:gen` / `process:check` (in `npm run check`) write and check
  `app/src/domain/catalog/defaultProcess.bpmn`: the catalogue process carrying the default case's scope (a new case starts from it).
  **414 KB raw, 35 KB gzipped** (6,977 lines; 423 activities, 47 norms, 39 resources, 453 diagram shapes); valid for
  `tools/bpmn-validate.mjs` (OMG XSDs + `agentcase-bpmn-1.0.xsd` + profile, 0 error, 0 warning; `tests/domain/process/validate.test.ts`);
  not imported by the application yet.
- It follows the B0 profile: `ac:phase code seq role crossCutting` on each phase sub-process, `ac:activity type phase …` and
  `ac:supervision` on each task, `resourceRef` / `categoryValueRef` / `targetRef` as child elements, agent tasks as
  `serviceTask implementation="https://agentcase.app/schema/bpmn/1.0#agent"` with `ac:agent`, `ac:norm industry …`, `ac:actor`,
  `ac:rework`, `ac:process` in the process. No organisation or audit yet, so the collaboration has no `extensionElements`.
  Other choices: `ac:activity order` keeps the engine's catalogue order; reworks of two activities of one phase are flows inside that
  sub-process; lanes carry no `flowNodeRef` (phases span every lane).
- **XSD additions in B1** (optional local attributes only, no new global name, per the 1.x rule): `tKey` accepts parentheses (team skill
  "Software Quality Assurance (SQA)"); `ac:phase order sdlc reg featureIds`, `ac:activity order`, `ac:supervision agent0`,
  `ac:norm count`, `ac:actor regulatory capability`, `ac:rework order note activityA activityB external` carry catalogue fields the
  views give back; and the case marks below.
- Case marks written by `processFromCase` (B1 parity; B3 decides which survive the migration): `ac:inScope` on tasks, phases and norms;
  list positions (`scopeRank` on `ac:activity` / `ac:norm`, `offRank` / `rampRank` on `ac:phase`, `editRank` on `ac:activity`) only when
  a list is not in document order; `ac:phase rampSeq` (legacy `phaseSeq`, empty = null); `ac:activity edited` lists the fields of a legacy
  edit record (or `sdlcEdits` / `regEdits="all"` on `ac:process` for the full list every saved case holds); `ac:process regInclude`;
  `<ac:unmatched list rank value>` children of `ac:process` keep list entries no element can carry (unknown ids, repeats, `selectedNorms`
  written without their industry); `ac:process rampSeq` / `skillMap="none"` record an absent key.

### 6.4 Built in B3 (schema v3: the case stores the native document)

- **Key list (final).** Schema v3 (`_schemaVersion: 3`) adds the case key **`BPMN`** and removes the nine version 2 keys it owns:
  `selectedArtefacts`, `artefactsEdited`, `selectedRegArtefacts`, `regArtefactsEdited`, `phaseOff`, `selectedNorms`, `phaseSeq`, `regInclude`, `skillMap`
  (`SCOPE_KEYS`, `domain/process/scope.ts`). No other case key is owned by the process today: `regUse` (the catalogue switch), the form mirror
  `dom.checked.regInclude`, the factory tags `fmArtefactTags` / `fmRegArtefactTags` / `fmPhaseFeatures` and the unused legacy `REG_OVERRIDES`,
  `REG_HUMAN_SUP`, `REG_EFFORT` stay case keys (open question for B5: the factory tags duplicate `ac:activity storyId` / `ac:phase featureIds`).
- **Store and files.** In the store `BPMN` is the B1 node tree (plain objects and arrays, immutable, shared between versions); in every file it is XML
  text: JSON save, HTML snapshot, autosave record, a whole document posted to another tab, the stored cases of the snapshot library
  (`store/persistence/bpmn/caseFile.ts`: `caseInFile` / `portfolioInFile` on write; `caseInStore` / `portfolioInStore` on read, through the B2 reader and
  its F-B10 checks). The tree a reader builds from the text is the very tree that was written (same nodes, same key order), so the undo history of an
  autosave record still addresses it. A text that cannot be read is a correction note ("the default process used"), like any damaged value.
- **Migration 2 → 3** (`store/persistence/schema/v3.ts`): the document of the file's keys (a missing key takes the default case's value, as the
  version 2 reader filled it) on the catalogue process, in the normal form below, and the keys removed. A portfolio: the common document from the common
  keys; a product that overrode any of the nine keys overrides the whole `BPMN` (F-B20), written from its effective keys. The snapshot library is
  converted too. `fromSnapshot` / `readPortfolio` accept a version 2 object directly (tools, snapshot activation of an old capture).
- **B1's open questions, decided** (the normal form, `normalKeys` / `withScope`): (1) **list order** — the selections, the phases switched off and the
  ramp-up sequences are kept in document order (`scopeRank`, `offRank`, `rampRank` are no longer written): every reader treats them as sets or maps
  (engine `Set`s, report sorted, Excel by catalogue row), so no figure depends on it; the Excel comparisons (`tests/helpers/excelParams.ts`,
  `tools/excel-compat.mjs`) compare these four lists as sets. (2) **edit records** — always the complete list (`ac:process sdlcEdits="all"` /
  `regEdits="all"`, no `edited` / `editRank`), the shape all 107 fixtures already hold; a partial or damaged record means what `applyEdits` made of it (the
  catalogue value), so the applied values are identical. Kept for parity: `ac:inScope`, `ac:phase rampSeq` (with its null), `ac:process regInclude`, the
  `ac:unmatched` entries (unknown ids and repeats: a count on screen includes them, as before), `rampSeq="none"` / `skillMap="none"` for an absent key.
- **One accessor.** `scopeOf(case)` (= `viewsOf(case.BPMN).keys`, memoised on the tree) gives the version 2 keys, same shapes and values; every reader
  goes through it (engine `workingArtefacts`, `regActive`, scope views, phase tiles, ramp-up phases, factory grid, PDC variables and DD fingerprint,
  assumptions, skill map, portfolio aggregates, report, Excel). An object without a document (a version 2 case handed to the engine by a test or a tool)
  is read by its own keys. The engine is unchanged.
- **Commands (§ 9).** Every legacy scope command edits the tree: selection, phases, norms, industry, cross-cutting, regulatory inclusion, ramp-up
  sequences and the skill map run their version 2 rule on a copy of the keys and write it back with `withScope` (`store/processEdit.ts#editScope`);
  the artefact editors (% auto, effort, phase bulk, resets) write `ac:activity` / `ac:supervision` attributes directly (`updateActivities`). The store
  receives the difference of the two trees (`syncDraft`), so an edit of one activity's effort is one patch of one attribute value (tested:
  `tests/store/bpmn-b3-commands.test.ts`). New commands `process.setScope`, `updateActivity` (coalesced), `addActivity`, `removeActivity`, `addActor`,
  `updateActor`, `removeActor` (refused while referenced), `addPhase`, `removePhase` (refused while it holds activities), `reorderPhases`
  (`controllers/process.ts`, `domain/process/editActivity.ts`, `editModel.ts`): implemented and tested on the tree; no screen calls them before B4, and the
  engine reads only catalogue activities before B5 (a custom activity counts in the scope lists, not in the figures yet). Not yet: `process.import`,
  `reset`, `moveActivity`, `setReworkFlow`, `setDiagram` (B4).
- **Portfolio.** `BPMN` replaces the nine keys in `OVERRIDABLE_KEYS` (whole-document override). The Overrides sheet of the parameters workbook writes a
  `BPMN` override as the nine version 2 rows derived from it (older builds read them) and reads such rows back into a whole-document override on top of
  the imported common document; the legacy sheets are written from the views and a legacy workbook edits the tree.
- **Tabs.** A message from a tab of another file schema (older or newer) is ignored; whole documents travel with their process as text; patches address
  tree nodes.
- **Sizes (measured).** No new payload in the bundle: the default document is built at start from the catalogues already shipped (the B1 generator
  code, already bundled by the B2 export), memoised, and equals `catalog/defaultProcess.bpmn` (regenerated in the normal form, 414 KB / 35 KB gzipped),
  so the gzipped-base64 option was not needed. A saved case grows from 96 KB to 522 KB (golden: the XML text, JSON-escaped; 16 KB → 51 KB gzipped); the
  shipped portfolio example (`docs/examples`, one product overriding its process) from 102 KB to 980 KB. The HTML snapshot embeds the text as is
  (no gzip yet: an embedded case is read before the first paint, synchronously). An edit of one activity's effort is one undo patch of about 150 bytes.

## 7. Engine

- **Phase 1 (parity)** — the engine reads the derived views: every figure identical on the 107 fixtures, the parallel run (40 files)
  and excel-compat (67 files).
- **Phase 2 (native)** — custom activities and actors count: a custom activity enters the same per-activity computations as a
  catalogue artefact (effort, weight, value class, AI authority, supervision split, role → team skill → rates, phase weights,
  lifecycle weights). Rework flows read their probability and cost share from the model instead of `loopPairs.json`.
- **One owner** — `domain/process` owns activity lookup, scope, ordering and parameters; no screen or export recomputes them.

### 7.1 Built in B5 (the engine reads the model)

- **Activities (F-B18, § 7 phase 2).** `workingArtefacts` reads the activities of the case's document (`caseViews(case).sdlc` / `.reg`,
  `domain/process/engineInputs.ts`) instead of the edited JSON catalogues: a custom activity (`process.addActivity`) enters every per-activity figure
  with its own phase, type, role, effort, value class, AI authority and supervision split; its weight is effort × the lifecycle weight of its phase (a
  custom phase weighs 1.0, like any phase the status table does not name). Out of scope it counts in the total effort only, like a catalogue artefact.
  On the 107 fixtures the activity lists are the edited catalogues, field for field (`tests/domain/process/parity.test.ts`), so no figure moves.
  `addActivity` now also writes the deliverable's data object (the task's output association referenced a missing one).
- **Roles and agents.** The role → team-skill map (`skillMapOf` → `caseSkillMap`) is the case's own map (derived from every role resource, custom ones
  included) or, without one, the default map plus each custom role's `ac:actor teamSkill`. The agent directory (`agentsOf`: Agent Directory section,
  `agentCatalogCount`, CC-AG-01 / 02, the Agent Catalog sheet) is the shipped catalogue plus each custom `ac:actor kind="agent"` resource: skill = its
  capability, authority = that of its first activity, artefacts = the activities it performs. The factory tags (`tagMap`) take the capability and the
  activity type from the activity (the story link stays the factory's `fmArtefactTags`).
- **Rework (D-B20, F-B47).** The rework loops (`caseLoopPairs`: external rework effort, loop calibration, agentic loop table, CC-AG checks, Loop Pairs
  sheet) are read from the model: the back flows with `ac:rework`, unless an error boundary event carrying `ac:rework` replaces them. A boundary event
  names the loop it replaces (`ac:rework pair`, in place) or is a loop of its own (after the back flows); its loop runs from the phase of what it is
  attached to (an activity, or a phase sub-process) back to the phase of the target of its outgoing flow (`domain/process/readRework.ts`). Removing an
  activity removes the rework flows that name it.
- **Portfolio (F-B20, B3 question 3).** The Overrides sheet writes a product's process override as the nine version 2 rows (older builds) and then as
  the document itself (key `BPMN`, its XML text as a JSON string, up to 1,500 parts of 4,000 characters); the import reads the document back through
  the BPMN reader (a damaged one refuses the workbook) and lays the scope rows over it, so custom content survives the round trip byte for byte.
- **Outputs (F-B22).** `processSummary` (`domain/verifyA/processSummary.ts`) is the one owner of what the outputs print of the process: per activity the
  engine's own selection, weight, role, team skill and agent; the actors; the rework loops with their added weight. When the process holds custom
  content (activities, actors or rework boundary events the catalogue does not), the results workbook adds a **Process** sheet and the critical report
  a section **7 · Delivery process**; a catalogue case keeps the legacy outputs exactly. The HTML snapshot embeds the document (B3).
- **Tests.** Hand-computed reference figures per parameter (`tests/domain/process/engine-custom.test.ts`), the export of such a process validated
  (`engine-custom-valid.test.ts`), the cross-surface equalities run on five process cases (`tests/domain/sot-cross-surface-process.test.ts`, the
  equalities shared with the 107-fixture guard in `tests/helpers/sotChecks.ts`), the portfolio round trip (`tests/store/excel-portfolio-process.test.ts`).
- **Not done in B5.** (1) **D-B9** — the JSON catalogues still generate the catalogue process. Retiring them needs a DOM-free reader of
  `catalog/defaultProcess.bpmn` in the domain (or a build step that ships its node tree), because the engine, the Node tools (excel-compat, parallel-run,
  oracle) and the generator check read the catalogues without a DOM; and the modules that read `SDLC_ARTEFACTS` / `REG_ARTEFACTS` / `PHASES` /
  `LOOP_PAIRS` as reference lists (reset to the catalogue, pins validation, the factory pickers, the Excel legacy sheets, per-phase tables) must read the
  default process views instead. The figures do not depend on it any more (they read the case's document). (2) The factory story / feature links
  (`fmArtefactTags.storyId`, `fmPhaseFeatures`) stay case keys: they are workspace data shared by every product, while the process document is
  overridable per product, so moving them into the document changes what a product override means (to decide). (3) `dom.checked.regInclude` stays: the
  oracle fixture `frame-industry-cross` holds the box ticked with `regInclude` false, so deriving it changes the `tgRegInclude` variable and the
  excel-compat state comparison (a deviation to decide). (4) Pins of a custom activity are not accepted yet (`normalisedPins` checks the catalogue ids),
  and the per-phase tables that list the catalogue phases (`phaseArtRows`, agent usage) do not show a custom phase.

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

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B1 | How is the process stored in the case? | (a) BPMN XML, native; (b) typed JSON semantic model + XML only at import / export | **(a) native XML, no duplicate data** (owner's decision): XML text in files, its node tree in the store, typed views computed only (§ 6.1). |
| D-B26 | Do the organisation and the audit live in the same document? | (a) yes, one BPMN document; (b) separate keys | **(a)**: one document, no duplicate; the export filters the audit (D-B14). |
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

| Phase | Content | Gate | Duration | Difficulty | Needs | Main difficulty |
|---|---|---|---|---|---|---|
| B0 (**built in B0**) | This specification; extension XSD; sample foreign files | Decisions adopted | 0.5 d | 2 / 5 | — | Writing a correct extension XSD; collecting real files from bpmn.io, Camunda, Signavio |
| B1 (**built in B1**) | `domain/process`: types, default process generator, derived views, layout | Views == v2 keys on 107 fixtures | 1 d | 3 / 5 | B0 | Exact parity of the derived views with today's keys |
| B2 (**built in B2**) | BPMN reader / writer (DOMParser / XMLSerializer, no new dependency), node tree, security limits, pass-through, BPSim | Round trip byte-identical; XSD-valid; security tests | 1.5 d | 4 / 5 | B1 | Byte-identical round trip with foreign namespaces and vendor extensions |
| B3 (**built in B3**) | Schema v3 + migration, `BPMN` key (native XML, node tree in the store), commands, existing scope sections on the model | 107 fixtures identical; parallel run 40/40; excel-compat 67/67 | 2 d | 5 / 5 | B2 | Touches store, undo, tab sync, autosave, Excel and every scope screen at once; node-level undo patches |
| B4 | Process section: SVG diagram, activity table, actor panel, import (replace / merge, preview, report), export | axe clean; ui-parity 0 divergence | 1.5 d | 3 / 5 | B3 | Accessible diagram with a table alternative; the merge preview |
| B5 (**built in B5**) | Custom activities / roles / agents in the engine; rework flows from the model; portfolio override; Excel / report / HTML outputs | Hand-computed reference tests; cross-surface equality | 2 d | 4 / 5 | B3 | New engine inputs without breaking the single-owner rule; deviations to record |
| B5b | Extended profile (§ 17): traceability graph, data stores bound to tools, data states and types, multi-instance volumes, timers and cadence, bounded loops, boundary events and reusable definitions, event sub-processes, compensation, conditional scope (FEEL subset), shared process library, task types, formal assignment and lanes, message flows and multiplicity, conversation view, annotations, several diagrams, colours, file header | Default process unchanged in figures; each element has a reader / writer / round-trip test and a test of the figure, check or view it feeds | 3 d | 4 / 5 | B5 | Breadth (about 25 elements); a safe FEEL parser; the process library across products |
| B6 | Optional lazy BPMN editor (D-B6 b) | Size budget; editor round trip | 1.5 d | 4 / 5 | B4 | Size budget, CSP, writing the editor's changes back to the node tree; bpmn-js licence requires its watermark to stay visible |
| B6b (**built in B6b**, teams at the derived-view stage) | Organisation model (§ 16): organisation elements in the `BPMN` document, migration of `teamIn` / shared team lines to teams (parity), RACI on activities, `domain/org`, Organisation and Who-does-what sections, resource roles and organisation view | 107 fixtures identical before the RACI-driven figures; diagnostics tests; axe clean | 2 d | 4 / 5 | B3 | Moving the entry team and shared lines into the organisation with identical figures |
| B7 | Audit layer (§ 15): tool catalogue, `ac:audit` elements and `domain/audit`, Audit section, audit workbook, audit report, explicit calibration | Round trip with audit data; calibration log; axe clean | 2 d | 3 / 5 | B4, B6b | Curating a neutral, dated tool catalogue (needs the owner's review) |
| B7b | DMN decisions (F-B62) and the optional CMMN export of the run phase (F-B63) | DMN round trip; evaluator tests per hit policy | 1.5 d | 3 / 5 | B5b | DMN hit policies and the shared FEEL subset |
| B8 | Release: guide, DEVIATIONS (if any), CHANGELOG, version bump | All gates green | 0.5 d | 1 / 5 | all | — |

Durations are **elapsed working days with the agent workflow** used so far (parallel agents in worktrees, full local gates, a PR per
phase merged on green CI, the owner's review of each delivery), with an uncertainty of about ±50 %. Difficulty: 1 = routine,
5 = touches the core of the application (store, undo, persistence) with strict parity.

- **Total**: about 19 days of work. **Critical path** B0 → B1 → B2 → B3 → B5 → B5b → B7b → B8: about 12 days, because B4, B6, B6b and B7
  run in parallel once B3 is merged (B7 also waits for B6b).
- **Order of magnitude for a single senior developer without agents**: three to four months for the same scope and gates.
- **Hardest phase: B3** (5 / 5). It switches the case to the native XML document; every surface that reads the scope moves at once.
  It is delivered only after B1 and B2 prove parity and the byte-identical round trip on their own.
- **Owner's time** per phase: a review of the delivered HTML and the decisions that come up (about 30 minutes; the tool catalogue of
  B7 needs about 2 hours of review).

## 14. Risks

| Risk | Mitigation |
|---|---|
| Parity drift while moving the scope keys into the model | Phase B1 proves views == v2 keys before any key is removed; oracle tests unchanged. |
| Foreign files with structures AgentCase cannot map (nested pools, event sub-processes) | Pass-through + mapping dialog; never silent loss; report lists every ignored element. |
| Vendor tools dropping `extensionElements` | Key flags also as attributes; BPSim as a second encoding; re-import fills missing parameters from the default process and flags them. |
| File size of a full regulatory process (~430 tasks) | Compact DI; in-scope-only export option; gzip in the HTML. |
| XML security | F-B10, unit tests with hostile files. |
| Native XML in the store: undo memory and edit speed | Node-tree storage with node-level patches; typed views memoised on tree identity; perf budget per edit (§ 10). |
| Scope creep toward a BPMN execution engine | Out of scope (§ 18): events, timers and conditions are parameters and rules, never executed. |
| Profile breadth (§ 17) slows delivery | Each element is optional in files and lands in phase B5b behind its own tests; the default process stays parity-identical. |
| Expression evaluation (conditions, DMN) as an attack surface | Own FEEL-subset parser, no `eval`, size and depth limits, unit tests with hostile expressions. |

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

- **F-B27** — The audit lives in the case's `BPMN` document (D-B26): an `ac:auditHeader` at document level (in the collaboration's
  `extensionElements`, § 5.2), the case's catalogue entries
  (`ac:toolCatalog`), and `ac:audit` observations on the tasks and resources they describe (absent = no audit). Observations never
  replace model parameters: the process stays the business case; the audit is evidence about it.
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
  `ac:toolCatalog` at document level (§ 5.2). Without the option the file carries the process only (client data stays in the case).
  Import reads them back; foreign tools ignore them (pass-through).
- **F-B34** — **Outputs**: an audit report (PDF / print) per scope: header, coverage, tooling map, observed versus modelled table,
  top pain points, calibration log; the results workbook gains "Audit" and "Tooling" sheets.
- **F-B35** — **Confidentiality**: audit data may contain client names and interview notes. Exports with audit data are marked
  "Contains audit data" in the file name and in the file; the HTML snapshot asks whether to include it (default: no).

### 15.6 Decisions for the audit layer

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B11 | Do audit values change figures? | (a) never directly, explicit calibration; (b) audited values override parameters automatically | **(a)** (F-B29): the business case stays explainable. |
| D-B12 | Who maintains the tool catalogue? | (a) shipped and dated with each release, editable per case; (b) per case only | **(a)**, with "client-specific" entries kept in the case. |
| D-B13 | Granularity of operational data | (a) per activity; (b) per activity and per role | **(b)** optional: per activity by default, a role split when the interview gives it. |
| D-B14 | Audit data in BPMN exports by default? | (a) no, opt-in; (b) yes | **(a)** (F-B33, F-B35): client data leaves only on purpose. |

## 16. Organisation model: organisation × product × activity, and who does what

### 16.1 Objective and today's gap

Today "who does what" is a single fact per activity: the artefact's `skill` (26 role names) mapped by `skillMap` to one of 7 team
skills, which selects the rate and the team lines of the product (`teamIn`, shared team lines). There is no accountable role, no
consulted or informed role, no organisation that supplies the teams, and no way to say that a role is filled by a vendor, a
near-shore centre or an AI agent for one product and by an internal team for another.

Target: an **organisation model in three layers**, each shared at its own level, linked by explicit assignments, exported in BPMN:

| Layer | Holds | Shared at | Today |
|---|---|---|---|
| **Organisation** | organisation units (company, business unit, department, centre of excellence, vendor / partner, offshore or near-shore centre), teams, the role catalogue | the portfolio (common to every product) | nothing (implicit) |
| **Product** | products (portfolio), optional components / value streams, the teams serving each product with their allocation, the product's owner unit | per product | products, `teamIn`, shared team lines |
| **Activity** | the process (BPMN), the RACI of each activity: which **roles** are Responsible, Accountable, Consulted, Informed, and which **agent** performs | the process (common by default, overridable per product) | the artefact `skill` only |

### 16.2 Who does what: the assignment chain

For an activity of a product, the application resolves:

`activity --(RACI)--> role --(team serving the product that provides the role)--> team --(belongs to)--> organisation unit`

and, for an agent-performed activity, `activity --(performer)--> agent --(supervised by the Accountable / Responsible role)--> role`.

- **F-B36** — Every in-scope activity has **at most one Accountable** role and **at least one Responsible** (a role or an agent);
  Consulted and Informed are optional lists. A human Accountable for an agent-performed activity is **optional** (D-B18): when it is missing, the activity is listed as
  information ("no human Accountable"), not as an error. Missing Responsible roles are diagnostics, listed per activity, never silent.
- **F-B37** — For each product, every Responsible role of an in-scope activity must be **provided by at least one team serving that
  product**; otherwise the activity is flagged "role not staffed for this product". When several teams provide the role, the split
  follows the teams' allocation to the product (or an explicit share per activity).
- **F-B38** — Answers the user can get in one screen each:
  - **by activity**: R / A / C / I roles, the agent, and per product the teams and units that do it;
  - **by role**: the activities it is R / A / C / I for, the products and teams that provide it, its load (effort of its R activities);
  - **by team**: the products it serves (allocation), the roles it provides, the activities it performs, its load against its FTE;
  - **by organisation unit**: its teams, the products they serve, the activities performed, cost by location / grade;
  - **by product**: its organisation chart (units → teams → roles) and its RACI matrix.

### 16.3 Data model

- **Organisation (portfolio level, common)** — in the `BPMN` document (D-B26), as `bpmn:resource`s, participants and `ac:orgUnit` /
  `ac:team` elements: `units[]` (id, name, type, parent id, location, cost centre, internal /
  vendor), `teams[]` (id, name, unit id, members: lines of role, grade, location, FTE, pins — the same line shape as `teamIn`),
  `roles[]` (id, name, team skill, description, kind human / agent, sourcing internal / vendor / either). The 26 legacy role names
  and the 7 team skills become the default role catalogue.
- **Product** — `teams` served: list of `{ teamId, allocationPct }` (≤ 100 % per team across products, the rule of lot 7 shared
  team lines), optional `components[]`, `ownerUnitId`.
- **Activity** — `raci: { R: actorId[], A: roleId, C: roleId[], I: roleId[] }`, agent performer as today (`ac:agent`). The legacy
  `skill` becomes the default R (and A when no Accountable is known: flagged "accountable to confirm").
- **Migration (parity)** — each product's `teamIn` becomes a team "‹product› delivery team" in a default unit "‹customer› delivery",
  served at 100 % by that product; each lot 7 shared team line becomes a shared team served by its products with their shares; the
  effective team of a product (`effectiveTeam`) is then derived from the teams serving it, with identical lines, so every figure is
  unchanged on the 107 fixtures. `teamIn` and `sharedTeam` become derived views (one source: the `BPMN` document).
- **Overrides** — the organisation is common; a product may override the RACI of its process (whole process key, F-B20) and its team
  assignments (its own key).

### 16.4 BPMN mapping

| Concept | BPMN element |
|---|---|
| Role | `bpmn:resource` with `ac:actor kind="role" teamSkill=".." sourcing=".."` |
| Agent | `bpmn:resource` with `ac:actor kind="agent"` |
| Responsible | `bpmn:humanPerformer` (role) or `bpmn:performer` (agent) |
| Accountable, Consulted, Informed | `bpmn:resourceRole name="Accountable|Consulted|Informed" resourceRef=".."` (valid BPMN 2.0; tools show it as a resource role) plus `ac:raci` for tools that drop names |
| Organisation unit, team | `bpmn:participant` / pool per unit in a collaboration view, nested lanes `unit → team → role` (`childLaneSet`) in the organisation view; `ac:orgUnit`, `ac:team` on resources |
| Product | one `bpmn:process` (and pool) per product in a portfolio export (F-B5) |

- **F-B39** — Export offers two diagram views of the same semantic model: **by role** (lanes = team skills, the default of § 4.5) and
  **by organisation** (pools per unit, lanes per team, sub-lanes per role, for a chosen product). Import reads either and maps lanes to
  roles / teams / units through the mapping dialog of F-B8.

### 16.5 Engine

- Phase parity: figures read the derived team views (identical).
- Then the RACI feeds the figures that need it, with one owner in `domain/org`: the load of each role and team (effort of its R
  activities × its share), the supervision effort of the Accountable role for agent-performed activities (today a global coefficient),
  the cost by organisation unit / location / vendor, and the "unstaffed role" and over-allocation diagnostics. Each change of a figure
  versus the legacy file is a recorded deviation.

### 16.6 Interface

- New section **🏢 Organisation** (Frame group): unit tree, teams with their lines, role catalogue; keyboard-editable tree.
- New section **🧭 Who does what** (Scope group): the RACI matrix (activities × roles, R / A / C / I per cell, filters by phase, product,
  team, unit), and the five views of F-B38; diagnostics of F-B36 / F-B37 inline.
- Team In and the shared team table of the Products section become views of the Organisation (same commands underneath).
- The audit layer (§ 15) attaches observations to roles, teams and units too (workload, tools a team uses, constraints).

### 16.7 Decisions for the organisation model

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B15 | Responsibility model | (a) RACI; (b) RASCI (adds Support); (c) R only | **(a)** RACI, with Support available as a Consulted subtype later. |
| D-B16 | Granularity of people | (a) roles and FTE lines only; (b) named people | **(a)**: no personal data in the case; names stay out of scope. |
| D-B17 | Where does the organisation live in a single-product case? | (a) same model as a portfolio, one product; (b) a separate model | **(a)**: one model for single and multi product, in the `BPMN` document (D-B26). |
| D-B18 | Accountable for agent activities | (a) mandatory human Accountable; (b) optional | **(b) optional** (owner's decision): shown as information (F-B36). |
| D-B19 | Default organisation diagram | (a) by role; (b) by organisation | **(a)** by role, (b) on demand (F-B39). |

### 16.8 Built in B6b (organisation model, derived-view stage for the teams)

- **In the document** (D-B26, no new key, schema unchanged at 3): units as `ac:orgUnit` in the collaboration's `extensionElements`; per activity the
  RACI as standard `bpmn:resourceRole name="Responsible|Accountable|Consulted|Informed"` (after the existing performers, before any loop
  characteristics) plus `ac:raci`. Read back from either (a tool that drops `ac:raci` keeps the RACI). With neither, the default of § 16.3: the
  `humanPerformer` (legacy skill) is R and A "to confirm". The `humanPerformer` always stays R and is never rewritten, so **no figure moves**; the
  RACI-driven figures of § 16.5 are not built. The derived default unit "‹customer› delivery" is written into the document when first edited or
  used as a parent.
- **F-B36** built (`domain/org/diagnostics.ts`): errors no Responsible (role or agent), several Accountable; warnings no Accountable (human
  activity), unknown role; information Accountable to confirm, agent activity without a human Accountable (D-B18). **F-B37** built: per product and
  role, "role not staffed" when no team serving the product has a line (FTE > 0) of the role's team skill; shared team over 100 %. The split of a
  role between teams follows their FTE × share (no per-activity share yet). **F-B38** built: the five answers; load = catalogue effort of the R
  activities split between their R roles (effort points, a view, not an engine figure); the unit answer gives FTE by location and grade, not cost.
  **F-B39** partial: `organisationView` writes the lane set unit → team → role (`childLaneSet`, each activity under the team giving the product the
  most FTE on its role's skill, "Not staffed" otherwise), XSD-valid, role-lane shapes dropped; no geometry for the new lanes, not yet offered in
  the export dialog; import of organisation lanes waits for the mapping dialog of F-B8 (B4).
- **Teams: derived-view stage, `teamIn` / `sharedTeam` kept as the stored form.** `derivedTeams` + `teamRowsOf` rebuild every product's effective
  team identically (107 fixtures, the three-product portfolio, the shipped example, a property test over shares and FTE: same rows, values,
  order and identity). Moving the teams into the document was **not done** because it cannot be done safely in this phase:
  1. *Override model.* The organisation is common (§ 16.3) but a product that overrides its process holds a whole-document copy (F-B20, B3); teams
     in the document would be copied into every overriding product, a second source that drifts. The override must first split into a process
     part and an organisation part (`OVERRIDABLE_KEYS`, the Overrides sheet, B5's portfolio override work).
  2. *Level.* `teamIn` is a product key (never common: `store/address` routes it to `products[i]`), the document is common; editing one
     product's team would change the common document and invalidate every product's resolved case (the per-product memo of § 10).
  3. *Writers.* Team rows are written by the Input team commands, the address layer and tab-sync patches, the Input Team / RateTeam / SharedTeam
     sheets of both workbooks, stress scenarios and Verify A; moving them is a v3 → v4 migration touching the files B4 / B5 change in parallel.
  The derived teams are the proven migration target; the move belongs with the override split.
- **Screens**: 🏢 Organisation (frame group: unit tree editable with the keyboard, teams with their lines, role catalogue) and 🧭 Who does what
  (scope group: RACI matrix filtered by phase, team, unit and staffing of a product; RACI editor; the five views; checks inline). Both are app
  sections (Admin, Builder, Business journey), `S-static`. Team In and the shared team table keep their screens (same commands); the Organisation
  section links to them. Audit observations on roles / teams / units wait for B7.

## 17. Extended BPMN profile: every element AgentCase exploits

Each element below is read, written and **used** (it feeds a figure, a check, a view or the audit), not only kept. Elements are listed
by what they bring; the phase that builds them is in § 13.

### 17.1 Data, traceability and tools

- **F-B40 — Inputs as well as outputs.** Activities declare what they **consume** (`dataInputAssociation`, `ioSpecification` with
  `dataInput` / `inputSet`) as well as what they produce. The default process links the SDLC chain (framing → requirements → design →
  code → tests → release → run). `domain/process/trace.ts` derives the traceability graph: upstream / downstream of each deliverable,
  impact of an activity change, orphan deliverables (produced, never consumed) and missing inputs (consumed, never produced in scope).
  The Section Dependencies page and the impact views read it. Regulatory norms that require traceability (DO-178C, ISO 26262,
  IEC 62304…) get a "traceability complete" check per norm.
- **F-B41 — Data stores = repositories and tools.** `dataStore` / `dataStoreReference` model where data lives: backlog tool, source
  repository, wiki, test management, CI, ticketing, the Knowledge Hub. Each data store references tool catalogue entries (§ 15.2) through
  `ac:tool`. An activity's read / write associations to data stores give: the tools an agent needs access to, the integration surface
  required (API / MCP / CLI from the catalogue), and "agent blocked: no API to its data store" diagnostics. The Knowledge Hub is the data
  store the agents read context from; its curation load links to the activities that write it.
- **F-B42 — Deliverable states.** `dataState` on data objects: draft, reviewed, approved, baselined (configurable list). Quality gates
  and approvals require a state (`ac:requiresState`); the Defend group's evidence counts deliverables reaching "approved" / "baselined".
  `dataObject isCollection="true"` marks deliverables that come in numbers (test cases, stories), multiplied by their volume.
- **F-B43 — Typed deliverables.** `itemDefinition` types each deliverable (document, code, test suite, model, record, dataset);
  `import` may reference an external schema (e.g. a requirements interchange format). Types drive the default tools proposed by the
  audit and the token profile of agent work (code vs prose).

### 17.2 Volumes, cadence, time and repetition

- **F-B44 — Multi-instance.** `multiInstanceLoopCharacteristics` (`isSequential`, `loopCardinality`, `completionCondition`) marks an
  activity repeated per item: per story, per test case, per release, per ticket. The cardinality is a parameter bound to a **volume**
  (`ac:volume` per period, filled from the operational audit, § 15.3). Effort becomes effort per item × volume when the activity is
  multi-instance; otherwise today's lump effort applies (parity: the default process has no multi-instance until a case sets volumes).
- **F-B45 — Cadence and service levels.** `timerEventDefinition` on start events (`timeCycle`, ISO 8601 such as `R/P2W` for a two-week
  sprint, `R/P1M` for a monthly release) gives the delivery cadence the factory model and the velocity views read; timers on
  intermediate events model waiting time (approval lead time); `timeDuration` on boundary timers models service levels in run.
- **F-B46 — Bounded loops.** `standardLoopCharacteristics` with `loopMaximum` and `testBefore` carries the agent's internal iterations
  (the loop pairs' `internalIterations`), so "the agent codes, tests and fixes up to 3 times" is standard BPMN.

### 17.3 Exceptions, rework, escalation, rollback

- **F-B47 — Boundary events.** On an activity: **error** (`errorEventDefinition`, e.g. "Defect escaped") → rework path with its
  probability and cost share (replaces or complements the back flows of § 3); **timer** (SLA breach, waiting too long) → escalation path;
  **escalation** (`escalationEventDefinition`) → the Accountable role (§ 16) takes over. Interrupting and non-interrupting kinds are both
  read. The rework cost the engine computes from the loop pairs is computed from these paths when present (one owner, `domain/process`).
- **F-B48 — Reusable definitions.** Root `error`, `escalation`, `signal` and `message` definitions ("Defect escaped", "Escalate to
  Accountable", "Release published", "Hand-off package") are defined once and referenced everywhere.
- **F-B49 — Event sub-processes.** `subProcess triggeredByEvent="true"` models work triggered during the process: incident in run
  (L9), regulatory audit request, security vulnerability, change request. They replace the ad-hoc "Cross-cutting" bucket where the work is
  event-driven; their frequency is a parameter (`ac:frequency`, from the audit).
- **F-B50 — Compensation.** `isForCompensation` activities and compensation events model rollback (failed deployment in L8, revert of a
  release). Their probability is the change-failure rate; their cost feeds the DORA views (Model Engine) instead of a flat coefficient.

### 17.4 Variants and reuse

- **F-B51 — Conditional scope.** `inclusiveGateway` and `exclusiveGateway` with `conditionExpression` (and default flows) express the
  case's scope as rules on case parameters: "norm DO-178C selected", "industry = AERO", "regulatory scope included", "lifecycle =
  run". Conditions use a small, safe expression language (`ac:` FEEL subset: comparisons, `and` / `or` / `not`, membership) evaluated by
  `domain/process/conditions.ts`; never `eval`. The selection screens keep working: they set the parameters the conditions read.
- **F-B52 — Reusable process library.** `callActivity` calling a global `process` or a `globalTask` / `globalUserTask` /
  `globalManualTask`: patterns such as "code review", "quality gate", "release to production", "regulatory sign-off" are modelled once.
  At portfolio level they form a **shared process library** (common layer); each product's process calls them; a product may override
  one library entry (same whole-key rule as F-B20). A change in the library reaches every product that calls it.

### 17.5 Automation types

- **F-B53 — Who or what does the work.** The task type separates:
  | Task type | Meaning in AgentCase |
  |---|---|
  | `userTask` | a person with tool support |
  | `manualTask` | a person without a system |
  | `serviceTask` with `ac:agent` | an **AI agent** |
  | `scriptTask` | **already automated by a tool** (CI pipeline, script, RPA): not an AI gain |
  | `sendTask` / `receiveTask` | a hand-off: sending or receiving a package between roles or units |
  | `businessRuleTask` | a rule-based decision (quality gate, AI authority rule), optionally bound to a DMN table (§ 17.8) |

  The engine never counts AI savings on `scriptTask` activities (already automated today), and counts the hand-off cost of send /
  receive tasks. Parity: the default process maps today's three activity types only (Human, Manual, Agent).

### 17.6 Organisation, interfaces and assignment (with § 16)

- **F-B54 — Formal lanes and assignment rules.** `lane.partitionElementRef` binds each lane to its role, team or unit; activities assign
  their actors through `resourceAssignmentExpression` and `resourceParameterBinding` against `resourceParameter`s declared on resources
  (team, grade, location, sourcing, product). The § 16 chain "role Dev of the team serving this product, grade B, Portugal" is then plain
  BPMN; `ac:raci` stays as a convenience copy.
- **F-B55 — Hand-offs between units.** In the organisation view, `messageFlow`s between pools (client ↔ vendor, onshore ↔ offshore,
  delivery ↔ run) carry the hand-off packages (`message` definitions). The number of interfaces per product and the hand-offs per activity
  feed the operational audit (§ 15.3 "Flow") and a coordination-cost parameter (`ac:handoffCost`).
- **F-B56 — Several similar participants.** `participantMultiplicity` (minimum / maximum) models "three vendors of the same kind" or
  "two offshore teams" without duplicating pools.
- **F-B57 — Conversation view.** A conversation diagram (`conversation`, `conversationLink`) gives the map of who talks to whom between
  units, generated from the message flows: a light organisation view for steering committees.

### 17.7 Diagram, annotations, file header

- **F-B58 — Annotations.** `textAnnotation` + `association` carry audit notes and pain points (§ 15) on the diagram, visible in any
  BPMN tool; written only when the export includes audit data (F-B33).
- **F-B59 — Several diagrams per file.** One `.bpmn` holds the role view, the organisation view and one view per phase (several
  `BPMNDiagram`), all over the same semantic model.
- **F-B60 — Colours.** BPMN-in-Color DI attributes (`color:background-color`, `color:border-color`, understood by bpmn.io and Camunda
  Modeler) show scope, audit status, AI authority or task type in third-party tools, with a legend as a text annotation.
- **F-B61 — File header.** `definitions` carries `exporter="AgentCase"` and `exporterVersion`, a stable `targetNamespace`, and a
  `bpmn:extension` declaring the `ac:` namespace (`mustUnderstand="false"`); processes are `isExecutable="false"` and `processType="None"`
  so tools know the file is a documentation model, not an executable one.

### 17.8 Neighbouring OMG standards

- **F-B62 — DMN.** Decision tables (DMN 1.x XML) for the rules the case already holds: quality-gate criteria, the AI authority level
  per activity class, the supervision split per authority level. `businessRuleTask` references a DMN decision (`ac:decisionRef`); the
  decisions export as a `.dmn` file next to the `.bpmn` and import back. Evaluation is done by AgentCase's own table evaluator (hit
  policies UNIQUE / FIRST / COLLECT, FEEL subset of F-B51); no external engine.
- **F-B63 — CMMN.** Run and support work (L9) is case-like (unordered, event-driven). A CMMN view of the run phase (case plan, stages,
  sentries, human tasks, milestones) may be exported for tools that use it; AgentCase reads back only what maps to its model (tasks,
  roles, frequencies) and keeps the rest as pass-through.

### 17.9 Decisions for the extended profile

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B20 | Do rework figures come from boundary events or back flows? | (a) back flows only; (b) boundary events when present, back flows otherwise | **(b)**: one owner in `domain/process`, back flows kept for parity. |
| D-B21 | Multi-instance volumes | (a) effort per item × volume when volumes exist; (b) always lump effort | **(a)**, opt-in per activity; default process unchanged (parity). |
| D-B22 | Expression language for conditions and DMN | (a) safe FEEL subset evaluated by AgentCase; (b) JavaScript expressions | **(a)**: no `eval`, portable to DMN tools. |
| D-B23 | `scriptTask` and AI savings | (a) no AI saving on already-automated work; (b) same as human work | **(a)** (F-B53). |
| D-B24 | DMN | (a) export + import + built-in evaluator; (b) export only | **(a)** for the three rule families of F-B62. |
| D-B25 | CMMN | (a) export of the run phase, read back what maps; (b) out of scope | **(a)** as the last phase, optional. |

## 18. Out of scope

Executing processes (tokens, timers, messages): timers, events and conditions are read as parameters and rules, never run. Process
mining, choreography diagrams, collaborative real-time editing, BPMN 1.x or XPDL import (a later converter may be considered). DMN and
CMMN are in scope only as described in § 17.8.
