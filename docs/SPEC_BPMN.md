# AgentCase — Specification: the delivery process as a native BPMN 2.0 model (export and import)

> Status: **specified; phases B0, B1, B2, B3, B4, B5, B5b, B6, B6b, B7, B7b, B9a and B9b built** (B0: extension XSD, official OMG schemas, `tools/bpmn-validate.mjs`, sample and hostile files, § 5.3; B1: domain only, `app/src/domain/process`, § 6.3; B2: reader / writer, security, round trip, BPSim, export from the File menu, § 5.5; B3: schema v3, the case stores the BPMN document, § 6.4; B4: the Process section, import, § 9.1; B5: custom activities, roles, agents and rework from the model in the engine, § 7.1; B5b: extended profile in the domain, § 17.10; B6: the optional lazy BPMN editor, § 9.2; B6b: organisation model, § 16.8; B7: audit layer, § 15.7; B7b: DMN decisions and the CMMN run view, § 17.11; B9a: the transformation programme derived, its timing owner and screens, § 19.9; B9b: decisions D-B27…D-B31 applied, labour from resources, opt-in activities, waves edited in the Process panel, § 19.10). Decisions D-B1…D-B26 **adopted on 2026-10-30** (§ 12, § 15.6, § 16.7, § 17.9); D-B26: the case's BPMN
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

### 6.5 Built in B9c (schema v4: the programme's values in the document)

- **Key list.** Schema v4 (`_schemaVersion: 4`) removes the transformation programme's case keys from the form values: the parameters of every
  programme activity (`programme/storedKeys.ts` `PROGRAMME_VALUE_KEYS`, checked against the catalogue and the opt-ins), the opt-in switches `opt*`,
  `costProfile_<line>`, `activityDesc_<kind>`, `wbsCode-<kind>`, and the legacy amounts `setupTraining` / `setupGov` (see § 19.13: not retired). They
  are entries `<ac:value key="…" value="…"/>` of one `ac:programmeValues` element in the delivery process's `extensionElements` (a global element of
  the extension XSD, 1.x additions rule), in catalogue order, a new value appended at the end. Not moved (not case keys): the knowledge subset of a
  product (`ktLeadMonths` and the per-product hub values), the waves, their dependencies and the setup capacity (portfolio structure, § 19.13).
- **Migration 3 → 4** (`store/persistence/schema/v4.ts`): the process text is read once, then the store-form conversion of § 6.4 moves the values
  (`programmeInStore`): the file's keys over the default case's values (what the version 3 reader filled a missing key with). A file whose
  document cannot be read is left to the validators and the readers, which do the same move. The snapshot library is converted too.
- **One accessor.** `caseValues(case)` (`domain/process/storedValues.ts`): the form values over the stored values, memoised on both identities;
  `makeInputs` uses it, so every engine and view reader is routed through it.
- **Commands.** Unchanged for the screens (`input.set` and the other writers of form values); the address layer writes a programme value into the
  common document as node patches (one attribute, or one appended entry), or into the product's per-field override (§ 19.13).

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
  overridable per product, so moving them into the document changes what a product override means. **Decided 2026-10-30: the agent factory stays out of the
  BPMN scope** (its story / feature links and `fm*` keys stay case keys, unchanged). (3) `dom.checked.regInclude`: **decided and
  built in B9a** (owner, 2026-10-30; DEV-REGINCLUDE-DERIVED): the form copy is dropped on open (`withoutRegIncludeBox`, also a product's
  `checked.regInclude` override) and never saved; `frame.setRegInclude` writes the process only; `tgRegInclude` reads `scopeOf(case).regInclude`; the
  legacy shape (`legacyView`: parameters workbook, excel-compat) derives the box from the process. The oracle fixture `frame-industry-cross` (box
  ticked, `regInclude` false) now reads Off; no euro figure changes. (4) Pins of a custom activity are not accepted yet (`normalisedPins` checks the catalogue ids),
  and the per-phase tables that list the catalogue phases (`phaseArtRows`, agent usage) do not show a custom phase.

## 8. Interface

- New section **🧩 Process (BPMN)** in the Scope group (persona assignment like any section): diagram (SVG, read-only),
  activity table (sortable, filterable by phase, actor, type, scope, regulatory), actor panel, import / export buttons, import
  preview and report, "Reset to default process".
- The diagram is not the only way in: every element is reachable in the table with the keyboard; the SVG has a text alternative
  and a live region announcing the selected element. axe clean in light, dark and high contrast.
- Existing sections keep their look (UI parity); their data comes from the process model.
- Phase 4 (decision D-B6): an embedded BPMN editor (bpmn-js modeler) loaded lazily from a gzipped payload, like ExcelJS, only
  when the user opens "Edit diagram" (built in B6, § 9.2).

## 9. Commands (all undoable)

`process.import` (replace or merge, one step), `process.reset`, `process.addActivity`, `process.updateActivity` (coalesced),
`process.moveActivity`, `process.removeActivity`, `process.setScope` (one or many), `process.addActor`, `process.updateActor`,
`process.removeActor` (refused while referenced), `process.addPhase`, `process.removePhase`, `process.reorderPhases`,
`process.setReworkFlow`, `process.setDiagram` (layout moves, coalesced). The existing scope commands become thin wrappers over
these. Portfolio: the process follows the override commands of spec F6–F9.

### 9.1 Built in B4 (the Process section and the import)

- **Section** 🧩 Process (BPMN) (`app/src/ui/sections/scope/process/`): an app section of the Scope group (shown to Builder and Advanced by default,
  any persona by assignment), kind `I-input` (its Portfolio / Wave aggregate counts each product's process: common or own, activities, in scope,
  not in the default process, actors). Diagram: SVG from the document's BPMN DI, read-only, zoom / pan with buttons, keyboard (+ − 0, arrows) and
  pointer (drag, wheel), a click selects an activity, a live region names the selection; an activity without a shape (added or imported) is drawn in
  its phase below the others, no shape moves (F-B13). Activity labels are drawn from 200 % zoom. The activity table is the diagram's text alternative (the image is described by it; the first
  100 rows, then "Show all"): sortable,
  filtered by phase, actor, type, scope, regulatory and text; its scope box is `process.setScope`; the selected activity's panel edits name, phase,
  effort and supervision split; the actor panel lists roles and agents with their team skill and use count, adds a role, removes an unused one.
  Toolbar: Import, Export (the File menu's dialog), Reset (whole or a phase).
- **Import (F-B6–F-B9).** The file is read and checked first (B2 reader, F-B10); nothing is written before "Import". AgentCase files: Replace = the
  file's tree (pass-through and BPSim kept, export → import → export byte-identical; an in-scope-only file is refused); Merge = known ids take the
  file's parameters and scope, new activities are added as written to their phase (or the phase the user maps), missing actors copied. Foreign files:
  each task's unit (top-level sub-process, else lane, else process) maps to a phase (suggested by id or name), its roles (lane, performer resources)
  to the case's roles by name or to new roles whose team skill the user picks (D-B10); a task named like a case activity updates it, others are
  added with parameters from the activities of their phase and type, flagged "parameters to review". Replace removes the case's other activities
  (phases, roles and the diagram of the kept elements stay); Merge keeps them or switches them out of scope. D-B4 on import: the file's out-of-scope
  activities come in out of scope or are left out. The preview lists added / updated / out of scope / removed / left out / defaulted; the report adds
  the elements not mapped by kind and the headline net, ROI and FTE after, before / after. Mappings are remembered for the session.
- **Not in B4.** Foreign content that is not mapped (events, gateways, flows, data stores, other pools, vendor extensions) is listed in the report but
  not kept in the case's process (F-B11 pass-through holds for AgentCase files; for foreign files: built in B5b, § 17.10). A new role's resource is inserted
  after the existing resources (the XSD order of root elements), so its undo patch is larger than an append. Custom and imported activities count
  in the figures from B5 (§ 7).

### 9.2 Built in B6 (the optional BPMN editor, D-B6 b)

- **Editor.** "Edit diagram" under the read-only diagram of 🧩 Process (BPMN) opens bpmn-js's Modeler (bpmn-js 18.31.0, pinned, the only new
  dependency) on the case's process document (the product shown, in a portfolio). Buttons "Save to the case", "Reload from the case", "Close editor"
  (a second press when the editor has unsaved changes); the focus moves to the editor's heading on opening and back to "Edit diagram" on closing; a
  live region gives the outcome. Ctrl+Z on the canvas is the editor's own undo (the case's shortcut does not see it); outside the canvas it undoes
  the case. A clean editor follows the case when it changes elsewhere (undo, the table); an edited one says so and its save is refused (it would undo
  the other edit) until it is reloaded.
- **Lazy, offline, CSP unchanged.** Like ExcelJS (D5): the build (`vite.config.ts`, plugin `bpmnPayload`) replaces `controllers/processEditorKit.ts`
  by one gzipped base64 string (bpmn-js's UMD browser bundle + its three style sheets, the icon font embedded as `data:`; the file URLs of the font
  and the CSS comments are dropped), marked `agentcase-bpmn-js:`; `controllers/processEditorInline.ts` decompresses it on the first opening and runs it
  as an inline script removed at once (the `BpmnJS` global taken and deleted); its style sheet is added while the editor is open (marked
  `data-transient`, never copied into an HTML snapshot). bpmn-js needs no `eval`, no network and nothing the policy forbids (`tools/e2e-bpmn-editor.mjs`
  fails on any CSP violation): the policy is unchanged.
- **Size (§ 10).** App without the editor payload: 2.86 MB / 1.03 MB gzip (base `e767ff5`: 2.85 / 1.03; + 14 kB of app code); the payload: 0.27 MB,
  budget `bpmnPayloadMB` 0.32 in `app/perf-budget.json`. `tools/perf.mjs` applies the regression budgets (3.08 / 1.12) to the app without the payload
  and the hard ceilings (5 / 1.5) to the whole file (3.14 MB / 1.24 MB gzip).
