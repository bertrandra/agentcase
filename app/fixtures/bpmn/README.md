# BPMN sample files (phase B0 of docs/SPEC_BPMN.md)

Inputs of the BPMN phases (B1 to B7): the import mapping (F-B8), the pass-through and round trip (F-B11, F-B12), the security limits (F-B10).
Every file here is **written by hand**. None was produced by AgentCase, bpmn.io, Camunda Modeler, Signavio or the OMG.

- `tools/bpmn-validate.mjs` validates them against the official OMG schemas (`docs/bpmn/omg/`) and the AgentCase extension XSD
  (`docs/bpmn/agentcase-bpmn-1.0.xsd`). `app/tests/bpmn/samples.test.ts` and `app/tests/bpmn/hostile.test.ts` run it.
- Unlike the oracle fixtures of `app/fixtures/`, these are not generated. They are edited by hand, and each edit must keep the tests green.

## AgentCase profile

| File | Content |
|---|---|
| `minimal-agentcase.bpmn` | The profile of § 5. One pool and two lanes named after team skills (`Dev`, `Test/QA`). Two phases as expanded sub-processes (`V3`, `V4`) with one task of each activity type: Human (`userTask` A016), Agent (`serviceTask` A017 with `ac:agent`, a supervising `humanPerformer` and a bounded loop), Review gate (`userTask` A018 `ac:gate`), Manual (`manualTask` A024, out of scope). There is also a regulatory manual task (R101) tied to the norm category `DO-178C`, which is drawn as a `group`. The file has three roles and one agent (`bpmn:resource` + `ac:actor`), a RACI per task (`resourceRole` + `ac:raci`), a deliverable (`dataObject`), and a rework back flow from the exit gateway of V4 to V3 (`ac:rework`, loop pair LP001). It also holds the organisation (`ac:orgUnit`, `ac:team`, `ac:product`) and a full BPMN DI. |
| `extended-agentcase.bpmn` | The audit layer (§ 15) and the extended profile (§ 17), with no DI. It covers `ac:auditHeader`, `ac:toolCatalog`, and `ac:audit` with its tools, observations, pain point and evidence. It also has: a data store bound to a tool, `ioSpecification` with a data input, a data state, multi-instance with `ac:volume`, a timer start (sprint cadence), an error boundary event with `ac:rework`, an escalation, a business-rule task with `ac:decisionRef`, a gate with `ac:requiresState`, a script task, a send task and a message flow with `ac:handoffCost`, a black-box pool with `participantMultiplicity`, an event sub-process with `ac:frequency`, and a text annotation. |

Between them, the two files use every global element and attribute of the extension XSD (checked by `samples.test.ts`).

## Foreign files: hand-written imitations

These files imitate the **style** of what other tools write: their namespaces, id patterns, vendor extensions and DI habits. They were
not exported by those tools. Compare them with real exports before relying on a detail. The B4 import and the § 10 interoperability
check should add real exports next to them.

| File | Imitates | What it tests |
|---|---|---|
| `foreign-camunda7-bpmnio.bpmn` | bpmn.io / Camunda Modeler 5, Camunda 7 platform | `camunda:` attributes and extension elements (`properties`, `formData`, `inputOutput`, `executionListener`, external tasks), `modeler:` attributes on `definitions`, `bioc:` and `color:` attributes on DI shapes and edges, bpmn.io ids (`Activity_0e4o5x2`…). Lanes `Dev` (a known role), `Product Owner` and `Testers` (unknown). Tasks named like catalogue activities (`Source code`, `Unit tests`). A second, black-box pool (`Offshore vendor`) with a message flow, a data store, a text annotation, and a conditional back flow (`xsi:type="bpmn:tFormalExpression"`). |
| `foreign-camunda8-zeebe.bpmn` | Camunda Modeler 5, Camunda 8 platform | `zeebe:` extension elements (`taskDefinition`, `ioMapping`, `assignmentDefinition`, `formDefinition`, `userTaskForm`, `calledElement`, `subscription` on a root `message`). Lanes `Analysis` (a known role) and `QA Engineers` (unknown). A sub-process named like a phase (`Specification`) and one with an unknown name (`Hypercare`, collapsed, drawn in a **second `BPMNDiagram`**). A call activity with a non-interrupting timer boundary event, and a message catch event. |
| `foreign-signavio.bpmn` | Signavio Process Manager | Default (unprefixed) BPMN namespace, `omgdc:` / `omgdi:` DI prefixes, `sid-` ids, `xsi:schemaLocation`, `signavio:signavioMetaData` / `signavioDiagramMetaData` extension elements, `BPMNLabelStyle`, decimal coordinates. Lanes `Business Analyst`, `Developer`, `Compliance Officer` (unknown) and `Test/QA` (known). Plain `task` elements, a user task named like a catalogue activity (`Requirements / NFR`), a data object, a data store, a text annotation, and a black-box `Regulator` pool with a message flow. |
| `foreign-omg-plain.bpmn` | The OMG "BPMN 2.0 by Example" incident-management style | No vendor extension and **no DI** (the layout of § 4.5 must place it). The `semantic:` prefix, two processes in one collaboration with two message flows, lanes `Key account manager` / `1st level support` / `2nd level support` / `Software developer` (none known), plain `task`, send and receive tasks, an inclusive gateway, a `callActivity` to a `globalUserTask`, an error boundary event, `itemDefinition` / `message` / `error` root elements, and a data store read through `ioSpecification`. |

## Hostile files (`hostile/`, F-B10)

Each one must be refused by the reader, or neutralised in the case of markup in text. `hostile.test.ts` pins the error codes of
`tools/bpmn-validate.mjs` for each file. The size and element-count limits are tested on files the test generates. They are not
checked in.

| File | Attack | Expected |
|---|---|---|
| `xxe-external-entity.bpmn` | `<!DOCTYPE>` with an external entity (`file:///etc/passwd`) | refused: `doctype`, `entity` |
| `xxe-parameter-entity.bpmn` | external parameter entity (remote DTD) | refused: `doctype`, `entity` |
| `billion-laughs.bpmn` | nested entity expansion (10⁹ "lol") | refused: `doctype`, `entity` |
| `processing-instruction.bpmn` | `<?xml-stylesheet?>` and `<?php?>` processing instructions | refused: `processing-instruction` |
| `deep-nesting.bpmn` | 70 nested sub-processes (schema-valid, depth 72 > 64) | refused: `too-deep` |
| `bad-id-syntax.bpmn` | ids starting with a digit, with a space, with a quote | refused: `bad-id` |
| `bad-id-duplicate.bpmn` | the same id twice | refused: `duplicate-id` |
| `bad-id-reserved.bpmn` | `__proto__` and `constructor` as ids (schema-valid) | refused: `reserved-id` |
| `bad-id-too-long.bpmn` | an id of 300 characters (schema-valid) | refused: `bad-id` (128 at most) |
| `html-in-names.bpmn` | `<script>`, `<img onerror>`, `javascript:` in names, documentation, CDATA and character references (schema-valid) | accepted as text, flagged `markup-in-text`; refused with `--strict` |