- **Write-back (`process.applyEditor`, one undoable command).** The editor's text goes through the B2 reader and the F-B10 checks, then is MERGED into
  the case's tree (`domain/process/editorMerge.ts`): elements matched by id (else name, leaf text and rank), attributes compared after line-end /
  tab normalisation, numbers on the diagram by value, attributes bpmn-moddle leaves out because they hold the metamodel default (or the unresolvable
  `bpmn:extension definition`) kept; a matched element keeps its comments, white space and position, new elements take the case's prefixes and
  indentation; nothing changed → the same tree, so open → save without a change is no command and byte-identical (tested on the case and on every
  sample of `app/fixtures/bpmn`, through bpmn-moddle, the editor's serialiser). Then `editorApply.ts`: a task drawn in a phase becomes an activity with
  the parameters of its phase and type (the F-B8 defaults, in scope, "review them in the table"); a task moved to another phase takes its phase and its
  deliverable; a removed task loses its deliverable; elements AgentCase does not model (events, gateways, annotations, data stores, groups, a task outside
  a phase…) are kept as pass-through, listed by kind and not counted. Refused with a message, nothing written: adding / removing pools or processes,
  removing or adding a phase, changing actors or norms, moving or removing a task of a rework pair, a result that fails F-B10. The merged document is
  XSD-valid (tested).
- **Licence.** bpmn-js's licence (MIT plus the bpmn.io watermark clause) requires the watermark to stay fully visible: no style of the app targets it
  (unit test), it is present, linked to bpmn.io and not hidden in jsdom, and in the built file it is visible and topmost at its centre (e2e).
- **Not in B6.** No properties panel (parameters stay in the table and panels); the editor's undo history is lost on Save (it reloads from the case);
  the editor shows the first diagram of the document.

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
| B4 (**built in B4**) | Process section: SVG diagram, activity table, actor panel, import (replace / merge, preview, report), export | axe clean; ui-parity 0 divergence | 1.5 d | 3 / 5 | B3 | Accessible diagram with a table alternative; the merge preview |
| B5 (**built in B5**) | Custom activities / roles / agents in the engine; rework flows from the model; portfolio override; Excel / report / HTML outputs | Hand-computed reference tests; cross-surface equality | 2 d | 4 / 5 | B3 | New engine inputs without breaking the single-owner rule; deviations to record |
| B5b (**built in B5b**, domain; screens open, § 17.10) | Extended profile (§ 17): traceability graph, data stores bound to tools, data states and types, multi-instance volumes, timers and cadence, bounded loops, boundary events and reusable definitions, event sub-processes, compensation, conditional scope (FEEL subset), shared process library, task types, formal assignment and lanes, message flows and multiplicity, conversation view, annotations, several diagrams, colours, file header | Default process unchanged in figures; each element has a reader / writer / round-trip test and a test of the figure, check or view it feeds | 3 d | 4 / 5 | B5 | Breadth (about 25 elements); a safe FEEL parser; the process library across products |
| B6 (**built in B6**) | Optional lazy BPMN editor (D-B6 b) | Size budget; editor round trip | 1.5 d | 4 / 5 | B4 | Size budget, CSP, writing the editor's changes back to the node tree; bpmn-js licence requires its watermark to stay visible |
| B6b (**built in B6b**, teams at the derived-view stage) | Organisation model (§ 16): organisation elements in the `BPMN` document, migration of `teamIn` / shared team lines to teams (parity), RACI on activities, `domain/org`, Organisation and Who-does-what sections, resource roles and organisation view | 107 fixtures identical before the RACI-driven figures; diagnostics tests; axe clean | 2 d | 4 / 5 | B3 | Moving the entry team and shared lines into the organisation with identical figures |
| B7 (**built in B7**) | Audit layer (§ 15): tool catalogue, `ac:audit` elements and `domain/audit`, Audit section, audit workbook, audit report, explicit calibration | Round trip with audit data; calibration log; axe clean | 2 d | 3 / 5 | B4, B6b | Curating a neutral, dated tool catalogue (needs the owner's review) |
| B7b (**built in B7b**, § 17.11) | DMN decisions (F-B62) and the optional CMMN export of the run phase (F-B63) | DMN round trip; evaluator tests per hit policy | 1.5 d | 3 / 5 | B5b | DMN hit policies and the shared FEEL subset |
| B8 | Release: guide, DEVIATIONS (if any), CHANGELOG, version bump | All gates green | 0.5 d | 1 / 5 | all | — |
| B9a (**built in B9a**, derived stage; waves board open, § 19.9) | Transformation programme process derived from today's keys; one timing owner per programme activity (§ 19) | 107 fixtures identical; parallel-run 40/40; excel-compat 67/67 | 2 d | 4 / 5 | B8 | Unifying the Gantt, cost-model and engine timings without moving a figure |
| B9b (**built in B9b**, § 19.10; figures move, DEV-B9B-SETUP-SPREAD … DEV-B9B-RESOURCES) | Timing conflicts resolved (D-B27…D-B31); labour costs of training, coaching, governance from resources; opt-in new costs; waves edited in the Process panel | Hand-computed reference tests; deviations recorded | 2 d | 4 / 5 | B9a | Figures move: each change explained and recorded |
| B9c (**built in B9c**, § 19.13; figure-neutral) | Programme values stored in the BPMN document (schema v4) | All round trips; v3 → v4 identical | 2 d | 5 / 5 | B9b | Second schema migration across every persistence path |
| B9d | Gantt, WBS, OBS / RAM and resource histogram from the programme process; MS Project XML export; Plan screen (§ 19.8) | One owner for Gantt, cost and histogram; Σ histogram × rate = programme labour cost; MSPDI schema-valid | 2.5 d | 3 / 5 | B9b | A documented mapping where no standard exists; the delivery histogram read from the engine, never recomputed |
| B9e (**built in B9e**, § 19.12) | 📋 Programme screen in the Scope menu: enable, description, type (one-off, spread, adoption curve, recurring, milestone), duration, cost, linked section (§ 19.11) | Defaults change no figure; each type hand-computed | 1.5 d | 3 / 5 | B9b | One owner shared with the Process panel |

Durations are **elapsed working days with the agent workflow** used so far (parallel agents in worktrees, full local gates, a PR per
phase merged on green CI, the owner's review of each delivery), with an uncertainty of about ±50 %. Difficulty: 1 = routine,
5 = touches the core of the application (store, undo, persistence) with strict parity.

- **Total**: about 19 days of work for B0–B8, plus about 8.5 days for the transformation programme and its project views (B9a–B9d, § 19). **Critical path** B0 → B1 → B2 → B3 → B5 → B5b → B7b → B8: about 12 days, because B4, B6, B6b and B7
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
| D-B33 | Do audited observations count as evidence in the evidence ledger (Defend group)? | (a) yes, per model driver, from a fixed mapping driver ← audit field, weighted by confidence; (b) no, the ledger stays declared only | **(a)** (adopted 2026-10-30, § 15.7): the confidence grade (P6) moves only with audit data; a case without audit keeps its figures. |

### 15.7 Built in B7 (audit layer)

- **In the document** (D-B26, no new key, schema unchanged at 3): `ac:auditHeader` and `ac:toolCatalog` in the collaboration's `extensionElements`
  (created on the first edit, removed with their last content), `ac:audit` in the extension elements of the tasks and resources it describes (removed
  with its last observation, so an emptied audit gives back the original bytes). **XSD (1.x rule, additions only):** the audit header gains the
  optional, ordered `ac:calibration code date source` with its `ac:change element param from to formula` children (type `tCalibratedParam`: effort,
  aiAuthority, probability). Everything else uses the elements declared in B0. Every audited document and its exports validate (OMG XSDs + `ac:` +
  profile).
- **F-B23 / F-B25 built, the content is a draft for the owner's review.** `app/src/domain/catalog/tools.json`: 86 tools, every capability of § 15.2,
  dated 2026-10-30, each with vendor, category, licence, capabilities, AI features, integration, hosting and its public product page as source; neutral
  (alphabetical within a category, never ranked or recommended); the file and the screen say "DRAFT - needs the owner's review" (the facts are
  indicative, written from public vendor pages, not re-checked online in B7). **F-B24** built: the tools of the activity's capability (case and
  spaces ignored, "Run / support" = RunSupport), by category, with a search box; a client-specific tool is added to the case's catalogue and then
  offered for every activity of its capability. **F-B26** built: retire / restore / remove a case entry (undoable), JSON export (effective catalogue
  with sources) and import (entries equal to the shipped ones skipped); a shipped catalogue never overwrites the case's entries; "catalogue updated
  since this audit" when the case's catalogue date is older than the shipped one. Not built: the catalogue as a sheet of the audit workbook (the
  workbook's Lists sheet carries the codes only).
- **F-B27 / § 15.3 built.** Every field of § 15.3 is an `ac:observation` (registry `domain/audit/fields.ts`: 25 fields in 7 blocks, each with
  source, date and confidence; numbers, percentages 0–100 and choices checked) plus `ac:tool` (version, edition, licences, hosting, integration, AI
  use, residency, owner team), `ac:painPoint` and `ac:evidence`; the header (code, client, scope, status, as of, auditors, interviews).
  **D-B13**: effort per item, FTE share, headcount and skill gaps take an optional per-role split (`role`, a resource of the document); roles get
  their own audit (the Roles tab: workload, tools, constraints), linked to the organisation model (team skill, the activities the role is
  Responsible for from the RACI of B6b, the activities that hold an FTE share of it).
- **F-B28 built** (`domain/audit/analysis.ts`, a view, never a figure): observed person-hours per month (effort per item, or the sum of its per-role
  values, × items per period × periods per month: day 21, week 52/12, sprint 26/12, month 1, quarter 1/3, year 1/12; release and project not
  comparable) against the modelled effort; observed rework rate against the back flows that rework the activity (`ac:rework activityA`); the
  authority implied by the automation level (none → Assistance, scripted → Copilot, pipeline → Supervised autonomous, agentic → Autonomous)
  against the AI authority; the observed FTE share of a role against its modelled share (the activity's effort over the effort of every in-scope
  activity the role is Responsible for); coverage (count and effort-weighted); the tooling map (per capability: tools in use that serve it, gap,
  overlap); progress per phase.
- **F-B29 / D-B11 built.** `proposals(doc)`: effort = observed hours per month × k, k = Σ modelled effort / Σ observed hours over the in-scope
  activities that have both (two at least); rework probability = observed rework rate; AI authority from the automation level (never for a
  regulatory activity). Each with its formula. The user ticks some; `audit.calibrate` applies only those, as one undoable step, and appends
  `CAL-n` (date, source, each parameter before → after, formula) to the log. Tests: `tests/domain/audit/calibration.test.ts` (hand-computed:
  k = 10 / 30 → 6.67 / 3.33; selected weight 10 → 9.67; tiers [0.7, 0, 0.3] → [0, 0.7, 0.3]; LP001 rework 10 × 0.1 × 0.4 = 0.4 w → 0.8 w), and
  `fixtures-identical.test.ts`: on the 107 fixtures a full audit leaves `computeCase` identical. The evidence ledger's use of the audit: below
  (D-B33).
- **Audit evidence in the evidence ledger (D-B33, built after B7).** One owner, `domain/model/auditEvidence.ts` (`AUDIT_DRIVER_FIELDS`,
  `auditEvidence`): an audited observation counts as evidence for the ledger driver it supports.
  - **Mapping driver ← audit field.** `p` (acceptance rate, P1) ← `firstPassYield`, `reworkRate` (the share of the work accepted without
    rework); `supCapacity` (supervising capacity, P3) ← `fteShare` (per role: the share of the people's time the activity really takes). The
    year-1/2/3 ramps (forecasts, not observable today), the loaded day rate and the token price (§ 15.3 has no cost field) have no audit field. Only
    observations on in-scope activities count; tools, pain points, evidence references, role-level observations and the calibration log do not
    (a calibration changes activity parameters, not ledger drivers; the observations behind it count).
  - **Tier of one observation** (§ 15.3 provenance): confidence high → MEASURED, medium → BENCHMARK, low or none → ASSUMPTION; without a
    source or a date → ASSUMPTION; source "estimate", or a date older than ~18 months at the evaluation date (the CC-EV-02 rule) → at most
    BENCHMARK. Tier of an activity: the strongest of its supporting observations (per-role values included).
  - **Audited tier of a driver**: score = Σ effort × tier value (1 / 0.6 / 0.25) / Σ effort over the in-scope activities, an activity without a
    supporting observation counting as ASSUMPTION; MEASURED at score 1 (every in-scope activity measured), BENCHMARK from 0.6, else
    ASSUMPTION. A driver without a supporting observation has no audited tier.
  - **In the ledger**: the tier the grade, the upgrade path and the portfolio counts use is the stronger of the declared tier (after CC-EV-02)
    and the audited tier; the declared tier, source and date are never rewritten; CC-EV-01 counts an audited driver as having evidence. The
    Defend section shows the audited tier, score and activities under each driver; the audit report (section 6 "Evidence ledger") and the results
    workbook's Audit sheet print the same rows (`evidenceRows`), evaluated on the export day like the section on the day it is open.
  - **Effect**: none without audit data (107 fixtures, parallel run, excel-compat identical; no legacy surface has audit data, DEV-AUDIT-EVIDENCE).
    Tests: `tests/domain/audit/evidence.test.ts` (hand-computed: (7 × 1 + 3 × 0.25) / 10 = 0.775 → BENCHMARK; grade 0.25 D → 2.5 / 7 D →
    3.25 / 7 C), `evidence-surfaces.test.tsx` (section, report and workbook print the owner's rows).
- **F-B30 partial.** The audit is per process document: a product that overrides its process (F-B20) has its own audit, the others share the
  common one (no separate per-product key, per D-B26 and the brief "no new case key"). The section is `I-input`: its aggregate view consolidates
  coverage, gaps, overlaps, pain points and calibrations per product and the tooling map across the products and waves (`aggAudit.ts`).
- **F-B31 built** (🔎 Audit, frame group, app section shown to Admin and Business journey): header, files, Activities (progress per phase, filters
  by phase, actor (R / A / agent from the RACI), capability, audited; the first 100 rows; the form of the selected activity), Roles, Tool catalogue,
  Coverage and calibration. Keyboard-only, axe clean. **Not built:** the Process diagram's colouring by audit status (the B6 editor changes the
  diagram in parallel; to add after its merge).
- **F-B32 built.** "Export audit template": Read me, one sheet per block (one row per in-scope activity, a row per role for a per-role split), Tools,
  Pain points, Evidence and a Lists sheet; drop-downs (data validation) for tool codes and every enumeration. "Import audit workbook": the
  parameters workbook's size and zip guards, every row checked against the document before anything is written, merged by activity id, one
  undoable step, report added / updated / ignored / unchanged rows with the reason of each ignored row. The header and role-level audits are not in
  the workbook.
- **F-B33 / D-B14 built.** The export dialog (File menu and Process section) offers "Include audit data" only when the case holds some, unticked.
  Without it every audit element leaves the file (the export of a case without audit is the same object: byte-identical, the B2 round trips hold);
  with it the file is marked (`ac:process containsAudit="true"`, "contains_audit_data" in the name) and its catalogue carries the shipped entries
  it uses. A collaboration file carries the header and catalogue of the first product that has them and prefixes the per-role split like every
  id. Import: Replace takes the file's tree, audit included; Merge does not merge audit data yet.
- **F-B34 built.** Audit report (standalone scriptless HTML in the report theme, to print or save as PDF): header, coverage, progress per phase,
  tooling map, tools per activity, observed versus modelled, top pain points, calibration log. The results workbook adds "Audit" and "Tooling"
  sheets only when the case holds audit data (excel-compat unchanged).
- **F-B35 built.** The workbook, the report, the BPMN export and the HTML snapshot with audit data say "contains audit data" in their names
  (and the report and workbook in the file); the HTML snapshot asks (Import / Export section, shown only when the case holds audit data, default
  no).
- **Persistence** (no code needed, the audit is the document): save / open, autosave with its undo history, tab sync, HTML embed (when asked),
  BPMN export with and without audit, audit workbook out and back in — `tests/store/audit-persistence.test.ts`.

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

### 17.10 Built in B5b (the extended profile in the domain)

Readers and writers of every element of § 17.1–§ 17.7 work on the case's node tree (`app/src/domain/process/profile/`, plus `trace.ts`,
`conditions.ts`, `importKeep.ts` / `importAdopt.ts` in `domain/process`, `formalLanes.ts` / `multiView.ts` in `domain/org`, the FEEL subset in
`domain/feel`); they read an AgentCase file (tasks in phase sub-processes) and a foreign one (tasks anywhere) alike, through one index of the
document (`profile/walk.ts`). **The default process holds none of these elements, so every figure of the 107 fixtures is unchanged**; only the export
header (F-B61) and the BPSim of boundary rework are new bytes in an export. Each element has a reader / writer / round-trip test (write → parse →
write byte-identical, same view) and a test of what it feeds (`app/tests/domain/process/profile/`, `tests/domain/feel/`); the documents validate
against the OMG XSDs + `ac:` XSD + profile.

| Item | Built | Feeds |
|---|---|---|
| F-B40 inputs, traceability | `ioSpecification` + `dataInputAssociation` writer (`linkInput`), `trace.ts`: upstream / downstream, impact, orphans, missing inputs, "traceability complete" per norm (DO-178C, DO-254, ISO 26262, IEC 62304, IEC 61508, EN 50128, EN 50716, ECSS) | views and check (domain) |
| F-B41 data stores | `dataStore` + `ac:tool` (ref, integration, hosting), references, read / write associations | tools and integration per activity, "agent blocked: no API to its data store" (no API, MCP or CLI), Knowledge Hub curation load |
| F-B42 states | `dataState`, `ac:requiresState`, `isCollection` | gate check (inputs at the required state or beyond, order draft → reviewed → approved → baselined), evidence count (a collection counts its volume) |
| F-B43 types | `itemDefinition` (kind read from its name / structure: document, code, testSuite, model, record, dataset), `import` | token profile code / prose |
| F-B44 multi-instance (D-B21) | `multiInstanceLoopCharacteristics` + `ac:volume` | **figure**: effort per item × items (`profile/effort.ts`, applied in `viewsCatalogue.ts`) |
| F-B45 timers | ISO 8601 durations / cycles (`profile/duration.ts`), cadence, waits, service levels | views (cadence days, waiting days per phase, SLA days) |
| F-B46 bounded loops | `standardLoopCharacteristics loopMaximum testBefore` | **figure**: a rework loop without `internalIterations` takes the loop maximum of its agent activity |
| F-B47 boundary events | error, timer, escalation, compensation, message, signal; interrupting or not; BPSim probability of a boundary rework path on export, read back when `ac:rework` is absent (cost share 0) | rework loops (B5), SLA view, escalation check ("no Accountable") |
| F-B48 definitions | root `error`, `escalation`, `signal`, `message` | unresolved and unused references |
| F-B49 event sub-processes | `subProcess triggeredByEvent` + `ac:frequency` (no longer read as a phase; at the top of the process its work joins Cross-cutting) | **figure**: effort × occurrences |
| F-B50 compensation | `isForCompensation` handler, compensation boundary event, association, new `ac:changeFailure probability` (XSD, optional, 1.x rule) | **figure**: handler effort × change-failure rate; the model's change-failure rate (view) |
| F-B51 conditional scope (D-B22) | exclusive / inclusive gateways, FEEL `conditionExpression` (`xsi:type tFormalExpression`, FEEL language URI), default flows; `domain/feel`: hand-written scanner, parser and evaluator (no `eval`, length and depth capped; unary tests for the DMN tables of B7b); case context `domain/scopeRules.ts` (industry, norms, industries, regInclude, phasesOff, lifecycle, values, checked) | **figure**: the branch not taken (its target, the single-entry path after it, the tasks of sub-processes on it) leaves the selection; an undecidable condition is taken and reported |
| F-B52 library | global tasks, global processes (no pool), `callActivity` | **figure**: a call counts its entry's effort; `withLibrary(product, common)` gives a product the common entries it calls (its own entry wins) |
| F-B53 task types (D-B23) | `scriptTask` → Script, `sendTask` / `receiveTask` → Send / Receive, `businessRuleTask` → BusinessRule (also when written by AgentCase) | **figure**: no AI saving on Script (agent share 0); hand-offs counted (view) |
| F-B54 assignment, lanes | `resourceParameter`, `resourceParameterBinding`, `resourceAssignmentExpression`; `partitionElementRef` on the role lanes of the organisation view; `formalOrganisationView`: each phase holds its own lane references | assignment view, binding check |
| F-B55 / F-B56 interfaces | pools, `participantMultiplicity`, `messageFlow` + `ac:handoffCost` | interfaces per pool, hand-offs per activity, coordination hours (× multiplicity of the other side) |
| F-B57 conversations | `conversationView`: one `conversation` per pair of pools, `conversationLink`s | view (generated) |
| F-B58 annotations | `textAnnotation` + `association`, `withNotes` (for the audit export of B7) | notes per element |
| F-B59 diagrams | `allViews`: role view first, organisation view (second lane set of the process, own `BPMNDiagram`), one diagram per phase; the reader draws the first diagram only | views |
| F-B60 colours | `colourBy(scope / type / authority)`: BPMN-in-Color on the shapes (default theme's chart colours), legend annotation; reads `bioc:` too | export option (domain) |
| F-B61 header | `exporter`, `exporterVersion`, `targetNamespace`, `bpmn:extension` for `ac:`, `isExecutable="false"` `processType="None"` on every export (idempotent) | — |
| F-B11 foreign | `importKeep.ts`: root definitions, the events / gateways / flows / data / annotations of units mapped to one phase (references renamed with the tasks), black-box pools and their message flows, vendor extensions of the tasks; prefixes rewritten to the case's (`importAdopt.ts`); `applyImport` returns what it kept and dropped by kind | pass-through |

**Not done in B5b.** (1) No screen yet: the views, checks and export options above are domain functions (the Process section, the export dialog
and the Section Dependencies page are B6's area); the hand-off cost, cadence, waits, change-failure rate and token profile are views, not engine
figures (Model Engine DORA, factory velocity and token profile keep their coefficients). (2) The default process does not link the SDLC chain with
inputs yet: doing so changes the default document of every case (sizes, the migration output); the trace graph is ready for it. (3) `withLibrary` is
not called by the portfolio's effective case: a product override is written back as a whole document by the controllers, which would copy the
common entries into the product (the override split of § 16.8 comes first). (4) The import report screen does not show the kept / dropped counts
(`applyImport(...).kept`); foreign content in an unmapped lane or crossing phases is dropped and counted. (5) The tool catalogue proposals by type
(F-B43) and the operational-audit feeds (F-B55) wait for B7.

### 17.11 Built in B7b (DMN decisions, CMMN run view)

- **Placement (D-B1 / D-B26).** The decisions are one DMN 1.3 `dmn:definitions` inside the `extensionElements` of the case's main `bpmn:process`:
  same document, no new case key. BPMN reads extension content with `processContents="lax"`; `agentcase-bpmn-validate.xsd` now imports the OMG
  DMN13.xsd, so the embedded decisions are validated strictly (XML ids are unique across the file: an import refuses a DMN id the process already
  uses). The process, not the collaboration, holds them because they travel with their process: the portfolio file keeps one process per product and
  prefixes the ids, `href`s and `ac:decisionRef`s. A `businessRuleTask` (or a task typed BusinessRule) names its decision with `ac:decisionRef`
  (already in the B0 XSD). The default process holds none: **every figure of the 107 fixtures is unchanged**.
- **Model and evaluator (`app/src/domain/dmn`, D-B24 a).** Reader / writer of input data, decisions with information requirements, decision tables
  (input / output clauses, allowed values, default output entries, rule annotations) and literal expressions; business knowledge models, contexts,
  invocations and DMN DI stay in the tree and are reported as not evaluated. Hit policies UNIQUE, FIRST, PRIORITY, ANY, COLLECT (with SUM / COUNT
  of the distinct outputs, MIN, MAX, as DMN 1.3 § 8.2.11 words it), RULE ORDER, OUTPUT ORDER; a multiple match under UNIQUE, a disagreement under ANY
  or a non-numeric SUM is an error (null), never a guess. The decision requirements graph evaluates required decisions first (their result joins the
  context under their name and id), detects cycles and caps the depth. Cells use the FEEL subset of F-B51 (`domain/feel`, no `eval`, bounded) without
  change: the unary tests built in B5b cover the DMN input entries.
- **What the decisions feed.** (1) **Conditional scope**: the gateway conditions read `decision.<id>`, each decision evaluated in the case context
  (`scopeRules.ts conditionContext`). (2) **Parameters**: a business-rule task bound to a decision applies it to every activity of its phase (of its
  process outside a phase), itself excepted, in document order; the decision reads `activity` (type, valueClass, phase, capability, regulatory,
  aiAuthority, humanSup, agentSup, effort, norm) and the case context; its outputs `aiAuthority`, `humanSup`, `agentSup` replace those parameters in
  the engine's activities (`decisionRules.ts`, `artefacts.ts workingArtefacts`). A rule task out of scope applies nothing; an unknown decision or a
  value outside the levels / 0–100 is reported and not applied.
- **The three rule families (F-B62).** `ruleFamilies(activities)` writes the rules a case already holds as decisions: the AI authority per activity
  class (type × value class × regulatory → the level most of its activities have; UNIQUE), the supervision split per authority level (the mean
  split at that level; requires the first) and the quality-gate review (regulatory → Formal review, agent-produced → Peer review, else Spot check;
  PRIORITY). They are what a case without decisions exports as its `.dmn`.
- **Files (F-B62, F-B63).** The export dialog adds "Decisions as a DMN file (.dmn)" (checked when the process holds decisions) and "Run phase as a
  CMMN case (.cmmn)", for the case shown. The Process section's import field takes a `.dmn` file (checked in full: security, DMN 1.3 root,
  references, cycles, cells inside the subset, ids; then one undoable step `process.importDecisions` replacing the decisions) or a `.cmmn` file.
  `process.bindDecision` binds a rule task (API and tests; no screen yet).
- **CMMN (D-B25 a, `app/src/domain/cmmn`).** The run phase L9 as a CMMN 1.1 case: a `humanTask` per activity performed by its role (`caseRoles`),
  a `task` typed `ac:activityType` for agent, script and rule work, a repeatable `stage` per sub-process inside it (an event sub-process carries its
  `ac:frequency`), a milestone "<phase> complete" with a sentry on every plan item. The read-back applies names, roles (by name, to the task's
  `humanPerformer`) and frequencies of known ids as one undoable step and counts what it does not read.
- **Schemas.** DMN 1.3 and CMMN 1.1 OMG XSDs in `docs/bpmn/omg/dmn13/` and `cmmn11/` (unchanged, SHA-256 in `SOURCES.md`, re-checked by
  `tests/bpmn/omg-dmn-cmmn.test.ts`); `tools/bpmn-validate.mjs` validates a `.dmn` / `.cmmn` file against them (plus `ac:`) by its root element.
- **Tests.** `tests/domain/dmn/` (hit policies by hand, round trip write → parse → write byte-identical and read(write(m)) = m, embedding, XSD of the
  `.dmn`, of a BPMN export and of a portfolio file embedding decisions, figures and scope fed by decisions, the rule families), `tests/domain/cmmn/`
  (export valid against CMMN11.xsd, deterministic, read-back), `tests/store/bpmn-b7b-commands.test.ts` (one undoable step, refusals), UI tests of the
  dialog and the import field.
- **Not done in B7b.** (1) No screen edits or binds decisions (a DMN tool edits the `.dmn`; binding is a command without a control). (2) The CMMN
  read-back does not keep the CMMN content it does not map (sentries, milestones, planning tables): the case stores BPMN only (D-B1), so a re-export
  regenerates them. (3) The rule families are an export of the case's current rules; they do not replace the parameters until bound. (4) The DMN
  decision is not drawn on the diagram (no DMN DI is written).

## 18. Out of scope

Executing processes (tokens, timers, messages): timers, events and conditions are read as parameters and rules, never run. Process
mining, choreography diagrams, collaborative real-time editing, BPMN 1.x or XPDL import (a later converter may be considered). DMN and
CMMN are in scope only as described in § 17.8.

## 19. Transformation programme process (phases B9a, B9b, B9c, B9d)

### 19.1 Objective and today's gap

The delivery process (§ 5) holds the SDLC work that agents reduce. The application also plans, costs and schedules the work of the
**transformation itself**: engagement stages, pilot, setup lines, change management, Knowledge Hub, knowledge transfer, build and
adoption ramp, AgentOps run, waves. Today these items have a cost without a timing of their own, or a timing without a cost, and some
have **several owners for one figure**:

| # | Conflict today | Owners |
|---|---|---|
| T1 | Setup duration | engine spreads the setup over a fixed 6 months (`time/kernel.ts`, `setupProfileMonths: 6`); the Gantt "Agentic Build" bar uses the input `setupDuration` (default 12); wave capacity and the cost model use the 6 |
| T2 | Pilot placement and duration | cost model from the product's month 1, overlapping the setup; Gantt and engagement stages "Pilot & Prove" before the build (`rmD4`, 6 weeks); pilot sizing `pilotWeeks` + 2 × `pilotBreakin` (12 + 4 weeks) |
| T3 | Knowledge Hub setup timing (one cost, three clocks) | Gantt `khSetupDays` after onboarding; consolidation `ktLeadMonths` before month 0; engine inside the 6-month setup profile |
| T4 | Engagement stages listed twice | 5 stages in `frame/onboarding.ts` (`STAGES`), 4 hard-coded in `verifyB/ganttProgram.ts` |
| T5 | Coaching counted twice | `setupCoaching` setup line and the coaching curve (`coachY1`, `coachCruise`), the latter outside the euro result |

The objective: a second process, **"Transformation programme"**, in the case's single BPMN document (D-B1 / D-B26), where each
programme activity holds **one** duration, placement, set of roles and cost rule that every surface reads (Gantt, cost model, engine,
waves, report).

### 19.2 Inventory: what becomes a programme activity

| Activity | Today | Level | Cost rule (§ 19.3) |
|---|---|---|---|
| Engagement stages: Discover, Calibrate, Validate, Pilot & Prove, Decide & Scale (gates) | `rmStart`, `rmD1..4`; `frame/onboarding.ts`, `verifyB/ganttProgram.ts` | case | resources, opt-in (new cost) |
| Pilot | `pilotFte`, `pilotWeeks`, `pilotBreakin`; `tune/program.ts` `pilotSizing` | per product | resources (parity) |
| Setup: tooling and infrastructure | `setupTooling`; `tuneB/setup.ts` `setupBreakdown` | per product | non-labour cost item |
| Setup: training | `setupTraining` | per product | resources (deviation) |
| Setup: coaching, with the coaching curve | `setupCoaching`, `coachY1`, `coachCruise` | per product | resources (deviation, one owner) |
| Setup: governance | `setupGov` | per product | resources (deviation) |
| Change management (readiness) | `hriQ0..17`; `convChangeCost` | per product | engine formula kept, shown on a role |
| Knowledge Hub setup | `khSetupBase`, `khA0..8`, `khTargetCC`, `khSetupDays`; `khSetupCost` | per product, common hub | resources from the formula's days (parity) |
| Knowledge transfer preparation | `knowledge.ktLeadMonths`; `portfolio/knowledge.ts` | per product | same amount as the hub setup row, never added |
| Knowledge Hub run: curation, infrastructure | `khCurationFTE`, `khInfraMonthly`; `khRunAnnual` | per product, infra shared | curation: resources; infra: non-labour |
| Agentic build and adoption ramp (go-live) | `setupDuration`, S-curve, milestones L1…L4 | per product | engine result, the activity displays it |
| AgentOps run | `runTeamSizing`, `runTeamCost` | per product | engine result, the activity displays it |
| Waves | `portfolio.waves`, `resolveSchedule` | per wave | container (sub-process), sum of its products |
| Value tracking | `plannedQuarters`, `trackStatus` | case | resources, opt-in (new cost) |
| Risk mitigations and AI Act obligations | `RISK_REGISTER`, `AIACT_TIERS` | case | resources, opt-in (new cost) |
| Audit / discovery interviews (§ 15) | audit header | case | resources, opt-in (new cost) |
| Governance gates and maturity transitions L1→L4 (Design Authority, AI Office sign-off) | `tune/program.ts` `TRANSITIONS`, `tune/maturityTab.ts` `GOV_GATES` (text only) | per product | milestones and gateways, no cost; placed at the engine's adoption crossings (B9a) |
| Capability building (operational / in training / target headcount) | `capOps`, `capTrain`, `capTarget`; `tune/program.ts` `capability` | per product | part of the training activity (trainees = in training); milestone "target capability reached"; no new cost in B9a, training cost from resources in B9b |

**Not programme activities**: parameters and coefficients (S-curve, maturity bounds, discount rate, horizon, hub allocation mode;
`maxConcurrentSetups` becomes a lane capacity); results (FTE before / after, vFTE, KT days avoided, risk scores, stress, verdict); the
agent factory (`fm*`, a simulation of the delivery process), **out of the BPMN scope by the owner's decision (2026-10-30)**. Governance
gates, maturity transitions and capability building are in the table above (added 2026-10-30, built in B9a). Not found in the application
and the four agent-rollout activities of the table below. The delivered software's own go-live, run and end of life are already delivery
activities (phase L8 Deployment `A044` Go-live dossier; L9 Run / AMS `A045`–`A049`; L10 End-of-life `A050` Decommissioning plan) and stay there.

**Agent-rollout activities (added 2026-10-30, built in B9b; new costs, opt-in, off by default per D-B31):**

| Activity | What it is | Level | Cost rule (§ 19.3) |
|---|---|---|---|
| Licence procurement | Selecting and buying the agent platform, model and tool licences (sourcing, security and legal review, contract) | portfolio, per product for product-specific tools | labour from resources (procurement, security, legal roles × days); the licence amounts stay the existing tooling and token cost lines, never added twice |
| Agent-toolchain integration | Connecting the agents to the delivery toolchain: repository, CI/CD, ticketing, wiki, test management, the Knowledge Hub (API / MCP / CLI per the tool catalogue, § 15.2; the B5b "agent blocked: no API" check lists the gaps) | per product | labour from resources (agent architect, platform engineer × days per integration) |
| Rollout hypercare | Intensified support after each product's agent go-live (adoption ramp start): incident triage, prompt / guardrail tuning, user support | per product | labour from resources (AgentOps, AI reviewer × weeks), placed right after the go-live milestone; ends before the steady AgentOps run (no overlap with `runTeamSizing`) |
| Legacy decommissioning | Retiring the tools, scripts and manual steps the agents replace (licences ended, data archived, access removed) | per product | labour from resources; an optional saving line (licences ended) only when entered, never inferred |

Each one is a programme task with its role lane, RACI, duration, placement and parameters in the Process screen (§ 19.7), appears in the
Gantt, WBS, OBS / RAM and resource histogram (§ 19.8), and follows the one-owner rule. Off by default, so no figure of an existing case moves;
switching one on adds its cost to the programme cost and the cash flow (hand-computed tests).

### 19.3 Cost of a programme activity

- **Labour → derived from resources**, like the SDLC: effort (days) × role × the same rate card and location mix. A rate change moves
  delivery and programme consistently.
- **Non-labour → cost items** on the activity (licences, infrastructure, tokens): amounts, not derived.
- **Engine-computed → displayed, never recomputed**: the adoption ramp, AgentOps sizing and change management keep their single owner in
  `src/domain`; the activity references it.
- **No AI gain** on a programme activity (it is the cost of the transformation, not work agents reduce).
- **Parity classes**: pilot, hub setup, hub run and AgentOps keep today's figures exactly; training, coaching and governance change
  (recorded in DEVIATIONS.md); stages, value tracking, AI Act obligations and audit interviews are new costs, **off by default**.

### 19.4 Functional requirements

- **F-B64** — The case's BPMN document holds a second participant "Transformation programme" (`ac:programme="true"`), with lanes from
  the operating-model roles (`tune/opmodel.ts`: orchestrator, AI reviewer, preceptor, agent architect, FinOps, Design Authority, AI
  Office lead) and the organisation model (§ 16).
- **F-B65** — Each programme activity has one duration and one placement (relative to the case start, the product's month 0 or another
  activity), read by the Gantt, the cost model, the waves, the engine's monthly profile and the report (conflicts T1–T5 resolved).
- **F-B66** — Message flows link the two processes (hub ready → agents enabled; knowledge transfer done → the product's wave starts;
  pilot decision → scale).
- **F-B67** — Per-product activities are multi-instance over the products of the wave (D-B21); waves are sub-processes with their
  dependencies (`start` / `setupEnd` + lag) and the transformation-team capacity on the lane.
- **F-B68** — Cost per § 19.3; the engine and the cost model read one monthly profile built from the activities.
- **F-B69** — RACI (§ 16), audit (§ 15) and export (§ 4) work on programme activities as on delivery activities; the export offers
  delivery only, programme only, or both.

### 19.5 Phases

| Phase | Content | Gate | Duration | Difficulty |
|---|---|---|---|---|
| B9a | Programme process **derived** from today's keys (like the B6b teams); one timing owner per activity for the Gantt, cost model and stages; the two stage lists merged; message flows; export; screens per § 19.7 (swim lanes, parameter panel, context screens) | 107 fixtures identical; parallel-run 40/40; excel-compat 67/67; Gantt and cost-model surfaces read one owner | 2 d | 4 / 5 |
| B9b (**built in B9b**, § 19.10) | Conflicts T1–T5 resolved by the decisions below; training, coaching and governance derived from resources; the four opt-in agent-rollout activities (§ 19.2); opt-in new costs | Hand-computed reference tests; each changed figure recorded in DEVIATIONS.md | 2 d | 4 / 5 |
| B9c (**built in B9c**, § 19.13) | Stored values move into the document (schema v4 migration), keys removed, views derived | All persistence round trips; v3 → v4 open → save → open identical | 2 d | 5 / 5 |

### 19.6 Decisions (adopted 2026-10-30, as recommended)

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B27 | Setup duration (T1) | (a) the engine's 6 months everywhere; (b) the `setupDuration` input everywhere, the engine spreads over it; (c) per setup line, from its activity | **(c)**, which reduces to (b) when lines share one duration |
| D-B28 | Pilot placement (T2) | (a) before the build (Pilot & Prove); (b) from month 1 overlapping the setup | **(a)**: the pilot proves before scaling; its cost moves earlier |
| D-B29 | Knowledge Hub setup timing (T3) | (a) `ktLeadMonths` before the product's month 0; (b) `khSetupDays` after onboarding; (c) inside the setup profile | **(a)** for the per-product part, the common hub once before the first wave |
| D-B30 | Coaching (T5) | (a) one coaching activity, curve-based, in the euro result; (b) keep the setup line, curve informative | **(a)**, **revised 2026-10-31**: one coaching activity priced as a resource activity: coaching days per month (default 2) × duration in months × the coach day rate (the rate card rule of the other resource lines), spread evenly over its months; an existing case's `setupCoaching` amount calibrates the days (total days = amount / day rate, months = days / days per month), so the cost reproduces the amount; the 40/30/20 % curve (`coachY1`, `coachCruise`) is not priced, it stays the informative view of the Maturity screen |
| D-B31 | New costs (stages, value tracking, AI Act, audit interviews) | (a) opt-in, off by default; (b) on by default | **(a)**: no figure moves without a choice |
| D-B32 | Where the programme lives | (a) second participant in the same document; (b) a separate document | **(a)** (D-B26) |

### 19.7 Screens: activities live in the BPMN, screens show the context (clean by design)

Adopted with the decisions above. **An activity's description and parameters are held only in the BPMN document**; no other screen
defines, describes or edits an activity.

- **F-B70 — Process screen with swim lanes.** The 🧩 Process (BPMN) section draws both processes (delivery and transformation
  programme) as BPMN with **swim lanes per role** (the organisation's roles, § 16; agents in their own lane) and phases or waves as
  sub-processes. Selecting an activity opens its **parameter panel**: description, role (lane), RACI, duration and placement, effort,
  cost rule (§ 19.3) and the activity's own parameters (for example pilot team and weeks, hub setup base, coaching load), each edit one
  undoable command on the document. The table stays the accessible alternative of the diagram.
- **F-B71 — Context screens.** The screens that today define programme activities (engagement and onboarding stages, Gantt, program /
  pilot, setup, change management, Knowledge Hub, knowledge transfer, waves, run sizing, maturity / coaching, value tracking) keep
  **only the context**: results, figures, charts, diagnostics and the case-level inputs that are not activity parameters. Each shows the
  activities it relies on as read-only references with a "Open in Process" link to the activity in the Process screen. No activity
  description, list or parameter field is duplicated on them.
- **F-B72 — One owner.** A test fails if an activity parameter key is written by a screen other than the Process screen's parameter
  panel (or the BPMN import / editor), and if an activity description exists outside the document.

### 19.8 Gantt, WBS, OBS and resource histogram (phase B9d)

No standard converts BPMN into project-management views: BPMN (OMG, ISO/IEC 19510) models processes; the WBS (ISO 21511:2018, PMI
practice standard), the OBS and the responsibility assignment matrix (PMI practice) and the resource histogram (a scheduling output,
PMBOK / ISO 21502) model projects. The transformation programme is a project, so AgentCase applies a **documented, conventional mapping**
from its BPMN document; every export says it is a derived view, not a standard conversion. The delivery process is recurring work: it gets
a resource histogram, not a WBS.

All four are **views computed from the document** (D-B1 / D-B26: nothing new is stored except an optional WBS code override); activities
are still edited only in the Process screen (§ 19.7).

| BPMN source | Project view |
|---|---|
| Programme participant → wave sub-processes → per-product multi-instance → tasks | WBS levels 1 programme, 2 wave (or engagement stage), 3 product, 4 work package |
| Task duration and placement (one timing owner, F-B65), sequence and message flows | Gantt bars and dependencies (finish-to-start + lag) |
| Milestone events, gates (gateways), decision points | Gantt milestones |
| Organisation units → teams → roles (§ 16), operating-model roles, lanes | OBS |
| RACI on tasks (§ 16, F-B36) | RAM = WBS × OBS |
| Task effort × role over its duration (§ 19.3); delivery FTE per role per month from the engine | Resource histogram |

- **F-B73 — Gantt.** One Gantt built from the programme process (bars from F-B65, dependencies from sequence and message flows, milestones
  from events and gates, critical path), for the Product, Wave and Portfolio scopes. It replaces the hard-coded rows of
  `verifyB/ganttProgram.ts` and the portfolio Gantt's own placement, which read the same owner. Each bar links to its activity ("Open in
  Process").
- **F-B74 — WBS.** Codes `1`, `1.2`, `1.2.3`, `1.2.3.4` derived deterministically from the tree (document order); an optional `ac:wbsCode`
  overrides a code. WBS dictionary per work package: name, description, deliverable, Accountable (RACI), roles, effort, cost (§ 19.3),
  duration, start, finish, predecessors. Phase- and wave-oriented with a named deliverable per work package (D-B35).
- **F-B75 — OBS and RAM.** OBS = units → teams → roles of the organisation model, plus the operating-model roles and the agents (own
  branch). RAM = WBS work packages × OBS roles with the RACI letters; the F-B36 checks (no Responsible, several Accountable) shown on it.
- **F-B76 — Resource histogram.** Per month, stacked by role (or team, unit, location), in FTE (D-B34): programme activities (effort spread
  over each activity's duration) and, as a second view, the delivery process (FTE before and after agents per role, read from the engine,
  never recomputed). A capacity line per role or team (entry team FTE, transformation-team capacity, `maxConcurrentSetups`) and
  over-allocation flags (diagnostics only: no automatic levelling, D-B37). One owner in `src/domain` (`domain/programme/histogram.ts`);
  cross-surface test: Σ histogram × rate = labour cost of the programme activities in the cost model.
- **F-B77 — Exports.** MS Project XML (MSPDI) of the programme: tasks with WBS code and outline level, durations, start and finish,
  predecessors with lag, generic resources per role, assignments with work; opens in MS Project and ProjectLibre and imports into
  Primavera (D-B36: export only). Results workbook: WBS, WBS dictionary, OBS, RAM and Histogram sheets. Report: Gantt, WBS and
  histogram pages.
- **F-B78 — Screens.** The Gantt section becomes the **Plan** context screen (§ 19.7) with tabs Gantt, WBS, OBS / RAM, Histogram: views
  only, every row linking to its activity in the Process screen; keyboard and table alternatives for the charts (axe clean).

| # | Question | Options | Adopted (2026-10-30) |
|---|---|---|---|
| D-B34 | Histogram unit | (a) FTE per month; (b) person-days per month; (c) both, a toggle | **(c)**, FTE by default (the unit of the rest of the case) |
| D-B35 | WBS orientation | (a) phase / wave-oriented with a named deliverable per work package; (b) strictly deliverable-oriented (ISO 21511 preference) | **(a)**: follows the programme process; the deliverable column keeps the ISO 21511 reading |
| D-B36 | MS Project XML | (a) export only; (b) export and import back | **(a)**: AgentCase stays the source (D-B1); an import would be a second editor of the activities |
| D-B37 | Over-allocation | (a) flags only; (b) automatic levelling that moves activities | **(a)**: no figure moves without an explicit edit in the Process screen |

| Phase | Content | Gate | Duration | Difficulty |
|---|---|---|---|---|
| B9d (**built in B9d**, below) | F-B73…F-B78: Gantt from the programme process, WBS, OBS / RAM, resource histogram, MSPDI export, workbook and report pages, Plan screen | Gantt, cost model and histogram read one owner; Σ histogram × rate = programme labour cost; MSPDI validated against Microsoft's MSPDI schema; axe clean; ui-parity 0 unrecorded | 2.5 d | 3 / 5 |

**Built in B9d** (views and exports: no figure of the 107 fixtures moves; code `app/src/domain/programme/{gantt,ganttSpans,critical,plan,wbs,
wbsDictionary,deliverables,obs,ram,histogram,histogramDelivery,histogramPortfolio,mspdi,mspdiTime,planBundle}.ts`):

- **F-B73 built.** `programmeGantt` is the one Gantt: a bar per active activity placed by the timing owner (activities whose module or opt-in
  switch is off have none), finish-to-start links with lag (the stage sequence; every product bar after the Decide & Scale gate, "pilot decision →
  scale"; run after build; hub run after hub setup; "hub ready → agents enabled" hub setup → run), milestones (the gate, and the engine's maturity
  and governance crossings), critical path (backward pass on the given placements: nothing is rescheduled). The Gantt band's rows
  (`verifyB/ganttProgram.ts` `programRows`) are its band rows, and the portfolio Gantt's product bars its `productWindow` (tests: the band on the
  107 fixtures, the product window on a three-product portfolio). Wave and Portfolio scopes: `portfolioPlan` shifts each product's bars to its consolidation month 0.
- **F-B74 built.** WBS level 1 programme, level 2 engagement stages / each wave (a single case: "Rollout") / programme assurance, level 3 the
  product, level 4 the work packages (the activities and milestones of the plan); codes from the tree in catalogue order. The override is the case
  key `wbsCode-<kind>` until B9c (edited in the activity's panel, exported `ac:wbsCode`, global attribute of the extension XSD, dotted digits;
  sample `fixtures/bpmn/programme/programme-wbs-override.bpmn`); it applies to a work package with one instance in the plan; a code that repeats
  another is ignored and flagged. Dictionary: description, deliverable (D-B35, `deliverables.ts`), Accountable, roles, effort, cost (the
  activity's cost owner), duration, start, finish, predecessors with lag.
- **F-B75 built.** OBS: the organisation model's units → teams → roles (team skills with FTE), the transformation team (operating-model roles,
  Y1 FTE) and the agents. RAM: WBS work packages × the programme's lanes with the RACI letters; `org/diagnostics.ts` `raciDiagnostics` (F-B36)
  on every row (milestones: Responsible their lane, Accountable the AI Office).
- **F-B76 built.** `histogram.ts`: per month, the labour of each resource line of the cost profile (and the pilot, outside the euro result) =
  its spend ÷ its day rate, stacked by role; FTE = days ÷ (working days / 12) (D-B34: FTE default, person-days toggle). Capacity = the role's
  operating-model FTE (Y1); the Portfolio adds `maxConcurrentSetups` (products in setup at once); flags only (D-B37). Delivery view
  (`histogramDelivery.ts`): FTE before = the entry team per role; after = the engine's monthly `humanFte` laid on the roles in the entry team's
  proportions (the engine sizes the team, not its roles), the run team and the agents' vFTE as the engine's rows. Cross-surface test: Σ histogram ×
  rate = the cost model's "Setup: …" labour rows and its pilot row. *Partial:* stacking by role only (team / unit / location groupings not
  offered: the programme's roles all sit in the delivery unit).
- **F-B77 built.** MSPDI (`mspdi.ts`): summary tasks for the WBS groups, work packages with WBS code, outline number and level, start (a "start no
  earlier than" constraint), finish, duration in working days, predecessors (FS + lag), a generic work resource per lane at the role rate, an
  assignment per work package with effort; validated by xmllint against Microsoft's `mspdi_pj12.xsd` (`docs/bpmn/microsoft/`, SHA-256 in
  SOURCES.md; the export uses Project's namespace `http://schemas.microsoft.com/project`, mapped to the schema's `…/2007` target for the check).
  Opening in MS Project / ProjectLibre was not tried here (no such tool in CI). The results workbook gets the WBS, WBS dictionary, OBS, RAM and
  Histogram sheets and the plan report its Gantt, WBS and histogram pages **from the Plan screen's exports**; the Financial tab's workbook and the
  Critical & Regulated report keep their legacy form (their legacy-parity tests), so the plan pages are a separate report file.
- **F-B78 built.** 📅 Plan (section id `gantt`; the menu keeps the legacy label "📅 Gantt / Timeline", which the parameters workbook and
  the Board's generated dashboards carry to the legacy file, DEV-B9D-PLAN-SCREEN): tabs Gantt (the case timeline as before + the programme Gantt and its schedule table), WBS,
  OBS / RAM, Histogram (chart + table); every row opens its activity in Process; keyboard tabs; axe clean in the unit tests.

### 19.9 Built in B9a (programme derived, one timing owner, screens)

Every figure of the 107 fixtures is unchanged (B9a is figure-neutral): the programme is **derived** in memory from its catalogue and today's keys,
like the B6b teams; no value moved, no key added, schema unchanged at 3. Code: `app/src/domain/programme/` (calc zones `run-setup-taxes` for the timing owner, stages and ids (an input the engine reads), `delivery-views` for the catalogue, lanes, milestones, placement and costs, `exports` for the derived view, diagram and BPMN writer).

- **F-B64 built (lanes: partial).** `programmeProcess(ctx, portfolio?, product?)` gives the participant "Transformation programme", eight lanes (the
  seven operating-model roles of `tune/opmodel.ts`, each with its Y1 FTE from the EV-09 topology, and "AI agents" in a lane of its own), four phases
  (engagement stages; setup per product; build and run per product; assurance and value) and the 20 activities of the § 19.2 inventory
  (`catalogue.ts`: name, description, lane, RACI on the lanes, level, cost rule, timing kind, parameters and the keys that hold them, source module,
  the module switch it depends on). Each activity's cost is read from today's owner (`costs.ts`: setup lines, `pilotSizing`, `khSetupCost`,
  `khRunAnnual`, the engine's run team; coaching curve shown as information, T5). *Partial:* the lanes are the operating-model roles; they are not
  yet linked to the organisation model's units, teams and role catalogue (§ 16): that link comes with the stored form (B9c).
- **F-B65 built (one owner, the pre-B9a readings kept).** `timing.ts` is the one timing owner: `stageTimings` / `stageWeeks` (engagement reading:
  blank or 0 → default; Gantt reading `ganttWeeks`: blank → 0), `setupTiming` (`engineMonths` 6, the engine's setup profile; `buildMonths` from
  `setupDuration`, the Gantt build), `pilotTiming` (weeks, break-in, total, months, `costFromProductMonth` 1), `hubSetupTiming` (Gantt days and
  months; engine inside the setup profile), `ktPrepMonths`, and `programmeCalendar` (the Gantt programme band). Readers: the engine kernel
  (`setupProfileMonths`), the Gantt (`programRows`), the engagement roadmap and runway (`frame/onboarding.ts`), the Board variable
  `onboardWeeksTotal`, `pilotSizing`, the cost model's pilot months (`pilotCells`), the wave schedule (setup months of the capacity and of `setupEnd`
  dependencies) and the knowledge-transfer lead (`timeline.ts`, `knowledge.ts`). Where two surfaces disagreed (T1 setup duration, T2 pilot
  placement, T3 hub setup timing, the stage default of T4), the owner names each reading and returns today's value; B9b collapses each pair.
  **T4 merged:** one stage list (`stages.ts`: names, Gantt names and colours, description, gate, evidence section, input, default) read by the
  roadmap and the Gantt. Tests: `tests/domain/programme/timing-owner.test.ts` (each surface against its pre-B9a formula, written out, and against
  the owner, on the 107 fixtures; the waves' capacity counts the owner's months).
- **§ 19.2 rows of 2026-10-30 built.** *Governance gates and maturity transitions:* `milestones.ts` adds per product a milestone "Governance gates in
  place" (criteria: `GOV_GATES`, placed at the engine's first adoption crossing) and three gateways "Maturity gate L1 → L2 / L2 → L3 / L3 → L4"
  (lane Design Authority; criteria: `TRANSITIONS`, read from their owner, not copied; placed at the engine's maturity crossings,
  `engineNow().milestones()`, never recomputed; "not reached inside the horizon" otherwise); no cost. Drawn as a gateway / event in their lane, listed
  in the table, a panel of their own (criteria, role, placement), exported as `exclusiveGateway` / `intermediateThrowEvent` with
  `ac:programmeActivity costRule="none" timing="engine"`. The Gantt (references list), 🧭 Program (transition criteria) and Maturity (governance
  gates) link to them; the gate criteria stay on those screens as context, like the roadmap's gates. *Capability building:* `capOps`, `capTrain`,
  `capTarget` are parameters of the training activity (its trainees = in training), edited in its panel, plus the milestone "Target capability
  reached" (not placed by the engine: it states the build, operational of target); the 🧭 Program capability card keeps its bars and links to both;
  no new cost (B9b). Tests: `tests/domain/programme/process.test.ts`. The sample `app/fixtures/bpmn/programme/programme-three-products.bpmn` (the
  programme-only export of `pf-three-products`, capacity 2) carries every programme element of the XSD and is checked to stay that export.
- **F-B66 built.** Message flows to the delivery participant: "Hub ready → agents enabled" (from the hub setup, or the tooling setup when the hub is
  off), "Knowledge transfer done → the product's wave starts" (hub on), "Pilot decision → scale" (from the Decide & Scale gate).
- **F-B67 built.** Per-product activities are multi-instance over the planned products (`loopCardinality`, × n on the shapes); each wave is a
  sub-process with its effective start, its products and its dependency (`ac:wave`); the transformation-team capacity is on the lane set
  (`ac:setupCapacity`). The waves are drawn in a band under the lanes.
- **F-B68 not in B9a** (built in B9b, § 19.10): the engine and the cost model still read today's owners; the programme displays their figures.
- **F-B69 partial.** RACI per activity (`ac:raci` on the lanes, shown in the panel) and export are built: the export dialog offers the delivery
  process (default, byte-identical to before), the transformation programme alone (its pool, a black-box delivery pool for its message flows) or
  both in one file (second participant, process, message flows, DI under the delivery pool). Extension XSD (1.x rule, additions only): global
  attributes `ac:programme`, `ac:setupCapacity`; elements `ac:programmeActivity` (kind, level, cost rule, timing, placement, cost, active; `ac:param`
  key value unit) and `ac:wave`. Both exports validate (OMG XSDs + `ac:` + profile). An import drops the programme of a file (`withoutProgramme`:
  it is derived from the keys until B9c), so export "both" → import gives the delivery document back byte-identical. *Not built:* the audit layer
  on programme activities (§ 15 observations attach to delivery tasks and roles only).
- **F-B70 built (delivery lanes unchanged).** 🧩 Process draws the delivery process (unchanged) and, under it, the programme: one SVG component for
  both (`Diagram`, labels from 100 % for the small programme), swim lanes per role, the agents' lane, phases and waves as sub-processes, message
  flows drawn out of the pool, multi-instance markers. Selecting an activity (shape or table) opens its **parameter panel**: description, role
  (lane), RACI, phase, instances, duration and placement (the owner's text), effort (days, where today's formula gives one), cost and cost rule,
  source, and the activity's parameters (`NumberInput` / `SelectInput` on the key that holds each value in B9a, the knowledge-subset chips in a
  portfolio, the knowledge-transfer preparation per product): each edit one undoable step. The programme table is the diagram's accessible
  alternative; lanes (with Y1 FTE), message flows, capacity and waves are listed. *Not done:* the delivery diagram keeps the lanes of its stored
  DI (team skills); an agents' lane there would change the default document of every case.
- **F-B71 built for every listed screen but the waves board.** The activity fields and descriptions left: 🤝 Engage (stage durations → references;
  the roadmap cards keep window and gate, not the description), 📅 Gantt (stage fields gone; program bars are read-only groups: Enter or a click
  opens the activity in Process, Alt+arrows still move the roadmap start, a case-level date), 🧭 Program (pilot fields and description), Agentic
  Setup (the four amounts and the setup duration; the Description column), Knowledge hub (target, setup base and days, curation, infrastructure;
  the knowledge-transfer preparation field), Run sizing (mode, floor, ops load), Maturity / coaching (Y1 and cruise load), and references added on
  Human readiness (change management) and the value tracker. Each shows the activities it relies on as read-only references with their values
  and "Open … in Process" (`ui/widgets/ActivityRefs.tsx`, which selects the activity and opens the section). Recorded as DEV-B9A-CONTEXT-SCREENS.
  *Not done in B9a:* 🌊 Waves still edited the wave start, dependency and the setup capacity on its board — moved to the wave's panel in B9b (§ 19.10).
- **F-B72 built.** `tests/ui/programme-one-owner.test.ts`: no file of `src/ui` or `src/controllers` writes a parameter key of a programme activity
  (field ids, `setInput` / `setProductKnowledge` calls, the stage loop) except the parameter panel (and the knowledge-transfer field it renders);
  no sentence of an activity description is written outside `src/domain/programme` (the setup lines lost their `text`).

### 19.10 Built in B9b (decisions applied, labour from resources, opt-in activities, waves in the panel)

Figures move ON PURPOSE in B9b; each family is recorded in [DEVIATIONS.md](DEVIATIONS.md) (DEV-B9B-SETUP-SPREAD, DEV-B9B-PILOT, DEV-B9B-HUB-TIMING,
DEV-B9B-COACHING, DEV-B9B-RESOURCES) with its oracle fields in `app/tests/helpers/deviationsB9b.ts`. Schema unchanged at 3; no key removed (the values
stay in their keys until B9c). Code: `app/src/domain/programme/{timing,profile,optIn,catalogue,catalogueTypes,catalogueOptIn,costs,placement}.ts`.

- **T1–T5 collapsed (F-B65 built).** `timing.ts` gives ONE reading per activity: `stageTimings` (T4: a positive input, else the default, on every
  surface; Pilot & Prove lasts the pilot, D-B28), `setupMonths` / `lineMonths` (D-B27 (c): a setup line lasts its activity's duration, the setup
  duration `setupDuration` unless the activity has its own (`trainMonths`, `govMonths`), so it reduces to (b)), `pilotTiming` (weeks, break-in,
  months, `leadMonths` before the build), `hubSetupTiming` (days → months; D-B29: placed `ktLeadMonths` before the product's month 0, at month 1 for
  a single case or a first wave; the common hub once before the first wave) and `spreadMonths` (the one spreading rule, last month pro rata).
  Readers: the cost profile (and through it the engine), the Gantt band (`programRows`: the build is the setup duration, the hub bar its days), the
  engagement roadmap and runway, the Board `onboardWeeksTotal`, the pilot sizing and the cost model's pilot months (before month 0), the waves'
  capacity and `setupEnd` dependencies (`setupMonths`), the knowledge-transfer lead. The engine's hard-coded 6 months (`setupProfileMonths`) is gone.
- **F-B68 built.** `profile.ts` is the ONE monthly cost profile of the programme: `programmeLines(c)` — tooling (a non-labour amount, over the setup
  duration), training (trainers `trainFte`, default 0.5 FTE) and governance (Design Authority `govFte`, default 0.25 FTE): role FTE × duration × working
  days / 12 × the role rate (the target blended day rate of the rate card and the target location mix, `targetBlendedTJM`, × the AI-skill premium 1.15:
  the SDLC's rate), coaching (D-B30 revised 2026-10-31: `coachDaysPerMonth`, default 2, × `coachMonths` × the role rate, spread over its months;
  with no duration entered, `setupCoaching` calibrates the days, so its cost is the case's amount; the EV-19 curve stays informative), the HRI change cost (engine formula kept), the hub setup (formula kept, parity), the opt-in activities switched on. `engineProfile(c)`
  lays them on the product's months (a spend before the build at month 1, a spend past the horizon in its last month), with the hub part and the
  opt-in savings; the kernel reads it (`K.setupProfile`, `K.ktProfile`, `K.savingProfile`; a scenario lever on the setup scales it), the setup
  breakdown and so `model().setupTotal` add its lines, the cost model writes one row per line ("Setup: Training"…), the consolidation moves the
  engine's own hub months by the lead, the programme panel shows each line's effort and cost. The pilot (`pilotLine`, parity) stays outside the
  euro result (DEV-COSTMODEL-PILOT). `CALCULATION_VERSION` is `agentcase.timeengine.v2` (the same inputs give other results).
- **Opt-in activities (D-B31) built.** `optIn.ts` + `catalogueOptIn.ts`: engagement stages (Discover, Calibrate, Validate: engagement team
  `stagesFte` × the stage weeks; Decide & Scale: `decideDays`), value tracking (FinOps `valueFte` over the horizon), risk mitigations and AI Act
  obligations (`aiActDays` a year), audit and discovery interviews (`auditDays`, before the build), and the four agent-rollout activities of § 19.2:
  licence procurement (`procureDays`, before the build; the licence amounts stay the tooling and token lines), agent-toolchain integration
  (`integrations` × `integrDays`, over the setup), rollout hypercare (`hypercareFte` × `hypercareWeeks` from the go-live, the product's month 1),
  legacy decommissioning (`decomDays` the month after the setup; `decomSaving` €/month saved from the next month, only when entered). Each is a
  programme task with its lane, RACI, duration, placement and parameters in the Process panel; each is switched on by its own key (`optStages`,
  `optValue`, `optAiAct`, `optAudit`, `optProcure`, `optIntegr`, `optHypercare`, `optDecom`, value "on"), OFF by default: no figure of a case moves
  (asserted on the 107 fixtures). On, its labour (days × the role rate) enters the setup and the cash flow (hand-computed tests).
  *Partial:* in a portfolio a case-level opt-in activity switched on in the common values is counted by every product (switch it on for one product
  to count it once); the case-level / portfolio-level split comes with the stored form (B9c).
- **F-B67 / F-B71 waves built.** The 🌊 Waves board keeps the board (waves, order, names, notes, products and offsets) and shows each wave's start,
  dependency and the transformation-team capacity as context with "Open … in Process"; the wave's parameter panel in the Process section
  (`WavePanel`: start, dependency, capacity) is the one place that edits them (F-B72 test extended).
- **Gates.** Hand-computed reference tests (`tests/domain/programme/profile.test.ts`, `timing-owner.test.ts`); `legacy-profile.test.ts` injects the
  legacy profile and finds every skipped oracle field equal to the oracle again (nothing else moved); the legacy parity tests of screens, workbooks and
  reports run on that injected legacy profile; the parallel run records each file's NPV / payback difference in `tools/parallel-run-known.json`
  and excel-compat reports the recorded fields as KNOWN (through the twin), never silently.

### 19.11 The 📋 Programme screen (phase B9e, owner's request 2026-10-31)

A new screen **📋 Programme** in the **Scope** menu lists every activity of the transformation programme in one table — the
programme's counterpart of the delivery activity table — so the owner can switch activities on and off, set their type, duration and
cost, and jump to the section that uses them. It edits the same BPMN document through the same undoable commands as the Process
screen's parameter panel (§ 19.7: one owner per value — the table and the panel are two views of one activity, never two copies).

| Column | Content | Edit |
|---|---|---|
| Enabled | tick box: the activity counts (cost, timing, Gantt, histogram) or not; mandatory activities (e.g. the setup lines the engine needs) are ticked and locked, the opt-in activities (D-B31) unticked by default | yes |
| Activity | name, phase or wave, product (per-product activities show one row per product, or a "per product" row in the Portfolio view) | name |
| Description | the activity's description from the document | yes (text) |
| Type | **One-off** (the whole cost in one month at its placement), **Spread** (evenly over its duration), **Spread on adoption curve** (along the product's S-curve over its duration), **Recurring** (per month or per year for its duration, e.g. hub run, AgentOps), **Milestone** (no cost: gates, maturity transitions) | yes (select) |
| Start / duration | placement (relative to the case start, the product's month 0 or another activity) and duration in months or weeks, from the one timing owner (F-B65) | yes |
| Cost | the activity's cost over the horizon with its rule shown (resources: roles × days × rate; amount; engine-computed, read-only) and, for resource activities, days, frequency (e.g. coaching: days per month) and roles | yes, by rule |
| Linked section | link to the context section that uses the activity (e.g. Pilot → Program & Completeness, Hub setup → Knowledge hub, Training → Agentic Setup, AgentOps → Run sizing) and "Open in Process" (the diagram, swim lane and RACI) | link |

- **Defaults reproduce B9b**: each activity's default type is the spreading rule B9b uses for it (setup lines: Spread over their duration; pilot:
  Spread before the build; hub run and AgentOps: Recurring; gates: Milestone), so opening a case changes no figure. A type change is an
  explicit edit: one undoable step, figures follow (hand-computed tests per type).
- **One owner**: the type is stored on the activity in the document (`ac:costProfile one-off | spread | adoption | recurring | none`) and read by
  the monthly cost profile (`domain/programme/profile.ts`) that the engine, cost model, Gantt and histogram read (B9b).
- Totals row (programme cost by year and in total), filters (phase, product, type, enabled), sort, keyboard and axe clean, table as the
  accessible form; the Portfolio / Wave views aggregate per product (I-input with an aggregate, as the other input sections).

| Phase | Content | Gate | Duration | Difficulty |
|---|---|---|---|---|
| B9e (**built in B9e**, § 19.12) | 📋 Programme screen (F-B79): enable, description, type, timing, cost, linked section; `ac:costProfile` read by the cost profile | Defaults change no figure; each type hand-computed; one-owner test extended; axe clean; ui-parity 0 unrecorded | 1.5 d | 3 / 5 |

### 19.12 Built in B9e (the 📋 Programme screen, the cost profile type)

Figure-neutral by default: every line's type defaults to **Spread**, the B9b rule, so no figure of the 107 fixtures moves (asserted per fixture:
each line laid by `spreadMonths`, an explicit Spread gives the same engine profile and NPV); parallel-run and excel-compat unchanged. Schema unchanged
at 3; the new values live in case keys beside the B9b opt-in switches until B9c moves them into the document.

- **F-B79 built.** 📋 Programme (`programme`, Scope group, an app section shown to Builder, and to Advanced like every section; `I-input` with an
  aggregate): one row per activity and milestone of the programme process with **Enabled** (the opt-in switch `opt*` the Process panel edits; the
  hub and readiness activities follow their module, locked; the others required, locked), **Activity** (name, once for the case or per product × n,
  gateway / milestone tag), **Description** (the catalogue's or the case's own text, key `activityDesc_<kind>`, blank = the catalogue's; shown by the
  Process panel and written into the BPMN export's `documentation`), **Type** (`domain/programme/costProfile.ts`), **Start / duration** (the timing
  owner's placement), **Cost** (amount with its rule, and the resource details: days, days a month over the duration, the day rate, the role; e.g.
  coaching 2 days a month), the cost **by horizon year** in the euro result, and **Linked section** + "Open … in Process". "Edit" opens the
  activity's description and its timing and cost parameters: the Process panel's own fields (`Param`). Totals row = the engine's programme cost by
  year and in total (`engineProfile`), the pilot named outside it. Filters (phase, product level, type, enabled), sortable headers, keyboard and axe
  clean. The Portfolio / Wave view aggregates per product (`domain/portfolio/aggProgramme.ts`: enabled activities, opt-ins on, lines not spread,
  programme cost by year and total, pilot).
- **Type, one owner.** `costProfile.ts`: `one-off` (the whole cost in its first month), `spread` (B9b), `adoption` (over its duration along the
  product's S-curve: each month weighted by the adoption gained that month, evenly when the curve gains nothing there), `recurring` (the cost over its
  duration charged again every 12 months up to the horizon; a recurring resource line's days follow the cycles), `none` (milestones). Stored per cost
  line in `costProfile_<line>` (the four engagement stages share the `stages` line, so one type); `profile.ts` `programmeLines` lays each line by its
  type (`shapeLine`), so the engine, the cost model, the setup breakdown and the panel follow. The pilot (outside the euro result), the build ramp,
  the run, AgentOps and the hub run keep their owner's rule, shown read-only (Spread, Spread on adoption curve, Recurring); the knowledge-transfer
  preparation shows the hub setup's type. The Process parameter panel shows the same type selector and description field (shared editors,
  `ui/sections/scope/programme/Editors.tsx`). Export: `ac:costProfile` on every `ac:programmeActivity` (XSD: `tCostProfile`, optional, default `spread`).
- **Linked section**: one map in the domain (`activityMeta.ts` `LINKED_SECTION`), e.g. pilot → 🧭 Program & Completeness, hub setup → 🧠 Knowledge hub,
  training → Agentic Setup, AgentOps → 🤖 Run-team sizing, coaching → 📐 Maturity & Measurement; a test checks every activity and milestone has one.
- **F-B72 extended.** `tests/ui/programme-one-owner.test.ts`: besides the Process panel, only the 📋 Programme screen edits an activity, through the
  panel's `Param` fields and the shared editors (one `setInput` per value); no other file names the new keys.
- **Tests.** `tests/domain/programme/cost-profile.test.ts` (defaults on the 107 fixtures; each type hand-computed on golden), `table.test.ts` (rows,
  years = totals = engine profile on the 107 fixtures, enabled, details, shared line, description, export, links, aggregate),
  `tests/ui/sections/programme-screen.test.tsx`, `tests/ui/vue-programme.test.tsx`.
- *Open for B9c:* the type, the description and the opt-in switches move into the document together; a case-level opt-in in a portfolio is still
  counted by every product (§ 19.10 partial).

### 19.13 Built in B9c (the programme's stored values in the document, schema v4)

Figure-neutral: every figure of the 107 fixtures is unchanged; the recorded B9b deviations are the only differences with the legacy file. Code:
`app/src/domain/programme/storedKeys.ts` (the keys), `app/src/domain/process/storedValues.ts` (element, accessor, edits),
`app/src/store/persistence/bpmn/programmeDoc.ts` and `schema/v4.ts` (store form, migration), `app/src/store/address/programme.ts` (write path),
`app/src/domain/programme/bpmnImport.ts` (import). Details of the stored form: § 6.5.

- **Stored values moved (keys removed from the form values, views derived).** Opt-in switches, cost profile types, activity descriptions, WBS
  overrides and every programme activity parameter B9a / B9b left in keys: stages (`rmD1…3`, engagement team, workshop), pilot, setup tooling,
  training and governance resources, coaching days / duration and its calibration amount `setupCoaching`, coaching curve, capability, hub setup
  and run, build (`setupDuration`), AgentOps sizing, the opt-in activities. `caseValues` is the one accessor (memoised on the element and the form
  values); `makeInputs` reads it, so the engine, the views and every screen read the document.
- **Not retired: `setupTraining`, `setupGov`.** The brief asked to retire them as "no longer read"; they are no longer read by any figure since B9b,
  but they are still read by the assumption register (two of its 18 inputs), the due-diligence pack (its register rows and the sensitivity),
  the legacy Parameters sheet, the strategies' scaling (`SCALED_IDS`) and the legacy-parity harness (`tests/helpers/legacyProgramme.ts`, the legacy
  profile of every legacy-parity test). Retiring them changes legacy outputs (DD pack 119 → 117 rows, report and results figures under the legacy
  profile) that would each need a recorded deviation. They are therefore stored with the other values (moved, not dropped); retiring them is
  left as a decision for the owner, with those outputs to record.
- **Product overrides (the B6b § 16.8 split, decided).** A product's programme values override the common ones field by field, without copying the
  document: (1) a product's own value is its per-field override `overrides.dom.values.<key>` — the per-product part, exactly the B9b semantics
  (address layer, override badges, Overrides sheet unchanged); (2) a product with a whole-document process override keeps an EMPTY
  `ac:programmeValues` in its copy (`emptiedStoredValues`, applied when the override is created and on read) and `mergeCase` lays the common
  document's values under its form values, so it keeps inheriting every common change. The process override itself stays whole-document:
  splitting it further into process / organisation parts (which teams and the process library need) was not done — the organisation units live in
  the collaboration of the same document, and a split needs a merge of two documents into one resolved tree per product (new trees, the views'
  memo per product); **teams are not moved** (§ 16.8 unchanged).
- **Not moved (not case keys):** the knowledge subset of a product (`ktLeadMonths`, per-product hub target, curation, setup base), the waves, their
  start and dependency and the setup capacity `maxConcurrentSetups`: portfolio structure, edited by portfolio commands, saved with the portfolio
  file (one per portfolio, while the document is per case). Moving them needs a portfolio-level document; open.
- **Write path.** Commands keep writing form values (the panel's `input.set`, strategies, stress, workbook import); the address layer routes a
  programme value: to the product's per-field override (as before), or to the COMMON document as node patches (`programmePatches`: an attribute
  value, or an entry appended at the end; tested: one edit = one patch of one attribute). Portfolio commands write through `withCommonValues`
  (hub infrastructure, apply-subset-to-all, reset of an override) with a `programmeInStore` safety net in `definePortfolioCommand`.
- **Persistence.** JSON file, HTML snapshot, autosave record with its undo history, tab sync (whole documents as text, patches on nodes; a tab of
  schema 3 is ignored), snapshot library, portfolio files: the element travels inside the `BPMN` text; every reader moves stray form values into
  it (`caseInStore`). Parameters workbook: the legacy sheets are written from `legacyView` (the values laid back as form values: Parameters sheet
  byte-compatible) and read back into the document; Overrides sheet unchanged (per-field rows). Calculation packages: figures unchanged, so
  unchanged. The DD fingerprint hashes the stored values with the form values (a measurement saved by a schema 3 file shows as stale once).
- **Import (owner's request 2026-10-31).** A Replace import of an AgentCase file with the programme participant reads its programme back
  (`programmeValuesIn`: each task's `ac:param`, `ac:costProfile`, `documentation`, `ac:wbsCode`; the knowledge-subset parameters and the waves are
  the portfolio's, not read): the values that differ are written in the same undoable step; export "both" → import → export is byte-identical and
  the figures are unchanged. A Merge import, or a file without a programme, keeps the case's programme. An editor save never changes the values.
- **Not done:** linking the programme lanes (operating-model roles) to the organisation model's roles (§ 16): the operating-model roles have no
  team skill in the role catalogue, so a link would be a new mapping to decide (open for the owner); the waves in the document (above).
- **Tests.** `tests/domain/programme/stored-values.test.ts` (keys vs catalogue, node-level edits, byte-identical round trip, accessor),
  `tests/store/bpmn-b9c-roundtrip.test.ts` (v3 → v4 figures identical, v3 → open → save → open identical, the shipped v3 portfolio example, autosave
  with undo history), `tests/store/bpmn-b9c-commands.test.ts` (undo / redo property test after every programme command, patches on the common
  document only, product override, process-overriding product, Replace import round trip).
