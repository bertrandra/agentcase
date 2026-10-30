# Changelog

All notable changes to AgentCase, newest first. Product version from v19.0.0 = the `version` of
`app/package.json` (the single source, exposed as `APP_VERSION`); up to v18.13 = the `vX.Y` in the app file name (`AgentCase_vX_Y_EN.html`) and in
`window.AgentCaseArch.VERSION`.

- **v18.2 → v18.8** were reconstructed on 2026-10-21 from the `v18.x` tags in the code comments, help
  text and section markup of `AgentCase_v18_8_EN.html`; no release notes existed for them. No release
  dates are recorded in the code. `(L1234)` references point into `AgentCase_v18_8_EN.html`.
  *(inferred)* marks an attribution that is a reasonable inference rather than an explicit statement.
- **v12.57 → v18.1** are converted from the original release notes,
  [`docs/release-notes/AgentCase_ReleaseNotes_v12_57-18_1.html`](docs/release-notes/AgentCase_ReleaseNotes_v12_57-18_1.html)
  (dates are build dates). Golden-case figures quoted there predate the v18.5 Time Engine and the
  v18.6 spline default, which deliberately moved them (see docs/history/ARCHITECTURE_legacy_v18.md §11).

When releasing, follow [docs/BUMP_PROCEDURE.md](docs/BUMP_PROCEDURE.md) (§7 for the legacy file) and add the new version at the top.

## [Unreleased]

### BPMN B5b — the extended profile: data, events, volumes, rules, library, interfaces, diagrams

Phase B5b of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 17, F-B40–F-B61, D-B20–D-B23; details in § 17.10). Every figure of the 107 fixtures
unchanged: the default process holds none of the new elements.

- **Read, written, used.** Traceability graph (upstream, downstream, impact, orphans, missing inputs, per-norm completeness), data stores bound to
  tools ("agent blocked: no API"), deliverable states and types, multi-instance volumes, timers (cadence, waits, service levels), bounded loops,
  boundary events and reusable definitions, event sub-processes, compensation, conditional scope, the process library, formal assignment and
  lanes, message flows, multiplicity, conversations, annotations, several diagrams per file, colours.
- **Figures that follow the model** (custom content only): effort × volume of a multi-instance activity (D-B21), × occurrences of an event
  sub-process, × change-failure rate of a rollback; a call activity counts its library entry; no AI saving on a script task (D-B23); a rework loop
  takes the loop maximum of its agent activity; gateway conditions take activities out of the selection.
- **Safe FEEL subset** (`domain/feel`, D-B22): hand-written parser and evaluator, no `eval`; unary tests ready for the DMN tables of B7b.
- **Export**: file header (exporter version, `ac:` extension, documentation processes, F-B61); BPSim probability of boundary rework paths.
- **Import of foreign files** keeps what it does not map (definitions, events, gateways, flows, data, black-box pools, message flows, vendor
  extensions) instead of dropping it (F-B11).
- **XSD**: optional `ac:changeFailure` (F-B50).

### BPMN B5 — the engine reads the process model: custom activities, roles, agents and rework

Phase B5 of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 7, F-B18, F-B20, F-B22, D-B20; details in § 7.1). Every figure of the 107 fixtures unchanged.

- **Custom activities count.** The engine's artefact lists are the activities of the case's process document: an activity added with
  `process.addActivity` enters every figure with its phase, type, role, effort, value class, AI authority and supervision split.
- **Custom roles and agents.** A custom role is staffed by its team skill; a custom agent joins the agent directory, the agent count and the Agent
  Catalog sheet; the factory tags take the capability and type from the activity.
- **Rework from the model (D-B20).** Rework loops come from the back flows of the process, or from error boundary events carrying `ac:rework` that
  replace them (`pair`) or add a loop.
- **Portfolio.** A product's own process survives the parameters workbook round trip (the Overrides sheet carries the document).
- **Outputs.** A process with custom content adds a Process sheet to the results workbook and a "Delivery process" section to the critical report.
- **Tests.** Hand-computed reference figures per parameter; the one-source-of-truth equalities run on five process cases.

### BPMN B4 — the Process section: diagram, activity table, actors, BPMN import and export

Phase B4 of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 4.3, § 8, § 9; details in § 9.1). Single-product figures unchanged.

- **🧩 Process (BPMN)**, a new app section of the Scope group (Builder and Advanced by default): the case's process as a read-only SVG diagram
  drawn from its BPMN DI (zoom and pan with the keyboard, the buttons or the pointer; a live region names the selected activity), the activity table
  as its accessible alternative (sort; filters by phase, actor, type, scope, regulatory, text; scope check boxes), the selected activity's panel
  (name, phase, effort, supervision split, remove) and the actor panel (roles and agents, team skill, add a role, remove an unused one).
- **Import process (BPMN)** — replace or merge, with a preview before anything is written and a report after (added, updated, out of scope, removed,
  left out, parameters to review, new roles, elements not mapped, headline net / ROI / FTE after before and after). Files from other tools are mapped:
  their sub-processes, lanes or processes to phases, their unknown roles to new roles on a team skill the user picks (D-B10); the file's out-of-scope
  activities come in or are left out (D-B4). One undoable step; a refused or hostile file writes nothing. **Export** is also in the section, and
  **Reset to default process** (whole or one phase) is one step.
- New undoable commands `process.import`, `process.reset`, `process.moveActivity`, `process.setReworkFlow`, `process.setDiagram` (coalesced).

## [v20.23.0] 2026-10-30 — BPMN B6b: organisation model, RACI, Organisation and Who-does-what sections

### BPMN B6b — organisation model: units, teams, roles and RACI in the case's BPMN document

Phase B6b of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 16, F-B36…F-B39, decisions D-B15…D-B19; details in § 16.8). Every figure unchanged.

- **Organisation in the document**: organisation units (`ac:orgUnit` in the collaboration) and the RACI of each activity (standard
  `bpmn:resourceRole` Responsible / Accountable / Consulted / Informed plus `ac:raci`), written and read by `domain/org`; valid BPMN 2.0.2 + `ac:`.
  No new case key, no schema change; every persistence path carries them with the document.
- **Teams**: the products' entry teams and the shared team lines are read as teams of the organisation (derived view); proven identical to the
  effective team on every fixture. `teamIn` / `sharedTeam` stay the stored form in this phase (reasons in SPEC_BPMN § 16.8).
- **Checks** (F-B36, F-B37): no Responsible, several Accountable (errors); no Accountable, unknown role, role not staffed for a product, shared team
  over 100 % (warnings); Accountable to confirm, agent activity without a human Accountable (information, D-B18).
- **New sections**: 🏢 Organisation (unit tree, teams, role catalogue) and 🧭 Who does what (RACI matrix with filters, the views by activity,
  role, team, unit and product, the checks). Commands `org.addUnit`, `org.updateUnit`, `org.removeUnit`, `org.setRaci`, `org.clearRaci`, all undoable.
- **Organisation view** (F-B39, domain only): `organisationView(doc, org, product)` draws the process by organisation (lanes unit → team → role).

## [v20.22.0] 2026-10-30 — BPMN B3: schema v3, the case stores its delivery process as one native BPMN document

### BPMN B3 — schema v3: the case stores its delivery process as one native BPMN document

Phase B3 of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 6.1, § 6.2, § 9, decisions D-B1 / D-B26; details in § 6.4). Every figure unchanged.

- **File schema v3.** A case holds key `BPMN`, its process document: a node tree in memory, XML text in every saved file, HTML snapshot, autosave
  record and tab message. The nine version 2 scope keys (`selectedArtefacts`, `artefactsEdited`, `selectedRegArtefacts`, `regArtefactsEdited`,
  `phaseOff`, `selectedNorms`, `phaseSeq`, `regInclude`, `skillMap`) are gone from the case: migration 2 → 3 writes them into the document, and the
  engine, the screens, the Excel workbooks and the report read them as views of it (`scopeOf`). Version 2 files open with identical figures (the 107
  fixtures, compared figure for figure); save → open is identical; the undo history of an autosave survives the reload.
- **Normal form.** The scope lists are kept in document order and the artefact edits as the complete list (their order and shape never changed a
  figure); unknown ids and repeats are kept.
- **Commands.** Every scope command (artefact and phase selection, norms, industry, cross-cutting, regulatory inclusion, ramp-up sequences, % auto,
  effort, resets, skill map) edits the document; an undo step holds the changed attribute or element, not the document. New commands for the
  Process section of B4: `process.setScope`, `updateActivity`, `addActivity`, `removeActivity`, `addActor`, `updateActor`, `removeActor`, `addPhase`,
  `removePhase`, `reorderPhases`.
- **Portfolio.** A product overrides the process document as a whole (one "Process" override instead of up to nine scope keys); a version 2 portfolio's
  scope overrides become that override. The Overrides sheet writes it as the nine scope rows, which this build and older ones read back.
- **Tabs.** A tab of another file schema (older or newer) is ignored.

## [v20.21.0] 2026-10-30 — BPMN B2: reader / writer, F-B10 security, byte-identical round trip, BPSim, Export process (BPMN)

### BPMN B2 — reader, writer, byte-identical round trip, BPSim, "Export process (BPMN)"

Phase B2 of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 4.1, § 4.3, § 4.4, § 5.4; details in § 5.5). No schema change, engine untouched.

- **File menu → Export process (BPMN)…**: the active case as a `.bpmn` file (BPMN 2.0.2 + DI + `ac:` parameters + BPSim 2.0), optionally
  in-scope activities only (marked `ac:partial`). A portfolio offers the product shown, one file per product, or one file with one pool per
  product. File names carry the customer, the product and the date; the content is deterministic.
- **Reader** (`parseBpmnFile`, no store write yet): the F-B10 security checks on the raw text before any parser (DOCTYPE, entities, processing
  instructions, 5 MB, 100,000 elements, depth 64, safe ids), with the same rule table, codes and messages as `tools/bpmn-validate.mjs`; then
  `DOMParser` and the node tree. Round trip export → parse → write byte-identical on the 107 fixtures and the portfolio fixtures, views equal to
  the version 2 keys; foreign files (bpmn.io / Camunda, Zeebe, Signavio, OMG) keep every element, attribute, namespace and vendor extension.
- **BPSim 2.0**: official schema added to `docs/bpmn/omg/` (SHA-256 in `SOURCES.md`) and imported by the validation entry point; exports carry a
  derived scenario (processing time = effort, rework probabilities, team FTE per role), read back only where `ac:` values are absent.
- **F-B10 element limit raised from 20,000 to 100,000** (shared by the reader and `tools/bpmn-validate.mjs`): a 2,000-activity file (about
  25,300 elements) and a four-product collaboration file (about 26,400) now open; 5 MB, depth 64 and the DOCTYPE / entity refusal unchanged.

## [v20.20.0] 2026-10-30 — BPMN B0 and B1: extension XSD, OMG schemas, validator, sample files; domain/process with the default BPMN process and parity views

### BPMN B1 — the process model in the domain (no store, UI or schema change)

- **`domain/process`** (new zone `process-model`): the delivery process as a native BPMN 2.0 document held as an immutable XML node tree
  (elements, attributes in order, text, comments, namespace declarations kept) that serialises to the same bytes every time; typed reads
  (phases, activities, actors, flows, norms, diagram) memoised on the tree; derived views giving exactly what the engine reads today.
- **Default process**: `npm run process:gen` writes `app/src/domain/catalog/defaultProcess.bpmn` from today's catalogues (11 phases and
  Cross-cutting, 53 SDLC and 370 regulatory activities, 47 norms, roles, agents, 3 rework loops) with a deterministic diagram (lanes per team
  skill, phases left to right, Cross-cutting band). 414 KB raw, 35 KB gzipped; valid for `tools/bpmn-validate.mjs` (OMG XSDs, the `ac:` XSD
  and the profile, 0 error / 0 warning, tested); not in the application bundle yet. `npm run process:check` (run by `npm run check`) fails on any difference.
- **Parity gate**: `viewsOf(processFromCase(case))` equals the version 2 scope keys (selected artefacts, edits, regulatory selection, phases off,
  ramp-up sequences, norms, regulatory inclusion, skill map) on the 107 fixtures and on every product of the portfolio fixtures; the artefact
  lists, phases, norms and loop pairs read from the document equal the JSON catalogues.
- **`docs/bpmn/agentcase-bpmn-1.0.xsd`** (additive, 1.x rule): optional local attributes for the catalogue fields and case marks the
  views give back (`ac:phase order sdlc reg featureIds offRank rampSeq rampRank`, `ac:activity order scopeRank edited editRank`,
  `ac:supervision agent0`, `ac:norm count scopeRank`, `ac:actor regulatory capability`, `ac:rework order note activityA activityB
  external`, `ac:process regInclude sdlcEdits regEdits rampSeq skillMap` and its `ac:unmatched` children); `tKey` accepts parentheses.

### BPMN B0 — extension XSD, official OMG schemas, validator, sample and hostile files

Phase B0 of [docs/SPEC_BPMN.md](docs/SPEC_BPMN.md) (§ 5.3, § 11 items 3-5). No change to the app (`app/src` untouched).

- `docs/bpmn/agentcase-bpmn-1.0.xsd`: the schema of the `ac:` namespace (`https://agentcase.app/schema/bpmn/1.0`): 18 global elements
  (process model § 5.2, `ac:phase`, organisation § 16, audit § 15, extended profile § 17) and 9 global attributes (`ac:inScope`,
  `ac:partial`, `ac:regulatory`, `ac:norm`, `ac:activityType`, `ac:gate`, `ac:agent`, `ac:requiresState`, `ac:decisionRef`). No type has a
  wildcard, so every declared `ac:` element is validated strictly.
- `docs/bpmn/omg/`: BPMN20.xsd, Semantic.xsd, BPMNDI.xsd, DC.xsd and DI.xsd, downloaded unchanged from omg.org (URLs and SHA-256 in
  `SOURCES.md`, kept byte-for-byte by `.gitattributes`).
- `tools/bpmn-validate.mjs`: F-B10 security checks (no DOCTYPE, entity or processing instruction; 5 MB, depth 64, 20,000 elements; safe
  ids), then `xmllint --nonet --schema docs/bpmn/agentcase-bpmn-validate.xsd`, then the profile checks: an undeclared `ac:` name (which
  BPMN's `processContents="lax"` would skip) and an unresolved IDREF (which libxml2 does not check) are errors. It exits 1 on an
  invalid file.
- `app/fixtures/bpmn/`: two AgentCase profile samples, four hand-written imitations of foreign files (bpmn.io / Camunda 7, Camunda 8 /
  zeebe, Signavio, plain OMG), and ten hostile files. Their README says which files are imitations.
- Tests `app/tests/bpmn/samples.test.ts` and `hostile.test.ts`. CI (job `check`) installs `libxml2-utils` when the runner lacks it, and
  `npm run gates` mirrors that step. The schema tests skip locally without `xmllint`, and fail in CI.
- SPEC_BPMN § 5.2 corrected: `resourceRef` is a child element of `performer` / `humanPerformer`. `bpmn:definitions` has no
  `extensionElements`, so the document-level `ac:` elements go in the collaboration's.

## [v20.19.0] 2026-10-26 — Architecture lot 10: audit fixes, one source of truth for every figure, live Data Model, real 160-character limit

### Lot 10 — store, sync, persistence, layer lint

- **Multi-tab sync keeps one document.** Every broadcast now carries a document id (new at every open) and a revision; a patch lands only on the
  same document at the revision it was made on, never on another one. Opening a file, restoring a session or an autosave is broadcast whole: the
  other tabs replace their document and keep their own view (persona, edit and display scope, active product). A tab out of step resyncs on the
  whole document of the tab ahead; a patch that does not fit is refused (no crash) and the document is requested instead. Messages without a
  document id (older builds) are ignored.
- **Undo after another tab's change.** A remote change that adds, removes or reorders products or waves, or a replaced document, clears this tab's
  undo / redo (their steps address positions) and says so: "Another tab changed the products or waves: undo history cleared" (live region).
- **View state never undone.** Undo steps no longer carry view fields (active product, edit / display scope, persona): activating a portfolio
  snapshot in a Wave view keeps the Wave view, and undo / redo of it, or of File > Open, no longer move the view. Redoing an import keeps the
  product the tab shows.
- **Board dashboards** no longer show a Monte Carlo run made on an earlier version of the case: the Monte Carlo cards show a dash and the decision
  cards use their fallback run until a new run.
- **Autosave**: records are pruned to the 20 most recent after each save (they piled up, one per page load); a refused save (quota, blocked storage)
  is announced once instead of failing silently, and "Autosave this session" reports it. A record of an older file schema restores its document but
  not its history. The calculation packages stay in the record: the restore compares them (staleness banner).
- **Read-only product views** (aggregate drill-down) also stop pointer, drag and arrow / character keys, so a custom slider or Gantt bar inside
  cannot be moved. Deleting the persona a tab shows no longer writes the (derived) case it reads.
- **Layer lint**: the edit-base rule follows `const s = …getState(); s.doc`; the UI may not import `portfolioState`, `editBase` or the writable
  `simStore` / `pfSimStore`; dynamic `import()` is restricted like static imports; `src/content` and `src/generated` are data layers (read by the UI
  and the domain) and an import of an unclassified file is an error.

### Lot 10 — calculations (domain)

- Legacy flat curves: Monte Carlo outcome, `horizonYears` and cost reduction read the Time Engine over the whole horizon (DEV-LEGACY-CURVE-HORIZON).
- Sensitivity matrix: each of the 20 cells reruns the engine with the moved automation potential and glass ceiling (DEV-SENS-RERUN); the portfolio negative-cell count is now meaningful.
- Payback = the month after the last negative cumulative month, null when the final cumulative is negative (DEV-PAYBACK-RECOVERY; no single-product change).
- One displayed payback (`displayedPayback`): no setup = "immediate", ranked best by the strategies (DEV-PAYBACK-NOSETUP); one `fmtPayback`.
- Portfolio: stock measures (human FTE incl. run team, vFTE, adoption) held after a product's own horizon; `fte.after` read from the calendar series; cost reduction on the calendar basis; flow (time-to-market) NPV laid on the calendar and discounted from calendar month 1.
- Saved packages: `totalSavings` is net of setup at portfolio level too (was gross); files saved before stay valid; no crash on an empty product list; year-end cumulative read from the consolidated cumulative.
- One clamped horizon reader (`clampHorizonYears`, whole years 1..10): "0" / "-1" from a file no longer throws or diverges.
- `headlineOf` reads the engine totals (`total()`, `roi()`); scenario run-cost total `totRun` in the domain; registry Y2 variables n/a beyond the horizon (DEV-YEAR-BEYOND-HORIZON).
- Evidence ledger and DD sensitivity no longer read the clock in the domain: the evaluation date / timestamp is passed by the UI / controller.
- One "adds up to 100 %" rule (`domain/split.ts`, 0.5 point) for the UI, validation, file check and Excel readers (DEV-SPLIT-TOLERANCE).
- Dead code removed: `firstActiveMonth`, the duplicate `fmtPayback`, the portfolio package's own cumulative, the Results aggregate's ROI recomputation.

### Lot 10 — CI, tools and test infrastructure

- CI: the `app` workflow also runs on a change to `docs/**` (examples included), `README.md` or `CHANGELOG.md`, which the suite (docs facts, deviations,
  portfolio example) and the browser gates read. `npm run gates` (workflow-sync) now compares each step's `if:`, working directory and `timeout-minutes`
  with the workflows, not only the `run:` command, and runs an `if: success() || failure()` step after a failure, as CI does.
- `tools/ui-parity.mjs`: an element kind present in the legacy page and absent from every visited section of the new app fails the full run unless
  recorded as a `(element)` / `missing` exception (pinned: it drifts once the kind is back). The first run found three kinds (`table:td-right`,
  `table:td-center`, `table:th-right`) missing because the tool still looked for `style="text-align: …"`; the selectors now use the `ac-num` /
  `ac-center` classes, and the three are compared (0 divergence). No exception recorded (docs/DEVIATIONS.md DEV-UI-PARITY).
- `tools/perf.mjs`: a section switch is timed until the TARGET section's heading is shown (the previous section's `main h1` satisfied the old wait),
  an undo until the headline bar repainted (it was the key press plus a fixed 30 ms); a missing `app/perf-budget.json` fails instead of being written.
  New regression budgets `sizeRegressionMB` 3.08 / `gzipRegressionMB` 1.12 (1.15 x the build) under the hard 5 / 1.5 MiB ceilings; time budgets
  re-baselined with the existing rule (all at their floors: measured shell 345 ms, edit 20 / 38 ms, undo 38 ms, sections 207 / 114 ms).
- `tools/a11y.mjs`: after "Run" it waits for what only a simulation result renders and records a serious finding when it does not appear (the old
  wait matched any table and swallowed the timeout); it fails when the navigation is empty or when fewer sections were audited than nav entries found.
  Fixed waits replaced by state waits in `a11y`, `a11y-lib` (section active, no lazy placeholder; the transition settle of the audit is kept),
  `e2e-smoke`, `e2e-flows`, `parallel-run` and the app side of `ui-parity`.
- `npm run dup`: the baseline also stores one fingerprint per clone (the two files and a hash of the fragment, no line numbers); a clone not in the
  baseline fails even when the totals do not grow.
- `tests/size.test.ts` is one test listing every file over 150 lines (it generated one test per file, about 1,400); the documented test count is
  re-counted.
- Snapshot comparison: the "Current case" column follows an edit, an undo and a product switch (it subscribed to nothing and hid it behind an
  `eslint-disable`); `compareSnapshots` takes the subscribed case and product. Due diligence: a redundant dependency and its `eslint-disable` removed;
  the two remaining `exhaustive-deps` exceptions (`store/portfolioSimulation.ts`, keyed memos) carry their justification.
- Strategy ranking: the default radar selection is memoised, so the chart is no longer rebuilt on every render.
- chart.js: only the bar / line / doughnut / radar controllers, their elements, the category / linear / radial scales and the filler, legend, tooltip
  and title plugins are registered (`registerables` before); `dist/index.html` 2,809.46 kB → 2,798.23 kB (gzip 1,023.10 → 1,020.08 kB).
  `tests/ui/chart-registry.test.ts` checks every chart type and scale named in `src` against the registry.
- `vite.config.ts`: the comment on test timeouts says which tests raise the 5 s default and why.

### Lot 10 — Data Model and Calculation Engine sections

- **🗄️ Data Model describes the current data model**, every table read live from the code. New tabs: 🗂️ Document (portfolio, product,
  knowledge subset, wave, wave dependency, shared team line, hub: fields, required / optional, live value, meaning; file tags,
  `_schemaVersion` and the migration chain; common keys of note such as `PERSONA_APP_SECTIONS`, `THEMES` / `THEME_SEQ`, the opening persona),
  🎚️ Overridable keys (`OVERRIDABLE_KEYS`, form fields except the forbidden ones, the common-only keys incl. `MODEL` and so the discount rate,
  with how many products override each key now), 🔄 Document vs view (`VIEW_FIELDS`: what the real writer saves of them, measured; never
  undone, never broadcast; the autosave record fields and cap; the broadcast message kinds and fields with document id and revision),
  💽 Files & workbooks (formats, and every sheet of the parameters, results and cost-model workbooks from the writers' name constants, with
  the portfolio sheets' columns, `SharedTeam` and `Waves` included), 📦 Calculation packages (the live package's fields and which of them
  opening a file compares, measured on `samePackage`; per-product and portfolio packages).
- The four existing tables are live too: the variable registry is read from `domain/pdc/variables.ts` (the frozen copy
  `content/refshare/variables.json` is removed), the coefficients from `COEF_DEFAULT`, the namespaces from the document's `MODEL`; texts
  refreshed (no more "~82 keys"); the stale "v18.8" badge is replaced by the build's live version tag (also in ⚙️ Calculation Engine).
- Runtime twins of the portfolio types (`domain/portfolio/fields.ts`, `FieldSet<T>`: a field added to a type without its twin, or with
  another optionality, fails `tsc`), `AUTOSAVE_RECORD_FIELDS`, `BROADCAST_KINDS` / `BROADCAST_FIELDS`, `PF_RESULT_SHEETS` (the portfolio
  results sheet names, now used by the writer). Read-only facts for the UI in `controllers/dataModel.ts`.
- **⚙️ Calculation Engine**: new 📏 Single sources tab (one headline owner, one cash-flow kernel, last-recovery payback, `displayedPayback`,
  default discount rate, split tolerance, horizon reader, portfolio consolidation, stress cut, portfolio scenarios / sensitivity), each with
  its owner module (from the generated `@owner` graph) and a fact computed live by the owner. Help text and function surface corrected
  (payback rule, thin pass ported, overlay set declared and tested, no runtime DEP graph); heading levels fixed (axe `heading-order`).
- Tests: `datamodel-layers.test.ts` (a portfolio with every optional field round-trips through the real writer and reader holding exactly
  the documented fields; every field has its meaning; autosave and broadcast carry only documented fields; type-level exhaustiveness),
  `datamodel-tabs.test.tsx` (every tab axe clean in both sections, live counts follow an override, both sections under a Portfolio view).

### Lot 10 — one source of truth (every figure computed once in the domain)

- **One setup breakdown.** `setupBreakdown` lists the four editable lines, the HRI change cost and the Knowledge hub setup; its total is the setup of
  the ROI (the model's drivers read it). The Agentic Setup total (golden €135K → €225K, "Editable lines" €135K kept), the Financial Investment table,
  the Excel Investment sheet and the portfolio Setup view now add up to their total (DEV-SETUP-BREAKDOWN).
- **One human-FTE definition.** `fteBeforeAfter` (delivery team + agentic run team; freed never negative) feeds Financial, Results, fte-vfte, vFTE
  overview, KPI, team-out, the story, the engage plan, the registry and the Excel Savings sheet (golden freed Y3 11.3 → 9.0, Results residual 3.8 →
  6.0 = 3.8 delivery + 2.3 run team) (DEV-FTE-ONE-DEF). The target team adds the run team of the horizon end year (DEV-TEAM-RUN-END).
- **Engine years everywhere.** The baseline-drift card, the supervision capacity table, the registry Y1 / Y2 savings and run cost, the verification-tax
  amounts and the Results yearly savings read the Time Engine years of the horizon (Results: "= €891,555 total savings / yr", the decomposition
  reconciles to it, DEV-RESULTS-ENGINE-SAVINGS).
- **Owners for the rules the screens repeated.** Glass ceiling (`model().ceiling`, DEV-GLASS-CEILING-OWNER), the verification-tax cap
  (`COEF.vtaxCap`, DEV-VTAX-CAP), the maturity bounds (`maturityBounds.ts`: S-curve readout, bands, legends, DEV-MATURITY-BOUNDS), AI authority
  order, AI skill premium, HRI bands, posture and margin bands, lifecycle factor bands, risk bands, operating-model ratios, decision thresholds,
  commercial thresholds (the recommendation now reads the Monte Carlo confidence, DEV-CM-CONFIDENCE), Monte Carlo defaults, histogram bins,
  due-diligence gauges, escape / utilisation / DORA tolerances, the token-mix split rule, the blended day rate, line cost and FTE by skill, team
  coverage, the fit-to-scope rule and the economics view's per-year net, cumulative, run delta and averages.
- **Dates from the UI.** The roadmap and the "now" marker of the automation chart take today from the UI (`useEvalDate`); the domain never reads the
  clock.
- **Guard tests.** `tests/domain/sot-cross-surface.test.ts` asserts on the 107 fixtures that every surface prints the owner's setup (lines add up
  to `model().setupTotal`), FTE before / after / freed / reduction, net, ROI, payback, total benefit and end-year savings, and on four fixtures that
  the Excel results workbook does; `tests/ui/sot-screens.test.tsx` checks the rendered screens; `tests/domain/lot10-sot.test.ts` asserts each new
  rule.

### Lot 10 — line length (D1: the 160 limit is real)

- **`max-len` 160 no longer exempts literals.** `ignoreStrings`, `ignoreTemplateLiterals`, `ignoreRegExpLiterals` and `ignoreUrls` are gone (each
  exempted any line that merely contained such a literal or a URL, so 1,266 lines of `src` and `tests` over 160 characters reported 0 warnings).
  Comments count too. The one exemption left is a line that is nothing but a URL (`ignorePattern`). `npm run lint`: 0 errors, 0 warnings.
- **Every line of `app/src` and `app/tests` is at most 160 characters** (1,266 lines before, 0 after): lists, JSX attributes and children,
  conditions and chains wrapped at their natural break points, long string and template literals split with `+`. No behaviour change: every
  reformatted file compiles and minifies to the same output as before (JSX text included), ui-parity 0 divergences.
- Two test files would have passed 150 lines: their data tables moved to `tests/helpers/vueTuneCases.ts` and `tests/helpers/modelEngineSpecs.ts`;
  the shell tests' common start (`tests/helpers/shellReset.ts`) replaces a clone that the wrapping made visible. Duplication baseline 66 clones /
  496 lines (was 68 / 501; recorded with `npm run dup -- --update`, one fingerprint changed because its block moved into the new helper).
- `tests/lint-rules.test.ts`: a 161-character line holding a string, a template or a regex literal, or a long comment, is reported; 160 is not; a
  line that is only a URL is exempt, code holding a URL is not (the former "a long string: only the hard limit applies" assertion now asserts the
  warning).

## [v20.18.1] 2026-10-25 — Architecture lot 9: tidy-up (no change to the app)

- `tools/a11y.mjs` writes its default report to `test-results/a11y/report.json` (git-ignored): a local audit no longer rewrites a tracked file.
  The stale committed `app/a11y-report.json` (it still listed the false colour-contrast finding fixed in v20.17.0) is removed; no test or tool read it.
- Test for the last untested error path of lot 8: a parameters workbook pinning an unknown artefact, or one artefact twice, to a shared team line
  is refused before any write (`tests/store/shared-team-pins.test.ts`).

## [v20.18.0] 2026-10-25 — Architecture lot 8: dev toolchain with 0 audit findings, Node 24 CI actions, portfolio sensitivity, pins on shared team lines, "apply to all" for the knowledge subset

### Lot 8 — dev toolchain security

- `npm audit` in `app/` is clean (was 8 dev-only advisories: 2 critical, 1 high, 5 moderate; the shipped HTML was already clean and its
  production dependency tree is unchanged): Vite 5 → 8, Vitest 2 → 5 (no more tinypool), vite-node 2 → 6 (now a direct dev dependency),
  @vitejs/plugin-react 4 → 6, vite-plugin-singlefile 2.3.3, eslint-plugin-boundaries 4 → 7.2.1. Same 17,179 tests; the single offline HTML,
  its CSP, the gzipped ExcelJS payload and `__APP_VERSION__` are unchanged in behaviour.
- The layer rule is now `boundaries/dependencies` (v7 policies; the entry `src/main.tsx` is a file descriptor): the same allow matrix
  ui → controllers → store → domain, checked cell by cell against the old configuration.
- CI: actions `checkout`, `setup-node` and `upload-artifact` v4 → v6 (Node 24 runtime; GitHub deprecated the Node 20 actions).
- Housekeeping: finished agent worktrees removed.

### Lot 8 — the last documented portfolio gaps (DEVIATIONS.md DEV-PF-GAPS now lists none)

- **Portfolio sensitivity.** With Show on Portfolio or a Wave, the Sensitivity section opens on a portfolio tornado: each Monte Carlo driver
  (automation potential, ramps, glass ceiling, tokens per artefact, infrastructure cost) moved down and up by the same relative step (±5 / 10 / 20 %,
  view state) on every product, each product rerun on its effective case, laid on the calendar and summed by the consolidation kernel like the
  portfolio scenarios (`domain/portfolio/aggSensitivity.ts#portfolioSensitivity`, memoised per product run). Ranked by swing on the net; net and NPV
  at −step / +step; breakdown by product for the three largest swings. One product = its own tornado (`domain/stress/tornado.ts#productTornado`).
  The product view is unchanged.
- **Pins on a shared team line.** 📌 on each line of Products > Shared team lines: pin artefacts (one, or a whole phase) to the line; they go to
  every holder's share row (FTE × share) and leave its auto pool, like the pins of a team row. Undoable (`sharedTeam.setPins`,
  `sharedTeam.clearPins`); kept in the portfolio file (optional `pins`, repaired on open) and in the parameters workbook `SharedTeam` sheet
  (column H, export and import). The Input team shows the pin count on the read-only Shared row. Absent = the previous behaviour.
- **"Apply to all products" for the knowledge subset** (spec F7): the subset fields held by the common case (hub use, maturity answers, target CC,
  curation, setup base) get the button next to "Revert to common"; the value becomes the common one and identical subset values are dropped, in one
  undo step (`product.applySubsetToCommon`). Domains and preparation months keep "Revert to common" only (no common value).
- Single-product behaviour unchanged; no schema version change.

## [v20.17.0] 2026-10-25 — Architecture lot 7: portfolio scenarios, wave dependencies and setup capacity, shared teams, stress cut at the horizon, Wave histogram, assignable app sections, palette from logo

### Lot 7 — dependencies between waves and transformation-team capacity (SPEC_MULTI_PRODUIT F13, was DEV-PF-GAPS)

- A wave may **start after another wave**: after it starts, or after its last product finishes setup, plus a lag in months. Effective start =
  max(own start, dependency-derived start). A choice that would close a cycle is refused; a cycle read from a file is flagged and ignored.
- Optional portfolio parameter **max products in setup at the same time**: later products (wave order, then board order) are pushed back; every
  push and every delayed wave is a diagnostic (Waves "Schedule" checks, Consolidation diagnostics, report, results workbook).
- One owner, `domain/portfolio/waveSchedule.ts` (pure), read by `scheduledProducts`: consolidation, Gantt (dependency marker), KPI bar, stress,
  Excel and report all use the effective starts. Undoable commands `wave.setDependency` and `portfolio.setMaxConcurrentSetups`; keyboard-accessible
  controls in the Waves section; the parameters workbook carries both (Waves columns F-H, PortfolioSettings row). Both fields are optional:
  without them the calendar is unchanged; no schema bump.

### Lot 7 — portfolio stress: per-draw horizon truncation, Wave-view histogram

- **Portfolio stress: per-draw horizon truncation** — each draw of each product is placed on the calendar (wave start + offset) and cut at the
  portfolio horizon exactly as the deterministic consolidation does (`domain/portfolio/stressCut.ts`), before the draws are added; a product starting
  at month 48 of a 60-month portfolio counts 12 months. With zero spreads every draw equals the consolidated net. A product inside the horizon draws
  exactly what it drew before (single-product runs unchanged; same seeds, same ρ). DEV-PF-STRESS updated, row removed from DEV-PF-GAPS.
- **Monte Carlo histogram in the Wave view** — the Monte Carlo aggregate view draws the histogram of a Wave from its products' draws added draw by
  draw (`WaveStress.outcomes`), with the same chart component as the Portfolio (shared `SelectionHistogram`). Row removed from DEV-PF-GAPS.

### Lot 7 — portfolio scenarios table (DEV-PF-GAPS)

- Scenarios, Portfolio / Wave view: a new **Portfolio scenarios** table sums the six scenarios over the products in view on the portfolio calendar
  (setup, savings, net, NPV at the common rate, ROI, payback month), with an expandable breakdown by product (net and NPV, total line from the domain).
- Domain: `portfolioScenarios(pf, ids)` (`domain/portfolio/aggScenarios.ts`) runs each product's scenario engines (`scenarioEngine`, extracted from
  `scenarioModel`; `scenarioDefs` lists the six scenarios) through the consolidation kernel (`productSeries`, `aggregate`, `summarize`): shifted by the
  product's month 0 and KT lead, truncated at the portfolio horizon. Engines memoised per product run; the table memoised per consolidation and selection.
- With one product the table equals the product's scenarios; "AI + Location" equals the deterministic consolidation. Single-product figures unchanged.
- Docs: DEV-PF-GAPS row removed, DEV-PF-STRESS, SPEC_MULTI_PRODUIT F20 / P6, ARCHITECTURE § 12, MIGRATION_PLAN § 15.6, VUE_AGREGEE updated.

### Lot 7 — app sections assignable per persona, palette from logo
- **App sections are assignable** (DEV-APP-SECTION-PERSONAS): 🎨 Brand & theme can now be added to or removed from any persona in Persona management
  (Section assignment, Persona layout double-click, Sync menu to sequence), like any section. The choice is stored in the new optional case key
  `PERSONA_APP_SECTIONS` (per persona, per app section: shown or not), never in the legacy-shaped `PERSONA_SECTIONS`; absent = the catalogue default
  (Admin, Builder, Business journey), i.e. the previous behaviour. Command `persona.setAppSection` (undoable); edited back to the defaults, the key
  disappears. The protected Advanced persona always sees every section (the way back). Parameters workbook, parallel run and excel-compat unchanged.
- **Palette from logo** (DEV-BRAND-THEME, docs/THEME.md §8.10): with a customer logo set, the one-colour generator of a user theme offers
  "🖼️ Palette from logo". The logo's dominant non-neutral colours (pure `domain/theme/logoPalette.ts`; transparent, near-white, near-black and grey
  pixels ignored, close shades merged) feed the generator with its contrast slider and harmony as one undoable `theme.generate` step; the other colours
  found are offered as buttons. The canvas is isolated in `ui/brand/logoPixels.ts`; nothing is fetched (the logo is a data URL already).

### Lot 7 — shared teams across products (DEV-PF-GAPS, SPEC_MULTI_PRODUIT F2 / §9)

- Portfolio field `sharedTeam` (optional; absent = the previous behaviour, files and figures): team lines shared between products with a share per
  product in percent. `domain/portfolio/sharedTeam.ts`: `effectiveTeam` appends FTE x share to a product's effective team (rows marked `shared`,
  memoised, the product's own `teamIn` itself when it holds no share); `resolveProduct`, the hub allocation by headcount, the wave board, the input
  summary and the team aggregate read the effective team, so a line with shares <= 100 % is counted once in the portfolio.
- Validation: errors for a bad line (id, labels, FTE < 0, share outside [0, 100]); diagnostics `shared-over` (shares > 100 %) and `shared-orphan`
  (share of a deleted product). Deleting a product drops its shares in the same undo step.
- Undoable commands `sharedTeam.add`, `sharedTeam.edit`, `sharedTeam.remove`, `sharedTeam.setShare` (`controllers/sharedTeam.ts`); the address
  layer never writes a shared row into a product's own team, and the whole-team actions of Input team act on the own rows.
- Products section: "Shared team lines" table (labelled selects and number inputs, allocated total, over-100 % status, clearing a deleted product's
  share); Input team shows the active product's share as a read-only "Shared" row.
- Persistence: portfolio snapshot read / repair of `sharedTeam`; parameters workbook `SharedTeam` sheet (export and import, one row per share).
- Tests: `tests/domain/portfolio/sharedTeam.test.ts`, `tests/store/shared-team.test.ts`, `tests/store/samples/sharedTeam.ts`,
  `tests/ui/portfolio-team.test.tsx` (Products table and the read-only row of Input team).

## [v20.16.0] 2026-10-25 — Architecture lot 5b: inline styles to CSS classes, max-len 0

### Lot 5b part A — frame, baseline, scope, tune and verify sections: named classes instead of inline styles, no line over 160 characters
- **Inline styles → CSS classes** (decision D5): the static `style={{…}}` props of the frame, baseline, scope, tune and verify sections (and of their
  aggregate views) became semantic classes (`.ac-home-card`, `.ac-roadmap-stage`, `.ac-gantt-row`, `.ac-readiness-gauge`, `.ac-lc-cell`, …) in the new
  `app/src/ui/theme/sections-a.css` (imported once from `main.tsx`), on theme tokens only — borders use the border-width tokens, so the shape axes now
  reach these sections too. A colour chosen from the case is a `data-tone` attribute (the role name) mapped to `--tone` once in that file, then used by
  the text, bar, border and row-highlight rules. 202 inline styles → 31: 28 genuinely dynamic (a place or length on a calendar or a bar, a series colour
  resolved in JS, a computed alpha tint), each marked `dynamic:`; 3 on the shared `CommitNumber` widget, which takes no class yet. Computed styles are
  unchanged: every element of every section (golden and the portfolio view, toggles expanded) compares equal before and after, and ui-parity stays at 0.
  New guard `tests/ui/sections/inline-style-a.test.ts`: every remaining inline style of these sections says why (`dynamic:` / `shared widget:`), at most 31.
- **Long lines** (decision D1): every line of these sections, their aggregates and their tests is at most 160 characters (475 source lines and 16 test lines
  were longer; the scope's `max-len` warnings go from 172 to 0) — prose re-flowed, long notes and labels as constants, JSX attributes wrapped, small
  components extracted (`GroupCard` on Welcome, `TargetRow`, `RateCell`, `BucketPanel`, the Gantt `Marker`, `Legend` and `Release`). The emitted JavaScript of
  the pure re-wrapping steps is byte-identical to before.
- Tests: four tests read the inline style of an element and now read its `data-tone` / `data-edited` attribute or its class instead (loc-strat,
  scope-sel, quality, gantt ticks); no behaviour, text, number or accessible name changed.
### Lot 5b part B
- **D5, inline looks become theme classes** in the shell, the widgets and the sections of Economics, Stress, Verdict, Defend, Present, Reference & share,
  Configure, Factory, Model engine, Portfolio and the Verify bodies (`ui/sections/verifyA`): every `style={{…}}` of that scope is a semantic `.ac-<area>-<thing>`
  rule of the new `app/src/ui/theme/sections-b.css` (theme tokens only, imported once by `main.tsx`), written specific enough to win where the inline value
  won. A value that is data stays on the element as a local custom property `--dyn-*` (`ui/cssVars.ts`: a share, a caller-chosen size, a colour of the case,
  a theme colour computed for contrast), with a `// dynamic:` comment; the theme tokens stay `--ac-*` (each one a name of the token table). Domain colour roles
  arrive as `data-tone` / `data-bg-tone`, named inks as `data-ink`, signs as `data-sign`. Computed styles of every section and tab (golden, a three-product
  portfolio in product and portfolio scope, fm-demo; simulation run, selected graph node) are unchanged before / after, apart from `text-align: left` → `start`
  on default-aligned cells (same rendering).
- **Widgets**: `DataTable` / `AggregateTable` / `SimpleTable` alignment is a class (`ac-num` right with the figures font, `ac-center`; `widgets/align.ts`);
  `CommitNumber` and `LazySelect` take a `className` (their `style` prop still works); `NumCell` / `TextField` widths and `ChartPanel` heights are custom
  properties; new `PlainNumber` field (shared by `NumberInput` and `CoefInput`). `SimpleTable` rows take a `className` instead of a `style`.
- **D1, no line over 160 characters** in `app/src`, `app/tests` and `app/scripts` outside part A: one JSX attribute per line, one statement per line for
  one-line blocks, prose and comment paragraphs reflowed, never minified; every reformatted file compiles to the same code (esbuild output compared file by
  file). Lines ESLint exempts (long string, template and URL literals) and the generated `axes.css` / `tokens.css` / the embedded fonts are unchanged.
- **Theme**: new `shadow-ring` token (the 1 px slate milestone ring); the hard-coded-style guard accepts `var(--ac-shadow-*) var(--dyn-*)` (a shadow token's
  geometry coloured by a value of the case).
- **Fixed**: the Section Dependencies side panel nested a `<details>` in a `<p>` (React `validateDOMNesting` warning, invalid HTML): the Feeds / Fed by
  relations are blocks now (same text, same look); `tests/ui/sections/deps.test.tsx` asserts it. The test run has no React warning left.
- **Fixed**: `tools/excel-compat.mjs` reported every workbook different (67/67 at v20.15.0): it wrote the Portfolio and app sections the legacy page does not
  know (the app's own export uses the 79 case sections), compared the persona (view state of the tab since D3, not a key of the case) and replayed the
  imports on a default case with the Business journey persona the legacy pristine page never had. It now compares like `tests/helpers/excelParams.ts`:
  67 identical. `--no-mutations` without `--only` no longer reads it as a fixture id.
- **ui-parity**: an element carrying a section-local look of `theme/sections-*.css` counts as an override, as an inline style did (`LOOK_OVERRIDES`,
  `LOOK_TYPOGRAPHY` in `tools/ui-parity-kinds.mjs`), so the comparison keeps measuring the same plain elements.
- **Tests changed for pure DOM refactors**: `nav.test.tsx` (rail colour read from `--dyn-group-color`), `no-remount.test.tsx` (glossary ink from
  `--dyn-gloss-ink`), `strategies.test.tsx` and `montecarlo.test.tsx` (edited inputs carry `is-edited`, the Σ check `data-sign`), `parity-widgets.test.tsx`
  (DataTable alignment classes), `no-hardcoded-style.test.ts` (the shadow-plus-value case, positive and negative).

## [v20.15.0] 2026-10-24 — Architecture lots 5a and 6: theme state out of the domain, no remount, selector hooks, compressed Excel library; every quality gate in CI, nightly workflow

- ui-parity: the header title width is no longer compared (it follows the title text and the fonts of the machine: 197.8 px locally, 195 px on the GitHub runner); its pinned exception is removed.

### Architecture lot 6 — CI covers every quality gate
- **New CI job `browser`** (`.github/workflows/app.yml`, after `check`, in parallel with `e2e`): `tools/ui-parity.mjs` (shell of 3 personas and section
  content against the legacy file; fails on any divergence that is not a recorded exception, or an exception whose pinned value drifted) and `tools/a11y.mjs`
  on `golden`, `pf-three-products`, `golden --mode dark` and `golden --mode dark --contrast high` (fails on any serious / critical violation or a count above
  `app/a11y-budget.json`). The four reports are uploaded (`a11y-reports`); on failure, the screenshots of the violating states, the UI-parity screenshots and
  `divergences.json` too (`browser-gate-screenshots`). Each gate writes a short summary to the run page. The workflow now also runs when `tools/**` or the legacy
  file change, and reads the repository only (`permissions: contents: read`).
- **New nightly workflow** (`.github/workflows/nightly.yml`, 02:17 UTC and *Run workflow*): `npm run check` three times in a row with the default timeouts
  (`tools/check-repeat.mjs`: which test failed in which run, *flaky* or *failing*, JUnit reports attached), the documented test count against the suite
  (fails beyond 2 %, with the hint `npm run docs:facts -- --count-tests`), the parallel run on the full corpus (40 workbooks + 107 case files), `npm audit
  --omit=dev`, and in a parallel job `npm run validate:affected` (fails if recall < 100 %; limit 3 h 45 min). Every gate runs even after an earlier failure;
  the results are in the job summaries. No issue is opened.
- **`npm run gates`** (`tools/gates.mjs`): every step of the pull-request workflow, in the CI order, with a table of results and times (`-- --nightly` for the
  nightly ones, `--keep-going`, `--only`, `--from`, `--install`, `--list`, `--affected-only` to sample `validate:affected`). Its first row, `workflow-sync`,
  fails when its step list and the `run:` lines of the workflows differ, so the two cannot drift apart.
- `tools/parallel-run.mjs --corpus full` adds the 107 case files; the two DEV-SNAPSHOT-RESTORE differences (`curve-bass`, `curve-legacy`) are pinned line for
  line in `tools/parallel-run-known.json` and reported as `KNOWN`; any other difference, or a change of a pinned one, fails.
- `tools/a11y.mjs`: `--report <path>` / `--no-write` (the committed `app/a11y-report.json` is never rewritten when `CI` is set), `--shots <dir>`, failing
  rules name the pages they occur on, and the report records the display mode. `tools/a11y-lib.mjs` falls back to the app's own Playwright (it required
  `/opt/node-tools` or `PW_MODULE`, so it could not run on a CI runner). `tools/ui-parity.mjs --shots` also writes `divergences.json`.
- Docs: [BUMP_PROCEDURE.md](docs/BUMP_PROCEDURE.md) §4.2 (reproduce CI with `npm run gates`), §6 (the three jobs and the nightly), checklist;
  [TEST_SELECTION.md](docs/TEST_SELECTION.md) §1 and §5 (`validate:affected` runs nightly, sampling with `--only`); README; DEVIATIONS.md DEV-SNAPSHOT-RESTORE.
### Lot 5a — theme out of the domain, no remount on a display change, selector hooks, ExcelJS stored compressed

### Changed
- **No theme state in domain or store.** `domain/theme` no longer holds a "current theme" (`setActiveTheme` / `setDisplayTheme` / `setActiveThemeDef`,
  read by `tok()` in 16 domain and 2 store modules, so a read-out or an export depended on whatever theme had been set last). A pure resolver
  (`domain/theme/resolve.ts`: `resolveAppTheme(def, spec)` → `tok()`, `list()`, `alpha()`, `values`, `base`) feeds the only runtime theme state, in the
  UI: a React context (`ThemeProvider` around the shell, `useTheme()`, `useRoles()`) and the custom properties on `<html>`. Domain read-outs that only
  choose a colour meaning return a **role** (`tone: 'danger-800'`: risk, verdict, readiness, HRI, eligibility, scenarios, sensitivity cells, Gantt,
  pipeline timeline) that the UI resolves; chart builders take `tok`. The exports take their print theme from the controller
  (`controllers/exportTheme.ts`: the case's theme, or the `?theme=` link's, always light): `argb(print, …)`, `reportStyle(print)`, and every workbook
  builder receives it. Guard: `tests/domain/no-module-state.test.ts` (no module-level `let` in `src/domain`; module-level caches allowlisted with a
  reason; no import of the UI theme runtime from domain / store). The `?theme=` override state moved to `store/themeView.ts` (the exports read it).
- **A display or theme change no longer re-mounts the open section.** The section host is not keyed by a display version any more: dark, contrast,
  colour-blind, reduced motion and theme presets keep the selected tab, drafts and the scroll position; components that compute a colour re-render,
  CSS follows the custom properties, and chart.js charts are updated in place (`chart.update('none')`). `tests/ui/no-remount.test.tsx`.
- **Fewer re-renders on an edit.** Selector hooks with structural equality (`useDocSelector`, `useCtxSelector`, `usePortfolioSelector`,
  `store/equal.ts`) for the KPI bar (memoised tiles), the section host (`useViewKind`), the top bar (undo / redo isolated), the scope banner, the money
  views (`useEconomics`), the verify views, the scenarios and the aggregate result views. Components rendered by one edit, 12 measured cases: 706 → 415
  (an edit that changes no figure, on Financial: 108 → 8), kept by budgets in `tests/ui/render-cost.test.tsx`. `tools/perf.mjs`: edit → KPI repaint
  median 21-22 → 16-18 ms, p95 32-35 → 25-31 ms.
- **ExcelJS stored compressed in the single file (decision D5).** ExcelJS's browser bundle is embedded gzip-compressed (base64, 342 kB instead of 940 kB
  of code) and started on the first Excel import or export (`DecompressionStream`, then an inline script removed at once, allowed by the existing
  `script-src 'unsafe-inline'`: no `blob:` source added). `dist/index.html` 3,279,804 → 2,682,700 bytes, gzip 992,033 → 979,213 bytes, time to the
  shell 586-620 → 317-345 ms. Checked on the built app by `tools/e2e-flows.mjs` (nothing of ExcelJS in the page before or after an export) and
  `tools/parallel-run.mjs` (40 workbooks identical).

**Golden case:** unchanged (ui-parity 0 divergences, parallel run 40 / 40 identical).

## [v20.14.0] 2026-10-24 — Architecture lots 1 and 4: robustness (error boundaries, CSP, audit, lint), one cash-flow kernel, acyclic zone graph, pilot in cost-model totals

### Tests
- `tests/store/portfolio-undo.test.ts` "jumpTo reaches every intermediate state" failed for one random seed (found by fast-check): after undo / redo, an override object's keys came back in another order (Immer re-adds a removed key at the end). The content was identical. The portfolio comparison helper `docOnly` now serialises with sorted keys, and the failing seed is pinned as a regression case.

### Lot 1 — robustness

### New
- **Error boundaries.** A display error no longer blanks the page. Around the whole shell: a minimal page "AgentCase hit an unexpected error" with
  **Reload** and **Copy details**, which writes the autosave at once (the reload offers to restore it). Around the section in the work area: "This
  section failed to display" with **Try again** (remounts the section, retrying its lazy module) and **Copy details** (app version, section id,
  message, stack, component stack); the menu, KPI bar and other sections keep working, and opening another section resets it. Around every chart:
  a note in the chart's place, the rest of the section renders. Errors go to the console and to a session list in the dock ("History (n) · 1 display
  error"). `tests/ui/error-boundaries.test.tsx` (axe included).
- **Content-Security-Policy.** The single HTML file declares `default-src 'none'` with inline script and style, `data:` / `blob:` images, `data:` fonts,
  `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`: the page can load nothing from the network. HTML snapshots carry it; the reports carry
  a stricter one (no script). `tools/e2e-smoke.mjs` fails on any CSP violation; the new `tools/e2e-flows.mjs` (CI job `e2e`, `npm run e2e`) drives
  JSON / HTML snapshot round trips, the report, the three workbooks and the import, Monte Carlo, display and case themes, PNG / SVG logo and a
  `?theme=` link under the policy, after a probe that proves a network image and a `fetch` are blocked. `frame-ancestors` cannot be set by a meta tag
  (docs/ARCHITECTURE.md §9).
- **Lint.** `local/hard-max-len`: a source line over 300 characters is an error; `max-len` 160 is a warning (long literals and URLs excepted;
  979 warnings remain). The UI and controller import restrictions also match relative paths (`../store/core`, `../../store/persistence/…`, `../store/hooks`),
  with probes in `tests/lint-rules.test.ts`.

### Changed
- **Readability (decision D1):** the 78 source lines over 300 characters (longest 796, `tune/lifecycle-edit`) are gone: JSX prose is wrapped (the
  compiled output of those files is token-for-token identical), long code is split into constants, helpers and small components (due-diligence cells,
  provenance tiles, Gantt milestones, the default card read from the "Dynamic Section Cards" sheet, the Glass Ceiling formula shared by both reports).
- CI job `check` runs `npm audit --omit=dev --audit-level=moderate`.

### Fixed
- **`npm audit --omit=dev`: 2 moderate advisories → 0.** ExcelJS 4.4 pulls `uuid` 8 (GHSA-w5hq-g745-h8pq); `overrides` pins `uuid` `^11.1.1`, which
  ExcelJS's Node build accepts (every Excel test and the parallel run pass). The browser bundle uses ExcelJS's pre-built copy, which calls only `v4()`.

**Golden case:** unchanged.
### Lot 4 — one cash-flow kernel, acyclic zone graph, case-file parity explained, pilot in the cost-model totals

### Changed
- **One discounted-cash-flow kernel** (`app/src/domain/economics/cashflow.ts`, zone *time-engine*): `cumulativeOf`, `paybackMonthOf` (first month >= `firstMonth`
  whose cumulative is >= 0), `npvOf` (monthly (1 + r/12)^t, or annual (1 + r)^(t/12) compounding), `discountFactor`, `roiCanonical` and `cashflowSummary`, plus
  the single `DEFAULT_DISCOUNT_RATE` (0.08). It replaces the six inline loops of `time/engine.ts`, `time/thin.ts` (Monte Carlo through `model/mcs.ts`),
  `portfolio/headline.ts` (with its "not before the first movement" rule as `firstMonth`), `pdc/verifConvTime.ts` (legacy audit at 8 %), `model/flow.ts`
  (time-to-market value, annual compounding kept as a documented variant) and the cost-model discount factors; the 0.08 literals of `canonical.ts`,
  `verifConvTime2.ts`, `flow.ts`, `controllers/frame.ts`, `controllers/modelFlow.ts` and the engagement-context card now read the constant. The kernel owns
  the payback-month, NPV and ROI figures (catalogue and `figure-owners` updated; `economics/roi.ts` re-exports the rule). **No number changed**: a property test
  compares the kernel bit for bit with verbatim copies of the old loops on random cash flows (`tests/domain/cashflow.test.ts`), and a full-precision dump of
  payback, NPV (5 rates), cumulative, ROI, thin pass, Monte Carlo (200 draws), time-to-market value, convergence rows, calculation package and portfolio
  headlines of the 107 fixtures and two portfolios is byte-identical before and after.
- **Zone graph per layer, acyclic in the domain.** `npm run deps:gen` builds the zone links from what a module's own code imports in `src/domain` only;
  re-exports and pure barrels (re-export-only modules) are not uses (their edges stay in the import closure for test selection); the controllers' and store
  exports' zone links are reported apart (`outer`, 40 links). Modules retagged by role (no code moved except one function): the kernel (*time-engine*),
  `model/flow.ts`, `scope/scurveView.ts`, `pdc/verifTeam.ts`, `domain/index.ts` (*delivery-views*), `tune/maturity.ts` (*tuning-programme*), the portfolio
  knowledge views, diagnostics, teams and validation (*portfolio-consolidation*); `convChangeCost` moved from `engagement.ts` to its owner `model/drivers.ts`
  (the setup figure). The zone *verification-verdict* is split into **verdict** (decision verdict, strategies, results, evidence ladder, due-diligence
  register, portfolio verdict) and **verification** (logic checks and convergence rows), which removes the Board-registry cycle. Before: 112 zone links,
  one cycle of 15 zones, 25 feedback links. After: 91 domain links, **no cycle**, 13 layers, 0 feedback links (19 zones, 17 drawn). The Build order tab is a
  topological order and says so; `deps.test.tsx` fails if a cycle comes back.
- **Cost model (monthly) workbook: the pilot is included in the totals** (decision D4, DEV-COSTMODEL-PILOT rewritten). Each product has a dated line
  "Pilot (included in totals)": the Program & Completeness pilot sizing spread evenly over its weeks from the product's month 1 (`tune/program.ts`
  `pilotMonths`). Product, wave and portfolio totals include it; the app headline does not count the pilot (unchanged), so the check row is "Engine total +
  pilot" and the Difference rows stay 0; the sheet note and the Parameters row say so.

### Fixed
- **File > Open… (and Save / open > Open snapshot file) did not re-fit the automation potential** to the scope, unlike the snapshot panel and the legacy
  restore. Every open path now goes through `openParsed`. This was 1 of the 3 differences of the parallel run on the 107 case files (`lifecycle-pos-0`: 74 %
  after the re-fit, as the legacy); the other 2 (`curve-bass`, `curve-legacy`) are a legacy restore defect (its `scurve` setter drops the bass and legacy
  families) and are recorded in **DEV-SNAPSHOT-RESTORE** with the field-by-field evidence. Parallel run: 105 of 107 case files identical (was 104), 40 / 40
  parameter workbooks identical. Pinned by `tests/store/snapshot-restore-parity.test.ts`.

### Tests and validation
- Test selection re-validated after the generator change (`npm run validate:affected`, 19 mutations, 13 run, 6 trivially full: recall 100% at the precise and zone levels, 20 / 20 failing files, average saving 44% / 24%). See docs/TEST_SELECTION.md §5.

## [v20.13.0] 2026-10-24 — Architecture lots 0, 2, 3: CI green and stable, single version source and doc facts, state model hardening

### Fixed
- **`npm run dup` gave different numbers on a laptop and in CI.** jscpd's detection is incremental (the first file that holds a block owns it), so its result
  depends on the order it reads the files, and left to its own glob that order is the file system's directory order. Measured on the same tree: 25 to 27
  clones and 174 to 211 duplicated lines depending on the order. `app/scripts/dup.mjs` now hands jscpd an explicit, byte-sorted list of the git-tracked
  (and untracked, non-ignored) `.ts` / `.tsx` files of `src/` and `tests/`, never generated code, with every option pinned (`maxLines` / `maxSize` raised so
  no file is skipped silently), runs the installed binary (jscpd pinned to 4.0.5), records the jscpd version and settings in `app/dup-baseline.json`, and
  refuses to compare against a baseline measured with other settings. A fresh clone + `npm ci` reports the same numbers as the working tree. The CI
  failures of v20.7.0 → 20.10.0 were not noise: `fields.tsx` / `tuneA.tsx` held a real new clone (T3 control variants) that 20.11.0 removed by chance.
- **`deps-a11y.test.tsx` timed out (5 s) in CI and under load**, then failed its four other tests with "Axe is already running". Root cause, profiled:
  axe builds a unique CSS selector for every node it reports, passes included; on the dependency graph (~500 SVG siblings) and the matrix (~2,900 cells)
  the `:nth-child` part walks the siblings through jsdom's slow `HTMLCollection` proxy, ~80% of the run (1.8 s of 2.1 s on the graph tab). The shared
  helper `tests/helpers/axe.ts` asks axe for the violations only (`resultTypes`), chains the runs so one slow audit can no longer fail the next ones, and
  serves all 14 axe tests. The file runs one audit per test (graph alone, with a section selected, with a zone selected, each tab): the slowest test went
  from 6.2 – 7.5 s (3 failures in 5 runs alone) to ≤ 2 s alone and ≤ 4.2 s under a parallel full suite (20 / 20 green); `{ timeout: 15 000 }` is a margin.
- **`vue-exemplars` "Edit this product …" failed once in three full runs**: after the click, the product's section is a `React.lazy` module transformed on
  first import, and the test waited for it with the 1 s default of `findBy*`. Every wait for lazy content (the section, the read-only drill-downs of the
  vue-* tests) now uses `LAZY` from `tests/helpers/portfolioUi.tsx`, the budget `sectionReady` already used; the test timeout still bounds it.
- `theme-palette.test.ts` computes its 240-palette sweep once per file instead of three times (15.6 s → 5.7 s for the file).

### Changed
- **Duplicated code removed (src: 25 clones → 4, all four are import lists).** One owner each for: the Results verdict box, uncertainty band, savings /
  team-shift panels (`verdict/results/Parts.tsx`); the playback stage (`monthly-playback/Stage.tsx`); the Save / Open file buttons
  (`refshare/io/SaveOpenButtons.tsx`); the Monte Carlo stats cards (`StatsCards` with extra cards); Net / ROI / payback / NPV of a headline
  (`consolidation/CoreStats.tsx`); the calendar-year table (`consolidation/YearTable.tsx`); the nine headline tiles (`shell/HeadlineTiles.tsx`); the
  override chip (`OverrideChip`); the board editor table; the persona list cells; the strategy comparison; the Gantt calendar header; the Wave and phase
  columns. Domain: `mcRng` is `mulberry32` (one seeded PRNG), the product status label has one owner (`scope/lifecycleView`), the MCS evaluation uses the
  Time Engine thin pass, portfolio ids come from `newPortfolioId`, the parameters export builds the companion JSON once. Rendering and figures unchanged
  (golden, oracle, parity and UI parity suites).
- `npm run dup` scans `tests/` too; baseline **70 clones / 515 lines in 1,324 files** (src 4, tests 66: mostly mock / setup preambles).
- CI (`.github/workflows/app.yml`): a newer push to the same branch or pull request cancels the run in progress (`concurrency`); jobs time out after 45
  minutes; when the check job fails, the JUnit report of the suite (`app/test-results/`, written when `CI` is set) is uploaded as an artifact. Gates unchanged.
- Docs: BUMP_PROCEDURE "Before merge: CI green on the pull request"; TEST_SELECTION §7 on the deterministic duplicate check.

**Golden case:** unchanged.
— Versioning and documentation governance (architecture lot 2)

### Changed
- **One version source: `app/package.json`.** `app/vite.config.ts` injects it as `__APP_VERSION__` (Vite `define`, also for Vitest and vite-node);
  `src/domain/version.ts` exports it as `APP_VERSION` and no longer holds a literal. The `index.html` title is the placeholder `%APP_VER_TAG%`,
  filled at build time; `npm run release` names the artefact from the built title (`AgentCase_v20_12_EN.html` for 20.12.0, unchanged). A bump is
  now `npm version X.Y.Z --no-git-tag-version` + changelog + `npm run docs:facts` (docs/BUMP_PROCEDURE.md rewritten accordingly).
- **Patch versions.** One tag rule, `domain/versionTag.ts` (legacy `appVerTag()` semantics: one trailing `.0` dropped): `20.12.0` → `v20.12` /
  `v20_12`, `20.12.1` → `v20.12.1` / `v20_12_1` (`AgentCase_v20_12_1_EN.html`). The results and parameters workbook names use it too (their
  copies of the rule are gone).
- **Generated documentation facts.** `npm run docs:facts` (`app/scripts/doc-facts.ts`) writes the version, release file name and counts (source and
  test files, commands, undoable / view / portfolio commands, sections, groups, loaders, zones by lane, figures, controllers, the per-group section
  table) between `<!-- fact:… -->` markers in docs/ARCHITECTURE.md, README.md and app/README.md, and the counts of the two in-app architecture pages.
  Stale facts fail `tests/docs-facts.test.ts` and `npm run docs:check` (now part of `npm run check`, about 2.5 s) with "run npm run docs:facts".
  The number of tests is volatile: it is shown as "about N tests" with its date and refreshed only by `npm run docs:facts -- --count-tests`.
  Corrected on the way: ARCHITECTURE.md quoted 236 commands (247), 85 sections (86), 41 controllers (56), 14 group files (15), 892 / 241 files.
- **Deviations register complete** (docs/DEVIATIONS.md): DEV-HEADER-MENU (title without subtitle, compact two-zone header, file menu, Show /
  Change, group bar without ☰ / persona), DEV-KPI-BAR, DEV-UI-PARITY (cross-reference of `app/ui-parity-exceptions.json`), DEV-COSTMODEL-PILOT
  (pilot as a memo outside the cost-model totals; lot 4 will include it), DEV-APP-SECTION-PERSONAS (Brand & theme not removable from its personas;
  lot 7), DEV-THEME-SEQ-UNDO (known defect, a theme id reissued after undo; lot 3), DEV-PF-GAPS (portfolio scenarios table, wave dependencies,
  shared teams, Wave-view histogram, per-draw truncation); DEV-PF-STRESS added to the index. `tests/docs-deviations.test.ts` checks that every
  DEV-* id cited by the changelog, docs, code, tests or ui-parity exceptions has a section and an index row.
- **Docs in English** (decision D2): docs/SPEC_MULTI_PRODUIT.md and docs/VUE_AGREGEE.md translated in full (structure, tables, identifiers and file
  names kept); docs/GUIDE_MULTI_PRODUIT.md stays French with a "Summary (English)" at the top; README and GLOSSARY_EN cross-references updated.
- **Release tags**: docs/RELEASE_TAGS.md lists the merge commit of every release v19.0.0 → v20.12.0 and the tag commands for the owner
  (no tag is created by the tooling).

### Tests
- `tests/version.test.ts` (one source; "bumping the version touches only package.json": no literal version or tag under `app/src`, `app/tests` or in
  `index.html`; the tag format pinned on fixed fake versions, patch included), `tests/docs-facts.test.ts`, `tests/docs-deviations.test.ts`;
  `tests/ui/arch-facts.test.ts` also checks the zone count. Eight test files that hard-coded `v20_12` / `v20.12` / `20.12.0` (or `v20`) now read
  `APP_VERSION` / `appVerTag()` / `appVerFileTag()`.

**Golden case:** unchanged (no calculation change).

### Fixed
- **"Change: All products" in a Portfolio / Wave view no longer leaks the active product's values into the shared values.** Controllers used to read the
  active product's case to build some payloads; with one product overriding the field, its value reached the common values. Now: the due-diligence
  € sensitivity is measured inside the command on the case it is written to; the Gantt roadmap-start nudge, LCE recalibration, snapshot library,
  parameters-workbook import (a row missing from the workbook keeps the common value, not the active product's) and DD-pack import read
  `editBase()` (the case the command runs on). Exports, file names and the results' Monte Carlo runs keep reading the active product (`activeDoc()`).
  An ESLint rule forbids `getState().doc` in `src/controllers`.
- **Theme sequence ids are never reused** (closes DEV-THEME-SEQ-UNDO): create a theme, undo, create again now gives 101, not 100 again. `THEME_SEQ`
  is a high-water mark that undo, redo, another tab and a snapshot activation never lower; it is saved, so it survives a reload, and an imported
  library gets ids above it.

### Changed
- **The current persona is view state of each tab** (decision D3): switching persona in one tab no longer switches the other tabs, is never an
  undo step, and an undo never moves it. Files keep the legacy `currentPersona` as the persona the file opens on (the saving tab's; old files open on
  theirs, files without one on Builder); the case itself no longer holds it. Undoing "Open case" keeps the persona. A portfolio import or a snapshot
  activation keeps the tab's persona. A tab whose persona was deleted in another tab shows Advanced.
- **Versioned file schema**: every file written (JSON, HTML snapshot, autosave record) carries `_schemaVersion: 2`; files without it are v1 and go
  through the migration chain (v1 -> v2 is a no-op for every existing file: the 115 committed fixtures open unchanged, with no correction).

### Added
- **"Opened with N corrections"**: a damaged file (wrong types, a negative FTE, a broken rate card, model block or menu list, damaged products,
  waves, overrides or hub) now opens with the damaged values replaced by the defaults, a toast, and a notice listing every correction (Dismiss).
  Before, a damaged portfolio file was refused and damaged case values were taken as they were. Still refused: a file that is not JSON or not an
  AgentCase file, and a file made by a newer AgentCase ("This file was made with a newer AgentCase (file format vN; this version reads up to v2)…").
- Multi-tab: a change from a tab of a newer version is ignored instead of being applied to a document shape it may not match.

## [v20.12.0] 2026-10-24 — "Show" / "Change" top bar, file menu, two-zone header, Welcome cards fix

### Fixed
- Welcome cards: the card buttons inherit the app font and colours (title in the heading colour, description muted, as in the legacy page); before, the browser default applied (system font, and blue text on Safari / iOS).

### Changed
- **Top bar, several products: "👁 Show" and "✏️ Change"** replace "View" and "Edit:" (accessible names `Show` / `Change`, icons hidden from
  assistive technology, one-line tooltips: "What you look at: the portfolio, a wave or one product" / "Where your changes go: all products (shared
  values) or one product"). Shorter options: "Portfolio", "Wave 1", "Payroll (Wave 1)", "Billing (unscheduled)", " (archived)" kept; "All products",
  then "Payroll" (no " only"). The "Editing: <name>" chip is removed: the Change value says it. Toasts: "Showing Portfolio / Wave 1 / Payroll",
  "Changing all products / Payroll".
- **Rule "Change follows Show" (F17 revised)**: showing a product makes it the edited product AND the Change target (its edits create overrides);
  showing the Portfolio or a Wave sets Change back to "All products" (shared values). An explicit choice in Change still edits one product in place
  under a Portfolio / Wave view; in a Product view it switches the shown product (unchanged).
- In-place editing wording: "Changing all products (shared values)" / "Changing X only" (was "Edit in place: …"); "Shared values: every product that
  inherits a value follows; a product with its own value keeps it."; "Changing X only — the results above and elsewhere still show the Portfolio";
  "Back to shared: X" (was "Reset to common"); section banner "Changing: all products (shared values)" / "Changing: product X"; hints say "pick a
  product in Change". Single product: nothing changes.
- Header in two zones: left = AgentCase title (and client logo), ☰ sidebar toggle, Persona and Fast Path; right = Show / Change (several products), undo / redo, 📁 file menu, ◐ display.
- Top bar: Save and Open… move into a file menu opened by an icon-only 📁 button (menu button pattern: arrows, Home / End, Escape, click outside).
- "Edit in place: All products" banner: the sentence naming whose team the figures use is removed (the context is already shown above).

## [v20.11.0] 2026-10-24 — Portfolio "Edit:" dropdown with in-place editing; top-bar icons

### Changed
- Top bar: 💾 Save and 📂 Open… carry an icon; Undo / Redo are icon-only (↶ ↷, names and tooltips unchanged).
- Hide-menu group bar: the ☰ Menu button and the persona picker are removed (they duplicated the top bar's ☰ toggle and Persona picker).
- **Top bar "Edit:" is one dropdown** (2+ products, every View): **All products**, then "*name* only" for each product (in a Wave view the
  wave's products come first, then "Other products"). Choosing a product makes it the edited product with the edit scope "product"
  (its edits create overrides); "All products" sends shared data to the common values. View state, not undoable, not saved; the View does
  not change (in a Product view the shown product follows). The "Editing:" chip says "All products" or the product's name. Replaces the
  "All products / This product only" radio pair.
- **Input sections are editable in place in Portfolio and Wave views** (docs/VUE_AGREGEE.md § 2.1): the aggregate summary stays on top and
  the section itself is rendered below, under "Edit in place: …": for the chosen product (banner "Editing X only — results above and
  elsewhere still show the Portfolio view"), or, with **All products**, bound to the **common values** every product inherits. Each field
  that some products override names them ("2 products override this: A, B — they keep their value") with "Reset to common: X". The
  entry team (and the knowledge domains / KT preparation) stay per product: a hint replaces them for All products. The input-section
  banner says "Editing: All products (common values)" in that case. Results sections are unchanged.
- **Store**: with "All products" and a Portfolio / Wave view (`editsCommon`), a case command runs on the common case (`resolveCommon`) and
  the address layer writes every change to the common values (scope `'common'`), the entry team still to the active product; one undo step,
  exact undo / redo. A Product view keeps the previous rule (an already-overridden key is edited on the override). Spec recorded in
  docs/SPEC_MULTI_PRODUIT.md ("Précisions : liste Edit: et édition sur place"). One product: nothing changes.
- `controllers/productOverrides.ts` imports the portfolio domain by name (narrower test-selection graph); new `resetToCommon`,
  `chooseEditTarget`.

### Tests
- `tests/store/edit-common.test.ts`, `tests/ui/edit-inplace.test.tsx`, `tests/ui/edit-inplace-fields.test.tsx` (dropdown, chip, wave order,
  in-place editing for a product and for All products, override notices and reset, knowledge hub, team hint, axe on the top bar and the
  Scope section in Portfolio view). Updated for the dropdown: `portfolio-topbar`, `portfolio-overrides`, `portfolio-team`, `portfolio-scope`
  (Editing chip), `portfolio-single`; for the new banner text: `vue-banner`, `vue-tune`.

## [v20.10.0] 2026-10-24 — One-colour palette generator with a contrast slider (+ size budget 5 MB)

### New
- **Generate a theme from one colour** (docs/THEME.md §8.9): in the Brand & theme editor of a user theme, pick a seed colour, a **palette
  contrast** (0 Soft … 50 Balanced … 100 Strong) and a harmony (Monochrome / Analogous / Complementary / Triadic): every colour of the
  theme (9 scale anchors, surfaces, header and KPI gradients, navigation, tables, text, focus, the business colours, chart series 1-8) is
  derived in OKLCH, previewed live, and written by **Apply to theme** as one undoable step (`theme.generate`). The brand colour is the seed
  (darkened only when white text would not read on it); success / warning / danger / teal keep their meaning and only lean toward the seed.
  Every generated palette passes the contrast pairs in light and dark at the standard, enhanced and high levels (guarded; tested on 30 seeds
  × 5 slider steps × 4 harmonies plus random seeds). The settings are stored on the theme (`generator`) and travel in the case JSON, theme
  files and the Themes sheet; older files load unchanged.

### Changed
- Light enhanced contrast: a text colour a theme sets (business colours, link, heading, focus) is darkened by a fifth like the chrome
  backgrounds, so it reaches the 7:1 of that level (no built-in sets one; the default look is unchanged).
- The contrast pairs of the tests moved to `domain/theme/contrastPairs.ts` (the generator checks them); `tests/helpers/contrastPairs.ts` re-exports them.
- Size budget raised to 5 MB for the single HTML file (`app/perf-budget.json` sizeMB 3.1 → 5; gzip 0.95 → 1.5 MiB to keep the same ratio). Measured at v20.9.0: 3.09 MB / 0.93 MiB.

## [v20.9.0] 2026-10-23 — Brand & theme screen, theme library (?theme=N), client logo (T4 + T5)

### New
- **Theme library in the case** (docs/THEME.md §8): seven protected built-in themes with a sequence id — 1 Capgemini (the default look,
  unchanged), 2 Orange, 3 Sprint (green), 4 Rainbow (diagnostic: every screen zone a distinct colour, with a zone → token legend), 5 Sepia,
  6 Dark red, 7 Purple — and the user's own themes (ids from 100, never reused). A theme is scale anchors (a whole 9-step family re-derived
  in OKLab from one colour), roles (header gradient, KPI bar, sidebar, table head, surfaces, text, focus, business colours, chart series 1-8)
  and the T3 axes. Dark and contrast variants follow the theme's hue; high contrast stays black and white. Undoable commands: new,
  duplicate, import, rename, edit (a picker drag is one step), delete (the active one falls back to Capgemini), activate.
- **🎨 Brand & theme** (CONFIGURE; Admin, Builder, Business journey, Advanced): library with badges and actions, editor (read-only for
  built-ins, "Duplicate to edit") with live WCAG contrast badges and warnings per colour pair, the axes from `AXES`, and a live preview
  (header, KPI bar, navigation, card, callout, key figures, table, chart, one control of each kind) with its own Light / Dark toggle;
  the `?theme=<n>` link with a Copy button; import / export of a theme or the library as JSON (validated, unknown keys ignored).
- **`?theme=<n>` links**: open the app (or an HTML snapshot) in a theme without changing the case; a notice offers "Make it the case theme" or
  "Clear"; an unknown number is ignored with a message.
- **Customer logo** for client presentations (Engagement context): PNG, JPEG or SVG (rasterised to PNG) up to 200 KB, shown next to
  "AgentCase for <customer>" (alt "<customer> logo"), optional white pill backdrop, hide toggle; also in the HTML report, the HTML snapshot and on
  the ROI sheet of the results workbook.

### Changed
- The active theme reaches `tok()`, the charts, the Excel workbooks and the HTML report (still light); the page gets the theme's colour tokens
  as inline custom properties on `<html>` (none for the default theme: ui-parity unchanged).
- Parameters workbook: optional sheet **Themes** (only when the case has its own theme or another active theme; a default case exports the
  legacy workbook unchanged; older workbooks import as before).
- Brand & theme is an *app section* (no legacy equivalent): outside the legacy catalogue and workbook sheets, added by the navigation to the
  personas it names (DEV-BRAND-THEME). Catalogue: 86 sections; 246 commands.
- Contrast test extended to the catalogue (`tests/ui/theme-catalogue.test.ts`): every built-in but Rainbow passes in light / dark x
  standard / enhanced / high.
- Verification: ui-parity (full run) shows the same 12 recorded header divergences as before (default theme); axe on the golden fixture
  (104 audits) 0 violations in light and dark; a real-browser axe run with colour contrast over every section of the golden case under
  Orange, Sprint, Sepia, Dark red and Purple, light and dark: 0 serious / critical after tuning the Orange and Sepia anchors; e2e smoke
  766 section visits, 0 failures; build 3.09 MB / 0.93 MiB gzip (budget 3.1 / 0.95 unchanged).

## [v20.8.0] 2026-10-23 — Display modes: dark, contrast levels, colour-blind charts, reduced motion (T2 of the configurable theme)

### New
- **Display modes (T2 of the configurable theme).** Light, dark and auto (follows the system `prefers-color-scheme`; `prefers-contrast: more` lifts standard to enhanced), three contrast levels (standard = the current AA look, enhanced = AAA body text, visible lines, a thicker focus ring, high = black and white like the Windows high-contrast themes) in both modes, a **colour-blind safe charts** option (Okabe-Ito series, plus line dash and point style per line series and a hatch per bar series on every chart.js canvas) and **Reduce motion** (motion tokens to 0, no chart animation, no funnel autoplay). The dark mode is a dedicated value set (surfaces, text, lines, focus, header / KPI bar / sidebar / tables, business colours, chart palette, translucent steps); the raw scale steps components still read are re-ranked by an OKLab lightness curve. Docs: docs/THEME.md §6.
- **Display control** in the top bar (◐, "Display settings"): a small disclosure panel of native radios and checkboxes (Theme: Light / Dark / Auto (system); Contrast: Standard / Enhanced / High; Reduce motion; Colour-blind safe charts), keyboard and screen-reader accessible, Escape returns focus to the button. A **per-viewer** preference: localStorage `agentcase.display`, never in the case, never undoable; an unreadable entry gives the defaults (light, standard).
- **Contrast test** (`tests/ui/theme-contrast.test.ts`): WCAG ratio of every text / background role pair in each mode x level (AA 4.5:1 text and 3:1 UI; enhanced 7:1; high 15:1 text), listing the pairs below threshold. `tools/a11y.mjs --mode dark --contrast high` audits a display.

### Changed
- `tokens.css` carries one generated block per display (`data-ac-mode`, `data-ac-contrast`, `data-ac-cvd`, `data-ac-motion` on `<html>`); `npm run theme:gen` / `theme:check` cover them. `tok()` reads the base theme plus the display overrides (`setDisplayTheme()`); the Excel workbooks and the HTML report read the base theme (`printTok()`, `argb()`) and stay light. The HTML snapshot does not carry the author's display: it opens in its viewer's preference (light by default).
- `textColor()` lightens a data colour on a dark background (it darkened only).
- Perf budget raised to 3.1 MB / 0.94 MB gzip (`app/perf-budget.json`): the display blocks add about 40 KB to `tokens.css` (measured 3.03 MB / 0.92 MB).
- axe (golden fixture, 103 audits each): 0 violations in light, dark, dark + enhanced, dark + high and light + high.
- New roles `focus-header` and `table-head-note`; chart and graph series (financial, economics, verify, scope, team-out, tracker charts, Gantt, dependency graph, funnel and curve SVGs) read `chart-cat-*` instead of the raw brand steps they equal. The default look is unchanged (ui-parity: same 12 recorded divergences as before).

## [v20.7.0] 2026-10-23 — Theme axes and control variants (T3 of the configurable theme)

### New
- **Theme axes** (`app/src/domain/theme/axes.ts`, docs/THEME.md §6): corner radius (square / soft / round), buttons (follow the radius / pill), border width (none / thin / strong), shadows (none / light / floating), box style of cards, KPI tiles and charts (flat / outline / elevated), callouts (left accent bar / tinted fill), density (compact / comfortable / spacious, with bigger key figures), body font, heading font (Ubuntu or system stacks: System UI, Serif), numbers (body / tabular figures / monospace numbers), size scale (compact / normal / large), display weight (light / bold). Each value is a `data-ac-<axis>` attribute on `:root` selecting a block of the generated `app/src/ui/theme/axes.css` (`npm run theme:gen` / `theme:check`); `axisTokens()` feeds `setActiveTheme()`. The defaults are today's look; a theme (T4) only sets values on a `ThemeAxes` object and calls `applyThemeAxes()`.
- **Control variants** (`app/src/ui/widgets/field`): `FieldNumber` (number field / slider / slider + field / stepper), `FieldChoice` (dropdown / segmented buttons / radio group, 2 to 5 options), `FieldToggle` (checkbox / switch), selected by the `controlsNumeric`, `controlsChoice`, `controlsBoolean` axes. Default `auto` = each control as it renders today. Every variant dispatches the same command (same undo step) and is keyboard and screen-reader accessible (`spinbutton`, `slider`, named `group` / `radiogroup`, native radios, `role="switch"`). The shared inputs (`NumberInput`, `RangeInput`, `SelectInput`, `CheckInput`, `NumField`, `ChoiceField`, both `CoefInput`s) use them, and the raw controls of the params, scurve, team-in, ratecard, loc-strat, token-econ, risk, readiness, engagement-context, transform-params, lc-weighting and eligibility sections were migrated.
- 15 new tokens with the pre-T3 values (`space-block`, `space-heading`, `space-field`, `space-row`, `box-border`, `box-bg`, `shadow-box`, `callout-rail`, `radius-button`, `radius-pill`, `border-control`, `font-size-figure`, `font-size-kpi`, `font-weight-display`, `numeric-figures`); the content, shell and heading rules read them instead of literals.
### Changed
- No visible change with the default axes: ui-parity identical to v20.6.0 (same 12 recorded header divergences), screenshot comparison of 18 input and result sections pixel-identical. No font added: the gzip budget leaves no room for a second embedded family, so the extra families are system stacks.
- `app/perf-budget.json`: size 3.0 → 3.1 MB, gzip 0.9 → 0.95 MiB (the axes CSS, the variant controls and their CSS add 23 kB raw / 7 kB gzip; the previous budget had 0.6 kB of headroom).
## [v20.6.0] 2026-10-23 — Theme tokens (T1 of the configurable theme)

- **Theme tokens (T1 of the configurable theme).** Every visual value is a design token: 374 tokens in `app/src/domain/theme` (9 colour scales with 154 steps, 35 translucent steps, 51 semantic roles: surfaces, text, lines, states, header / KPI bar / sidebar chrome, tables and the business colours automation / glass ceiling / human supervision / agentic; 24 chart tokens: categorical 1–8, sequential 1–10, diverging, grid, axis; 18 export tokens for the Excel workbooks and the report; typography, radius, border widths, shadows, control paddings, motion). `app/src/ui/theme/tokens.css` is generated from that table (`npm run theme:gen` / `theme:check`) and a test fails on any drift. See `docs/THEME.md`.
- **No hard-coded visual value.** The CSS, the inline styles, the SVG charts and the chart.js configs of `src/ui` read `var(--ac-*)` or `tok()`; the domain read-outs (status bands, scenario and Gantt colours), the Excel fills (`argb()`) and the HTML report (`reportStyle()`) read the same table. Module-level palettes are lazy (`themedList`, getters) so a later theme switch reaches them. `tests/ui/no-hardcoded-style.test.ts` fails on any colour, font family or raw box-shadow outside the token files (explained allow-list: `transparent`, `currentColor`, `inherit`, `revert`, `none`, system colours).
### Changed
- No visible change: the default theme is the legacy look value for value (ui-parity: same 12 recorded header divergences as before, no new one; screenshot comparison of every section identical; Excel colours and report values unchanged). The legacy-value guards (`parity-tokens`, `parity-sections`, `parity-widgets`) now read the stylesheets with the tokens resolved.
- Three inline styles referred to undefined custom properties with a fallback (`--ac-amber-bg`, `--ac-surface-alt`); they now use the fallback's token directly (same colour).

## [v20.5.0] 2026-10-23 — Menu structures, legacy Section assignment tab, Business journey persona

### New
- **Menu structures** (DEV-MENU-STRUCTURES). Several named sets of menu groups can coexist; the existing groups and section placement are the built-in **Standard** structure, unchanged for every existing persona and case file. Each persona navigates with one structure (picked in 👥 Persona management → 🧩 Section assignment); its sidebar, group bar, Welcome cards, compact nav, Fast Path, landing and guided walk follow it. A **Menu structure** bar on 🗂️ Menu groups, 📄 Sections and 🗺️ Menu layout picks the structure those tabs edit, and duplicates, renames or deletes structures (built-ins protected, a structure in use cannot be deleted). Every edit is an undoable command (`menu.duplicateStructure`, `menu.renameStructure`, `menu.deleteStructure`, `persona.setMenuStructure`, `persona.addBuiltin`, plus an optional `structure` on the group and placement commands). Saved with the case (`MENU_STRUCTURES`, `Persona.menuStructure`) and in the parameters workbook ("Menu Structures", "Menu Structure Sections" when the case stores a structure, a "Menu structure" column on Personas when a persona uses one; a Standard-only case exports the legacy workbook unchanged).
- **Business journey persona** on the new built-in **Business journey** structure, built from the dependency graph: 1 · Frame, 2 · Today, 3 · Choose the scope, 4 · Size the system, 5 · Read the result, 6 · Defend & present (each described by its business question), Portfolio and Reference. It sees every section with the compact nav; its guided sequence walks the 28 core sections (33 with the Portfolio step, shown only from two products on), every other section is placed in a stage as "go deeper". Coverage tests: every section placed once in every structure, every written input zone has a core writer, every catalogue figure is shown in stage 5 or 6, at most 35 stops. Older cases can add it from 👥 Personas.
- **🧩 Section assignment as in the legacy tab**: one persona picker, then the pill sub-tabs "🧩 Section assignment" and "🧭 Guided sequence (wizard)". The legacy **📄 Sections (group & order)** tab is back: group, Group Seq, tag, MVP (Fast Path), description, personas using it, ↔ Respace ×10 Group Seq and a detail card with a live preview of the menu (`nav.setSectionTag`, `nav.setSectionMvp`).

### Tests changed
- `tests/helpers/excelParams.ts`: the legacy import target leaves out the new built-in persona (the legacy pristine state never had it); see DEV-MENU-STRUCTURES.
## [v20.4.0] 2026-10-22 — Calculation zones, generated dependency graph, affected-test selection (+ compact header)

### New
- **Calculation zones and owners.** `app/src/domain/zones/catalog.json` lists 18 zones (5 input, 4 calculation, 7 result, 2 shared) and 23 figures. Every module under `src/domain`, every controller, the export modules and the zone hooks carry `/** @calc-zone <id> */`; the module that owns a figure carries `@owner <figure>`. `tests/domain/zones-tags.test.ts` enforces valid tags and exactly one owner per figure; `tests/domain/figure-owners.test.ts` proves that net, ROI, payback, NPV, total benefit, saving %, FTE and velocity are the same on the KPI bar, Results, Financial, the Board variables, the calculation package, the Excel results workbook and the consolidation (single case, five fixtures, and multi-product portfolios). No calculation changed.
- **Generated dependency graph.** `npm run deps:gen` (`app/scripts/gen-deps.ts`) writes `app/src/generated/dependencies.json` (about 43 KB) from the imports: zones, sections, read / write / zone edges, figure owners and the zones each test reaches. A test and CI (`npm run deps:check`) fail when it is stale.
- **Section Dependencies shows that graph** (DEV-DEPS-ZONES): graph (staged lanes, SVG nodes and edges, selection with upstream / downstream, side panel with impacted sections and tests, reference sections collapsed), matrix, zones and figures, build order with the cycle report, and tests impacted. The authored `SECTION_DEPS` registry stays in the case and the parameters workbook unchanged but is no longer displayed or edited; the `deps.*` commands stay registered.
- **Rule that avoids useless tests.** `npm run test:affected` maps changed files to zones and sections and runs the test files whose import closure reaches them plus the contract tests; configuration, fixtures, helpers, scripts, the foundation zone, unknown files or a selection above 60% run the full suite. `npm run validate:affected` checks recall by mutation. See `docs/TEST_SELECTION.md`. The full suite stays mandatory before a merge and a release.
- **Duplicate-code check.** `npm run dup` (jscpd, devDependency) fails only on duplication above the current level (`app/dup-baseline.json`: 25 clones, 177 lines).

### Changed
- Performance budget `sizeMB` 2.9 -> 3.0: the build is 2.92 MiB (was 2.87) with the graph data and the new page; gzip 0.89 MiB is within its budget.
- Architecture sections (in the app) and `docs/ARCHITECTURE.md` section 13 describe zones, tags, the generator and `test:affected`; `docs/BUMP_PROCEDURE.md` checklist updated.

### Tests replaced
- `tests/ui/sections/deps.test.tsx`: the legacy-text parity and the edge-editor assertions replaced by tests of the generated content (intentional, requested; see DEV-DEPS-ZONES).

**Golden case:** unchanged.

## [v20.3.0] 2026-10-22 — Architecture sections rewritten

### Changed
- **Architecture sections rewritten for the TypeScript + React build.** 🏛️ Architecture — Layers (overview) and 🏛️ Architecture — Layers content (full detail) now describe the four code layers and their ESLint rules, the Time Engine, the command bus, the Portfolio layer, persistence and file formats, the View selector and aggregated view, security, performance budgets, the proof layer, the registries and the known gaps, with a table mapping the legacy engines (BUS, APP_STATE, PM, DEP, AUDIT, TIME) to today's mechanisms. The "In the TypeScript build" note above them is removed. Intentional, recorded as DEV-ARCH-CONTENT in docs/DEVIATIONS.md; the legacy-text parity assertions of these two sections are replaced by tests of the new content (counts equal the code, paths exist, links resolve).

## [v20.2.0] 2026-10-22 — Cost model (monthly) Excel export

### New
- **Cost model (monthly)** workbook (Import / Export > Results workbook): exactly three tabs — **Values** (days per month by Portfolio / Wave / Product / Skill with a **t0** AS-IS column, Excel subtotals), **Rate cards** (applied day rates, blending adjustment, RATE card, blended AS-IS / target rates) and **Other costs** (setup lines, Knowledge-transfer setup placed before the wave when prepared, AgentOps, tokens, infrastructure, Knowledge Hub, verification / rework / compliance taxes, KT avoided, totals vs the engine, the annual discount rate and every parameter that changes the cost with the section where it is edited). Scope: Portfolio, a Wave or a Product (default: the current View). Reconciliation to 1e-6 with the engine on all 107 fixtures and multi-product portfolios.

#### Notes recorded while building
##### New
- **Cost model (monthly) Excel export** (Import / Export, Results workbook tab): a workbook of exactly three tabs, **Values** (human days per month by Portfolio / Wave / Product / Skill / Grade / Location, with product, wave and portfolio subtotals), **Rate cards** (the day-rate card, the target location mix, the day rate applied to each line each month, a blending adjustment and a team-cost check) and **Other costs** (setup, Knowledge-transfer, Knowledge Hub, tokens, infrastructure, AgentOps, taxes and rework, savings, pilot memo, the monthly total against the engine total, the discount factors and every parameter that moves the cost). Monthly columns on the portfolio calendar plus a **t0** (AS-IS) column; scope = Portfolio, a Wave or a Product (default: the current View). Days x applied rate + other costs = the app cost, proved to 1e-6 on the 107 fixtures and on multi-product portfolios (`tests/domain/portfolio/costModel.test.ts`); subtotals and checks are live Excel formulas with cached results (recalculated independently with LibreOffice: 1156 formulas agree). Domain view-model `domain/portfolio/costModel*.ts`, writer `store/persistence/excel/costmodel/`, controller `controllers/excelCostModel.ts`. No existing export changes.

## [v20.1.0] 2026-10-22 — The View selector and the aggregated view of all 85 sections

### New
- **Aggregated view for every section.** Each of the 85 sections follows the top-bar **View** (Portfolio / Wave / Product): result sections show consolidated figures (equal to an independent derivation from the products' Time Engine to 1e-9), control sections show a per-product roll-up with a domain-supplied total and a read-only product drill-down, input sections show a read-only synthesis with **Edit this product** on each row, reference sections show the banner only. Single-product mode and the Product view are unchanged. Classification and recipe: `docs/VUE_AGREGEE.md`; a coverage test renders all 85 sections under Portfolio and Wave.
- Top bar: **FTE before / FTE after** and **Saving over N yr** (net cost reduction over the horizon), **Velocity Yn**; a tooltip on every value; NPV is no longer shown there (it stays in Results and Financial).
- All user-facing text is English (guard test `tests/ui/english-only.test.ts`; French default names of v20.0 files are still recognised).

### Changed
- One **View** selector replaces the two overlapping selectors (Product, Display scope); choosing a product also edits it, and "Editing: <product>" is shown while the Portfolio or a Wave is in view (legible on the dark header).
- Header: the customer name is shown in the title ("AgentCase for <customer>") and edited in Engagement context; the subtitle is removed (recorded in `app/ui-parity-exceptions.json`).
- Legacy look in sections (fonts, sizes, colours), calculation unification (one headline owner, horizon sums, scenarios on the Time Engine; deviations in `docs/DEVIATIONS.md`), accessibility pass, sidebar groups and Fast Path, calculation package and staleness banner, Gantt keyboard editing.

### Detail (earlier Unreleased notes)
#### New
- **Aggregate view, phase V0 (foundation)** — every section now declares how it follows the top-bar View (`ui/zones/data/sectionScope.json`: 15 `R-conso`, 28 `R-rollup`, 18 `I-input`, 18 `S-static`, 6 `P-portfolio`; classification and plan in [docs/VUE_AGREGEE.md](docs/VUE_AGREGEE.md)). With two or more products a `ScopeBanner` states the View for the section ("Calculated on: Portfolio (3 planned products)", "Editing: product X — aggregate view of the selection below…", "Independent of the view", "Portfolio level"). With a Wave or the Portfolio in view, result and input sections are replaced by their registered aggregate (`ui/sections/aggregates/<group>.ts`) or by a generic fallback of their kind (per-product rollup table + read-only drill-down, per-product input synthesis with **Edit this product**, or an explicit "Consolidated view coming"). `ProductViewContext` lets one section component read any product's resolved case without touching the store (`ReadOnlyScope` keeps it inert). Exemplars: Economics > Financial (consolidated cards, cash, by product, by year) and Input team (teams added up by skill, grade, location). New pure domain views: `selectionView`, `aggregateTeams`, `inputSummary`. A single product, and the Product view, render exactly as before.
- **Aggregate view, groups scope / frame / baseline** — read-only synthesis under the Portfolio and Wave views for the input sections Automation & Glass ceiling, S-curve, Scope, Phase scope, Lifecycle weighting, Engagement context, Engage, Industry / regulatory profile and Location strategy (the section's own inputs per product, min–max or counts supplied by `domain/portfolio/agg*`, "Edit this product"); Input team gains the exclusion note. Product view unchanged.
- **Aggregate view, "verify" group (16 sections)** — under the Portfolio or a Wave: FTE / vFTE, Target team, TO-BE team by skill, Agent usage, KPI Scorecard and AS-IS vs TO-BE show consolidated figures (calendar series, entry-team weighted ratios, sums of the products' own views); vFTE Overview, Phase / Artifact details, Agent Directory, Agent details, Execution Timeline, Productivity, Velocity, Quality and Compliance show their own figures per product with a domain-supplied selection line and a read-only per-product drill-down; the Gantt is verified under all three views. Domain view models in `domain/portfolio/aggVerify*.ts`, tests `tests/domain/portfolio/aggVerify*.test.ts` and `tests/ui/vue-verify*.test.tsx`.
- **Aggregate view, Economics group** — Agentic Run, Annual summary and Monthly detail show the consolidated recurring costs, calendar years and calendar months of the Portfolio / Wave (new pure `aggregateRun` / `aggregateAnnual` / `aggregateMonthly`, checked to 1e-9 against the products' own Time Engine months shifted by `month0`); Financial Summary verified under Portfolio, every Wave and Product.
- **Aggregate view, Present group** — Monthly Playback plays the consolidated trajectory (velocity and cost per point weighted by entry headcount), The story so far tells the AS-IS to TO-BE of the selection with a story per product, Commercial model rolls up each product's selected model with the read-only product drill-down (`aggregatePlayback`, `aggregateStory`, `aggregateCommercial`).
- **Aggregate view, Verdict group** — Results shows the selection's verdict (portfolio Monte Carlo), consolidated key figures, summed savings decomposition and team shift; Strategy comparison lists each product's recommended strategy with ROI / TCO and a roll-up; Decision Intelligence verified under all three views (`aggregateResults`, `aggregateStrategies`).#### Changed
- **Aggregate view, group Tune (12 sections)** — Portfolio and Wave views of Maturity levels, AI Readiness, Status & phase weight, Token economics, Knowledge hub, Run-team sizing, Operating model, Agentic Setup, Eligibility, Maturity & Measurement, Program and Risk: per-product tables of each section's own figures with domain totals / min-average-max (`domain/portfolio/aggTune*.ts`), read-only "Edit this product" for inputs, product drill-down for results; Product view unchanged.
#### Changed- **All new multi-product UI text is English.** The v20.0 multi-product work (Portfolio, Waves, Products, Overrides, Knowledge transfer, Consolidation, Portfolio stress, the View selector, scope banners, toasts, diagnostics, Excel result sheets, the portfolio report, ARIA names, history labels) shipped French labels; every one is now English (vocabulary in [docs/GLOSSARY_EN.md](docs/GLOSSARY_EN.md)). New default names are "Product 1" / "Wave 1"; files saved by v20.0 with "Produit 1" / "Vague 1" still open, keep their names and are still recognised as a plain single case (F22). The guard `tests/ui/english-only.test.ts` keeps French out of `app/src`; the rule is in docs/ARCHITECTURE.md and docs/BUMP_PROCEDURE.md.
- **Aggregate view, groups stress / model-engine / defend (13 sections)** — Monte Carlo shows the portfolio Monte Carlo of the selection (P10/P50/P90, P(net<0), CVaR, diversification, run button, stale marker; histogram for the Portfolio); Scenarios, 3-way Comparison and Sensitivity give per-product tables of their headline outputs (Comparison adds a domain roll-up line, the others state that there is no portfolio total); the six Model-Engine phases (P1-P6) show a per-product status with phase counts; Assumptions register, Logic verification (checks and 67 convergence rows per product) and Due diligence give per-product counts with domain roll-ups. Every section keeps a read-only per-product drill-down. New pure domain functions in `domain/portfolio/agg{Stress,Engine,Defend}.ts`, hooks in `store/selectionHooks{Stress,ModelEngine,Defend}.ts`.
#### Changed
- **All new multi-product UI text is English.** The v20.0 multi-product work (Portfolio, Waves, Products, Overrides, Knowledge transfer, Consolidation, Portfolio stress, the View selector, scope banners, toasts, diagnostics, Excel result sheets, the portfolio report, ARIA names, history labels) shipped French labels; every one is now English (vocabulary in [docs/GLOSSARY_EN.md](docs/GLOSSARY_EN.md)). New default names are "Product 1" / "Wave 1"; files saved by v20.0 with "Produit 1" / "Vague 1" still open, keep their names and are still recognised as a plain single case (F22). The guard `tests/ui/english-only.test.ts` keeps French out of `app/src`; the rule is in docs/ARCHITECTURE.md and docs/BUMP_PROCEDURE.md.- Top bar: one **View** selector (Portfolio / Wave / Product) replaces the two overlapping selectors "Product" and "Display scope". Choosing a product shows *and* edits it; with the Portfolio or a Wave in view, "Édition : produit" names the product the sections still edit. "Modifier : tous les produits / ce produit seulement" is unchanged.

## [v20.0.0] 2026-10-22 — Multi-product portfolio, waves and consolidation

> Major release: a file describes a **portfolio** of products rolled out by waves. The case-level engine (`computeCase`, Time Engine, verification, verdict)
> is untouched: it runs once per product on an "effective case" and a consolidation layer adds the results. Specification and decisions D-M1..D-M12:
> [docs/SPEC_MULTI_PRODUIT.md](docs/SPEC_MULTI_PRODUIT.md); French user guide: [docs/GUIDE_MULTI_PRODUIT.md](docs/GUIDE_MULTI_PRODUIT.md); example:
> [docs/examples/AgentCase_Portfolio_Example.json](docs/examples/AgentCase_Portfolio_Example.json). Phases P1-P7 were developed as separate merges; their notes are merged below.

### New
- **Products, each with its own entry team** (1 to 50). Add, rename, duplicate, archive, remove, note, per-product offset; the active product is chosen in the top bar and the 79 existing sections work on it
  (banner "Product: X (inherited / n overrides)", "Team of: X"). The team is never inherited or shared. A single product looks and behaves exactly as before (progressive disclosure, F23).
- **Common scope with overrides.** Scope, targets, S-curve, engagement context and Knowledge Hub choices are common by default; a product overrides a whitelisted key (whole key, sparse difference): "overridden" chip,
  "Revert to common", "Apply to all products", edit scope "Edit: All products / This product only". Tariffs, model, coefficients, discount rate and horizon stay common (D-M3). Sections **Products** and **Overrides**.
- **Waves.** Section **Waves**: a column per wave (create, rename, reorder, delete, start month with its calendar month), products as cards moved by drag and drop, arrow keys or the "Move to wave…" menu,
  per-product offset, a column "Unscheduled" (excluded from the consolidation, with a warning). A product belongs to one wave (D-M1).
- **Knowledge transfer subsets.** One Knowledge Hub for the portfolio, one subset per product (activation, nine maturity answers, target CC capped by the context, curation, set-up base, free domains with weights summing to 100,
  `ktLeadMonths` = preparation before the wave, which only moves the KT set-up cost). Infrastructure charged per product or by entry headcount (exact to the cent, conservation checked). Section **Knowledge transfer**
  (table per product, totals, wave filter, hub effect per wave, diagnostics).
- **Consolidation.** Section **Consolidation** and the calendar engine: per-product Time Engine rows shifted to the calendar and summed (savings, run cost, set-up, tokens, infrastructure, FTE, vFTE), NPV discounted from portfolio month 1
  (the sum of the products is the portfolio NPV, D-M4), ROI by `roiCanonical`, payback of the consolidated cash, per year, per wave and per product; diagnostics (not scheduled, KT lead clamped, target capped, hub unused, truncated).
- **Display scope** (top bar "Scope"): Portfolio, Wave: X or Product: Y. The headline bar, the Gantt (a bar per wave, products expandable, milestones on the portfolio calendar), Decision Intelligence and the report follow it.
  Not saved with the file; not undoable.
- **Portfolio stress.** Section **Portfolio stress**: Monte Carlo of the planned products (one stream per product, seed XOR hash(id); a one-product portfolio reproduces the case Monte Carlo draw for draw), the portfolio draw being the sum of the
  products' net benefits, global correlation `rho` in [0, 1] (Gaussian copula on a shared factor; marginals unchanged), P10 / P50 / P90 / mean / CVaR / P(net < 0), risk reduction (diversification) per wave and per product, stale marker,
  chunked run with progress; verdict of the Portfolio / Wave scope in Decision Intelligence (same rule, `verdictRule`). `rho` is a portfolio field (command `portfolio.setRho`, saved, `PortfolioSettings` sheet). See DEV-PF-STRESS.
- **Restitution.** Parameters workbook: for a real portfolio "Export all" adds `PortfolioSettings`, `Products`, `Waves`, `TeamIn`, `Overrides`, `KnowledgeSubsets`, `KnowledgeDomains`; hardened import in one undoable step ("Import portfolio parameters").
  Results workbook: `Portfolio`, `Wave <name>`, `Knowledge transfer`, `Portfolio stress`, then `Product <name>` with its own six sheets. Due-diligence pack: the active product. Critical-delivery report by scope (a product = today's report byte for byte;
  Portfolio / Wave = consolidated report). Snapshots and HTML save carry the whole portfolio; activating or baselining a photo is one undo step.
- **Persistence.** New document format `agentcase.portfolio.v1` (JSON, HTML embed, autosave record, multi-tab patches, one calculation package per product plus a portfolio package, two-level staleness check). A plain single case is still saved as
  `agentcase.snapshot.v1` (F22); v18.x and v19 files open as "Product 1" in "Wave 1" at month 0 with identical figures. 27 new commands (229 registered in all, 225 undoable; 4 view commands are never on the undo stack), every undoable one covered by the
  registry round trip and the undo property test on a 3-product portfolio.
- **Docs and example.** README, ARCHITECTURE (new "Portfolio" overview and known gaps), SPEC (status: implemented), MIGRATION_PLAN §15, French user guide `docs/GUIDE_MULTI_PRODUIT.md`, example portfolio `docs/examples/AgentCase_Portfolio_Example.json`
  (4 products, 2 waves, an offset product, a product not scheduled, hub by headcount, rho 0.3, overrides; generated by `app/scripts/portfolio-example.ts`, opened by `tests/store/portfolio-example.test.ts`).
- **Tooling.** `tools/e2e-smoke.mjs` also opens `pf-three-products` and the example portfolio and visits the six Portfolio sections; `tools/perf.mjs` measures the Portfolio sections (budget `portfolioSectionMaxMs`); `tools/a11y.mjs` audits the example
  portfolio by default; `tools/parallel-run.mjs` reads the NPV from the Financial section. The release file name is read from `APP_VERSION` (`npm run release` -> `app/dist/AgentCase_v20_0_EN.html`).
- **Architecture rule A8**: ESLint bans `.reduce(` in the portfolio sections, KPI hook, wave Gantt and stress views, so no portfolio figure is computed in `ui/`.

### Changed
- Version `20.0.0` (`APP_VERSION`, `package.json`, lock file, `index.html` title v20); file names `AgentCase_v20_0_<kind>_…` and `· v20.0` tags follow. **Unchanged on purpose**: schema tags `agentcase.snapshot.v1` / `agentcase.portfolio.v1`, the autosave database
  `agentcase-v19` (version 1) and the BroadcastChannel `agentcase-v19`, so no user's autosave is orphaned.
- The store's source of truth is the `Portfolio`; `doc` is derived (the effective case of the active product). An address layer maps each existing command's patches onto team / override / common inside one Immer produce: the ~200 case commands, controllers, Excel and report adapters keep their signatures.
- Top bar: total FTE before and after for the product, wave and portfolio scopes. Top bar and workbooks of a one-product file are unchanged.
- Speed-ups with identical numbers: spline slopes cached per control-point list, input overrides parsed once, `hubView` cached per resolved case, views memoised on `corePortfolio`.

### Fixed
- `tools/e2e-smoke.mjs`, `tools/perf.mjs` and `tools/parallel-run.mjs` had drifted from the shell (collapsible sidebar groups, a headline bar that starts with FTE and no longer shows the NPV, negative amounts printed with U+2212) and stopped at the first click; they follow the current UI.
- `tools/a11y-keys.mjs` flagged the unchecked radio of the "Modifier" group as unreachable; a radio group is one tab stop (tool fix, no change to the app).
- Accessibility: heading order of the new sections and the stress result summary (found by the axe pass in P6).

### Gates (measured on this release: Chromium headless, built file)
- **Golden case**: unchanged. All 107 single-product fixtures give the same numbers as before, as one-product portfolios (A1/A9), verified by the tests (`tests/store/portfolio-a1.test.ts`, the oracle, parity and persistence suites).
- **`npm run check`**: typecheck and ESLint clean; Vitest 202 files, 15,339 tests passed (12,346 at v19.0.0).
- **e2e smoke** (`tools/e2e-smoke.mjs`): 758 section visits (6 case fixtures x 93, `pf-three-products` and the example portfolio x 100, the six Portfolio sections included), 0 failures, 0 console errors.
- **Performance** (`tools/perf.mjs`): size 2.68 MB (0.83 MB gzip), shell 520 ms, edit-to-KPI repaint median 16 ms / p95 22 ms, undo 42 ms, slowest single-case section switch 259 ms, slowest Portfolio section switch 137 ms (Products 100, Overrides 102, Knowledge transfer 101, Waves 119, Consolidation 137, Stress portefeuille 97), heap 30 MB, 0 page errors (`npm run e2e`, exit 0). Budget `app/perf-budget.json` unchanged except the new `portfolioSectionMaxMs` (1,500 ms).
- **Accessibility** (`npm run a11y`): 422 audits (golden, ctx-msi, industry-med and the example portfolio), 0 violations, budget `app/a11y-budget.json` unchanged. `pf-three-products` alone: 116 audits, 0 violations.
- **UI parity** (`tools/ui-parity.mjs`): 44,871 properties compared over 3 personas and the section content, 0 divergences, 5 recorded exceptions (`app/ui-parity-exceptions.json`).
- **Parallel run** (`tools/parallel-run.mjs`): legacy v18.13 file against the built app on the same files, comparing savings, run cost, NPV, payback, effective automation and glass ceiling: the 40 parameters workbooks (`app/fixtures/xlsx`) are all identical; of the 107 case files opened as snapshots, 104 are identical and 3 differ (`curve-bass`, `curve-legacy`, `lifecycle-pos-0`), the known limits of the legacy snapshot restore path (it does not restore the `bass` family, see docs/MIGRATION_PLAN.md §15.4), while the oracle tests, which drive the legacy engine through the recipes, pass on all 107. The tool now reads the NPV from the Financial section.
- **Release file**: `app/dist/AgentCase_v20_0_EN.html`, 2,809,882 bytes (2.68 MiB), a copy of `app/dist/index.html` made by `npm run release`.

### Known gaps
Portfolio scenarios table; dependencies and capacity between waves; shared teams; per-draw horizon truncation in the portfolio stress; "apply to all" for Knowledge subsets; rates / model per product; knowledge reuse between products.
See docs/ARCHITECTURE.md §12 and docs/MIGRATION_PLAN.md §15.6. A 19.x build cannot be expected to open a real portfolio file, and ignores the portfolio sheets of a parameters workbook.

**Golden case unchanged from v19.0.0:** Y3 savings €891,555 · Y3 run cost €885,709 · setup €225,000 · NPV (8 %) €1,359,010 · payback 9 months · 0 audit violations.

---

## [v19.0.0] 2026-10-21 — TypeScript + React build

> Cut-over done: version 19.0.0.

The product moves from the single-file app to a TypeScript (strict) + React 18 build in `app/`; the legacy `AgentCase_v18_13_EN.html`
stays in the repository as the frozen reference. Plan and record: [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md); design:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### New
- **Same model, same numbers.** The calculation engine is pure TypeScript (`app/src/domain`). It reproduces the legacy `model()`,
  canonical payback / NPV, headline, glass ceiling and audit result to 1e-6 on 107 oracle cases generated from the legacy file
  (`tools/oracle.mjs`, `app/fixtures/`).
- **Full undo / redo.** Every business edit is a named command (202 registered); Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y, undo / redo
  buttons with the step label, and a History panel in the dock where a click jumps to a step. Slider and number edits coalesce
  (800 ms); bulk actions are one step; history is kept in autosave (200 steps) and is not written to shared files.
- **Screen zones.** Top (customer, persona, undo / redo, save / open), KPI (sticky headline), navigation, work and dock zones; the
  navigation (sidebar, group bar, hide-menu mode, persona menus, dynamic sections, guided sequences) is built from the case document
  and edited in Persona management (sequence editor, menu layout board, persona layout board).
- **All 79 sections** ported, each with an oracle or parity test.
- **One offline HTML file** from `npm run build` (`app/dist/index.html`, about 2.6 MB); ExcelJS loaded on demand.
- **Multi-tab sync** by patches (BroadcastChannel); a change from another tab is applied but never put on this tab's undo stack.
- **Persistence:** autosave in IndexedDB with the undo history; HTML snapshot that embeds the case as JSON (no DOM serialised) and opens
  this build's files, legacy v18.x snapshots (parsed, never executed) and JSON; parameters workbook (export, hardened import, one
  undoable step), results workbook and due-diligence pack; snapshot manager; the Critical & Regulated report.
- **Architecture rules as CI errors:** layers `ui → controllers → store → domain` (`eslint-plugin-boundaries`), the UI cannot import the
  write path, no `.ts` / `.tsx` file over 150 lines, no `any`, no `dangerouslySetInnerHTML`.
- **Tests:** 137 Vitest files (12,346 tests at the last local run): oracle, controllers, persistence fixtures, section parity,
  command registry, property-based undo / redo, lint and size rules. CI: `.github/workflows/app.yml`.

### Changed
- Legacy changes that came with the migration (shipped in the legacy file first, decision D7; the TypeScript build includes them):
  - **v18.9** hardening: stored / imported XSS closed, prototype pollution closed, no aliasing of golden / captured snapshots, S-curve
    persisted, autosave fixes, one ROI / payback convention, Time Engine overlay errors reported (all 52 review findings, docs/CODE_REVIEW.md §7).
  - **v18.10** ramp factors (readiness drag, engagement ramp speed and cap) act on the spline curve; Scope "impact by phase" panel; Excel
    import re-fits the potential to the final scope.
  - **v18.11** human share applied once (`eff = min(100 − ceiling, potential × posture × context × hub)`); golden case moved to the
    figures below.
  - **v18.12** the potential is re-fitted on every regulatory-panel change; Monte Carlo works above 3 years.
  - **v18.13** strategies, Results and scenarios at horizons above 3 years and below 3 (`horizonYears()`).
- Opening a case re-fits the displayed potential when *Fit to selected scope* is on, as the legacy restore does (no figure moves: the
  engine already ignores the stored value while fit is on).
- Not ported (see docs/MIGRATION_PLAN.md §15.2): ADVANCED lock and its unlock gestures and tag / MVP editing (both out of scope),
  golden-vs-AME comparison, per-snapshot Excel export.

### Fixed
- Legacy defects found while porting and left as shown (decision D7) are listed in docs/MIGRATION_PLAN.md §15.4.

### Documentation
- README, ARCHITECTURE (new, for the TypeScript build; the legacy one is archived in `docs/history/ARCHITECTURE_legacy_v18.md`),
  BUMP_PROCEDURE (new release procedure; the legacy one is archived in `docs/history/BUMP_PROCEDURE_legacy_v18.md`), MIGRATION_PLAN
  (now the record), CODE_REVIEW §8 (status after the migration).

**Golden case unchanged from v18.13:** Y3 savings €891,555 · Y3 run cost €885,709 · setup €225,000 · NPV (8 %) €1,359,010 · payback
9 months · 0 audit violations.

---

## [v18.13] 2026-10-21 — Strategies, Results and Scenarios beyond / below three years

Same root cause as the v18.12 Monte Carlo fix: `model().yearSav` / `yearRun` hold three entries whatever the horizon.
- **Fixed:** the strategies table (ROI, TCO, payback, net) and the Results ROI summed `yearSav[0..horizon-1]`, which read `undefined`
  above 3 years (n/a / NaN at horizons 5, 7, 10). New helper `horizonYears()` returns one savings and one run-cost entry per horizon
  year from the Time Engine (flat curve: the three anchor years). Horizons 1–3 are unchanged. The decision's strategy comparison
  and the verdict that read the strategies follow. Test `strategies_and_results_above_3_years`.
- **Fixed:** the six scenarios showed "€NaN" for horizons 1 and 2 (the ramp arrays kept three entries against `horizon` day rates).
  Test `scenarios_short_horizons`.
- **Golden case unchanged.**

---

## [v18.12] 2026-10-21 — Re-fit on scope changes from the regulatory panel; Monte Carlo above 3 years

Two behaviours the TypeScript migration surfaced (decision D7: calculation changes ship in the legacy file first so the oracle moves with them).
- **Fixed:** changing the industry, ticking a norm, toggling a cross-cutting category, switching the regulatory catalogue on/off,
  including regulatory artefacts or ticking one regulatory artefact changed the scope but left the automation potential at its old
  value (fit-to-scope on). The potential is now re-fitted to the new scope in all of them, like for the SDLC artefact selection.
  Example: default 75 % → medical profile 46 % → + AI norms 41 %. Test `industry_change_refits_potential`.
- **Fixed:** Monte Carlo (and everything reading its percentiles: Results, Decision, verdict) returned NaN for horizons above
  3 years because `model().yearSav` always holds three entries. The outcome now sums the Time Engine's year rows (one per horizon
  year); under the legacy flat curve it sums the three anchor years. Horizons 1–3 are unchanged. Test `montecarlo_horizon_above_3`.
- **Golden case unchanged.** Strategies / scenarios still read three-year arrays and show n/a above 3 years (not changed here).

---

## [v18.11] 2026-10-21 — Human share applied once

Effective automation was `potential × (1 − glass ceiling) × posture × context × hub`, capped at `100 − ceiling`. With fit-to-scope
on, potential and ceiling come from the same artefact split and sum to 100, so the human share was subtracted twice
(75 % × 75 % = 56 % in the default case; 72 % × 72 % = 52 % on the customer workbook). Decision taken on the open point of v18.10.
- **Changed:** `eff = min(100 − ceiling, potential × posture × context × hub)`. The ceiling now acts once, as a cap; the potential
  is no longer multiplied by `(1 − ceiling)`. Same change in the scenario model and in the sensitivity matrix; help text and worked
  examples in the app updated (default case: 75 % effective depth).
- **Golden case moves** (intended): Y3 savings €731,774 → **€891,555** · Y3 run cost €1,045,490 → **€885,709** · NPV (8 %)
  €1,131,220 → **€1,359,010** · payback 9 months (unchanged) · 0 audit violations. `tools/golden.json` updated.
- **Scope — Adjust % auto table:** a live result strip (potential, ceiling, max depth, Y3 savings, with the change since the
  previous edit) and, when a phase is filtered, a "set all artefacts of this phase to N % auto" control. The cascade itself
  was verified on every phase (potential, ceiling, effective depth and savings all move); a phase can look inert because of its
  lifecycle weight (e.g. L10 at ×0.20 in the default status) or because a rise is capped by `100 − ceiling` / the technical
  cap. Test `adjust_phase_cascade`.
- Sensitivity check (Logic verification): when effective depth already sits at the ceiling cap, the "Auto +10" variant cannot
  move, so it tests "Auto −10" instead.
- Cases with fit-to-scope off and a manual potential above `100 − ceiling` are still limited by the cap.

---

## [v18.10] 2026-10-21 — Ramp factors act on the spline curve

The default adoption curve (free-form spline) used the drawn points as they were, so three documented drivers did
nothing under it: the **Human Readiness adoption drag**, the **engagement ramp speed** and the **engagement ramp cap**.
They now scale the spline exactly as they scale the ramp anchors of the other curves:
`adoption = min(rampCap, drawn × rampSpeed × hriRampFactor)`. Decision taken on the open point of v18.9.
- **Golden case unchanged** (HRI off, context MSC: speed 1, cap 100): Y3 savings €731,774 · NPV €1,131,220 · payback 9.
- Non-default cases change, which is the point: HRI on at index 50 → Y3 savings €635,906 (×0.80 ramp); context MSI €566,186
  and STA €504,494 instead of €731,774 for all three.
- **Scope — new section "🧊 Glass ceiling & automation potential — impact by phase"** (end of the page, same collapsible
  pattern as the per-artefact adjust panel). Three figures (potential, ceiling, max depth), a potential/ceiling bar, then
  one bar per phase sorted by its contribution in points of glass ceiling (the bars add up to the ceiling), coloured by
  impact (red = top third, amber, teal). Click a phase for its three biggest blockers. Test `ceiling_impact_sums_to_ceiling`.
- **Excel import now re-fits the automation potential to the final scope.** The Phase Scope sheet fitted it to a provisional
  selection (all artefacts of the included phases, still with default effort / automation values) and the SDLC Artifacts sheet
  then replaced the selection and the values without a re-fit: a workbook saying potential 72 % / ceiling 28 % came back as
  69 % / 28 % (potential + ceiling ≠ 100). A phase marked "No" that still holds selected artefacts is un-gated and reported
  in the import notes. Test `import_refits_potential`.
- Automation-over-time chart: the right-edge tag "Ceiling 52 %" is renamed "Max depth 52 %" — it is the permitted depth
  (potential × (1 − glass ceiling)), not the glass-ceiling parameter (28 %).
- The warning on the HRI screen ("the drag does not act on the spline") is removed. The S-curve editor still draws the
  unscaled points. Two new regression tests: `hri_and_engagement_apply_to_spline`, `engagement_context_moves_spline`.

---

## [v18.9] 2026-10-21 — Hardening release: security, data integrity, calculation consistency

Every finding of the v18.8 code review ([docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) §7) is fixed. **No result of the
model moved** — golden case unchanged and now asserted (`tools/golden.json`): Y3 savings €731,774 · Y3 run cost
€1,045,490 · setup €225,000 · NPV (8 %) €1,131,220 · payback 9 months · 0 audit violations.

### Security
- Stored / imported XSS closed: user and imported strings (labels, ids, names, titles, skills, customer, session
  labels, snapshot names, Excel notes) are escaped at every sink; group colours validated; imported ids, labels and tags
  sanitised. A hostile `.xlsx` can no longer run script in the app.
- Prototype pollution through an imported `__proto__` location (Rate Card, Input Team, Location Target) closed.

### Data integrity
- The golden case and captured snapshots no longer follow later live edits (deep copy at the snapshot boundary).
- S-curve control points and curve family are saved with the case (file, autosave, snapshots) and round-trip through
  Excel (new `S-Curve` sheet); shrinking the horizon can no longer turn every figure into NaN.
- Autosave: **Restore** restores the session it offered (kept as "Before reload" in the Session manager), the banner
  only appears for a genuinely newer autosave, ordinary parameter edits are autosaved, live previews never write to the
  store, quota failures are reported, a duplicated tab gets its own slot, cross-tab refresh works.
- Saved HTML files no longer freeze `boot-ready`, banners, preview iframes or a duplicated industry list.

### Calculation consistency
- P2 verification tax counted every selected regulatory artefact twice — fixed.
- P4 stochastic NPV discounts at the case rate; an explicit 0 % discount rate is kept (also P5).
- One ROI / payback convention: `n/a` instead of `Infinity%`/`NaN%` with no setup cost, month 0 reads "immediate",
  the payback horizon follows the case horizon.
- Applying a strategy no longer compounds its factors; the comparison table matches the live case.
- Verification's directional-sensitivity check can now fail; `model()` overlay failures are flagged and reported by
  the new audit check `CC-OV-01`.
- P1 calibration keeps the user's review-time edits; DD sensitivity freshness uses a content hash and perturbs the
  named `COEF` values (HRI floor / slope now get distinct weights).

### Behaviour
- Background restores (Snapshot-manager comparison, per-snapshot Excel export) keep the persona and the tab; the
  golden-vs-AME comparison is cached.
- Empty team / all-zero ramps no longer produce NaN; KPI deltas carry the right sign; month labels no longer shift
  west of UTC; locale-independent money format; Fast Path respected on persona landing.
- The **Critical & Regulated report** export button is back (regulatory profile section).
- Monthly Playback is fully English; its note describes the live curve.
- HRI screen states that the readiness drag does not act while the free-form spline is the live curve.

### Visible differences from v18.8 (render-diff, 8 of 82 sections — all intended)
Industry list (current regulatory counts, e.g. AERO 69 instead of a stale 48) · Monthly detail note (describes the live
curve) · Monthly Playback (English) · Scenarios ("Location only" payback reads "immediate" instead of ">36 mo") ·
Architecture content (dead-function sentence) · Logic verification (+`CC-OV-01`) · Program (+ "cached, same model"
tile) · Data Model (84 persisted keys instead of 82).

### Maintenance
- 30 unreachable functions and 6 constants removed; 24 unused locals removed; `lang="en"`.
- Accessibility pass: accessible names for all form controls, keyboard access for click-only elements.
- AUDIT log bounded (≈1.5 MB → <1 KB after two snapshot captures).
- New tooling: `tools/test-all.mjs` (battery), `smoke` (golden figures), `xss-test`, `state-test` (35 regression
  tests), `handlers-test`, `render-diff`.
- Added: audit check `CC-OV-01`; registry keys `scurve`, `stratApplied` (84 persisted keys).

---

## [v18.8]

### New
- **🤝 Client case persona** (`clientcase`): a curated 19-section workshop storyline for building the case *with* the customer in the room (vs Builder's 45 sections), with its own guided sequence and compact nav; excluded from the v13.2 auto-backfill migration so it stays curated. (L8349, L8373, L8387, L25277)
- **🔗 Section Dependencies rebuilt on DEPS-SPEC v2.0**: `SECTION_DEPS` replaces the hardcoded `DEP_SECTIONS`/`DEP_EDGES`; nodes derive from `SECTION_CATALOG` so deleted sections cannot survive as ghost nodes; lanes/rows follow catalogue menu groups in build order. (L5966, L24195, L24339, L24448)
- Section Dependencies split into four sub-tabs (graph, matrix, description table, editor) with a shared header (integrity notices, legend, counts). (L24454, L5988)
- **✎ Edit dependencies** editor (row-per-source) relocated from 👥 Persona management into Section Dependencies. (L4437, L24934)
- **🌳 Build-order tree**: derives a layered tree from `SECTION_DEPS` and proposes/applies a menu order in true dependency order (group order and/or section order; existing order slots reused, never renumbered). (L24586)
- Dependency edges are persisted (`SECTION_DEPS` state key), travel with persona-only Excel/JSON exports, and round-trip through a new **Dependencies** Excel sheet (one row per edge; the sheet replaces the registry; unknown ids reported and skipped). (L12894, L17218, L17443, L17463, L17745)
- Dependency-registry integrity checks **CC-DEP-01** (blocking: every edge endpoint resolves to a live section) and **CC-DEP-02** (advisory: a `drives`-tagged section actually drives something), plus a boot-time prune of edges to deleted sections. (L21622, L21649, L24291, L25239)
- **🗄️ Data Model** section (Reference & Share): live, introspected view of `SECTION_CATALOG`, `STATE_REGISTRY`, `VARIABLE_REGISTRY`, `COEF_DEFAULT` and `MODEL`. (L6018, L8338, L18560)
- **⚙️ Calculation Engine** section (Reference & Share): ⏱️ Time Engine function surface (with its own three sub-tabs), ⚙️ Engines, the `model()` **overlay contract** table (engine-overwritten vs `modelRaw()` pass-through fields), and the AUDIT invariant registry split armed vs dormant. Initially built inside Data Model, then moved out. (L6056, L6080, L8339, L18580, L18796, L18817, L18958, L19122)
- **🧱 Glass-ceiling funnel** in 🎯 Automation & Glass ceiling: stage-by-stage view from 100% of delivery work down to the depth the case is built on, with monthly playback (month scrubber, auto-plays once per session). Placed in its own card. (L15386, L528)
- **Sidebar section display** setting: global toggle (`SECTION_NAV_STYLE`, persisted) between pill buttons and an underlined tab strip for the collapsed-menu group nav bar. (L8461, L12896, L22588)
- Variable registry per-section coverage extended from 29/78 sections towards 78/78. (L10377)
- Default autosave label "{customer name} — {date-time}" (never overwrites a user-set label). (L13248, L13320)
- Monte Carlo "Run simulation": disabled "Running…" state and a completion toast (n / seed / elapsed / P50). (L12299)
- New `.note-blue` cross-reference callout style. (L234)

### Changed
- **📊 Board** generator: the fixed archetype templates (BUILD/LEVER/ANALYSE/DECIDE/All-in-One) replaced by one generator filtered by selected menu group(s); Board split into two sub-tabs (generator/registry and variable catalogue). (L18321, L18464)
- Generated dashboard cards restyled with their own card class (elevation, labelled key figures) instead of reusing `.card.metric`. (L178)
- The "What the automation is made of" waterfall and the per-factor table were removed from the automation graph (superseded by the glass-ceiling funnel / curve bands). (L15306, L15564)
- `scenarios` and `compare` sections re-tagged `reads` (analysis views that drive nothing downstream, per CC-DEP-02). (L8314, L8319)
- Reference Map row for the deleted 🚀 Client view repointed to 🤝 Engage (coverage full→partial). (L24140)
- Dead `roi` and `client` TABRENDER keys removed. (L18253, L18260)
- Exported "Critical & Regulated Software Delivery" report header bumped to v18.8. (L25114)

### Fixed
- **P3 supervision ceiling was silently inert** under any non-legacy curve (incl. the default spline): the ceiling now lives in the Time Engine kernel via a single pointwise formula shared with the annual path; an uncapped counterfactual (`agentVfteRaw`) is carried for the P3 read-out and CC-SUP checks. (L11844, L11860, L22136, L22169, L14171)
- `model()` overlay extended to all fields derived from the pre-curve trajectory: `runAgenticETP`/`runAgenticCost` no longer frozen at a hardcoded Y3 (feeding Target team, Team-out, Agent details), and agent capacity (`yearAgentCapacity`) correct under Gompertz/Bass curves (Y1 previously overstated). The overlay-contract table documents four v18.8 defects of this class. (L14183, L14211, L18962, L19090)
- Monte Carlo "⚠️ Scenario changed since the last run" banner could never clear: the fingerprint hashed `calculationPackage` (wall-clock `createdAt`), and "Run simulation" stamped it before its inputs existed. (L9145, L9217)
- Recalibration button gave no feedback (operation was correct but idempotent in the default state). *(inferred: feedback added)* (L11582)
- Sub-tab cross-talk: unscoped `.pm-subtab-btn` selectors stripped `.active` from other sections' sub-tab bars; selectors now scoped per section. (L10874, L18464, L18580)
- Deleting a persona now also removes its `PERSONA_SECTION_ORDER` override; restoring a file whose saved/default persona no longer exists (e.g. deleted Builder) no longer fails. (L10603, L10514, L25243)
- Dynamic-section body rows defaulted to format `TEXT`, overriding the bound variable's canonical format; now default to "(auto)". Configure sub-tab selection no longer snaps back on every edit. (L20891, L20914)
- Boot flicker: the group nav bar, the baked-active 🏠 Welcome cards and the top KPI `#scenarioBar` visibly rebuilt 2–4× during boot; now hidden behind the `boot-ready` gate (three passes). (L25425, L25432, L25437)

---

## [v18.7]

### New
- **User-set headline NPV discount rate** (`MODEL.CASE.discountRate`, default 8%) with a control in 🧭 Engagement context; replaces a literal 8% at four call sites; drives every headline "NPV (case rate)" through `npvCanonical()` (KPI id `npv8` kept for compatibility). Distinct from the P5 time-to-market `FLOW.discountRate`. (L613, L11337, L12521, L10250, L15829)
- **Human supervision share** card in Run sizing: dedicated controls for supervision share cap and factor (synced both ways with the Due-diligence register). (L5383, L5309, L9687)
- Coefficient audit: hardcoded coefficients reaching the euro result promoted into `COEF` (incl. three tier-2 literals `setupETP`, `prodFactor`, `aiFinOpsFte`) and given UI controls across six sections (velocity, eligibility, risk, readiness, run-sizing, setup), each mirrored with the Due-diligence register; `DD_COEFFICIENTS` catalogues them with € impact. (L14343, L16201, L16237, L4825, L15773, L16796, L23008, L23691, L23818)

### Changed
- HRI readiness cost/ramp factor now tracks `COEF.hriFloor`/`hriSlope` instead of hardcoded 0.6/0.4. (L23015)
- NPV canary no longer forces 0.08; compares at the current case rate. (L21615)

---

## [v18.6]

### New
- **📐 Maturity levels (L1–L4)** section (first in Tune): `MATURITY_MAP` becomes the single, editable, persisted source of truth for the L1–L4 thresholds previously duplicated in four places (adoption curve, automation graph, FTE/vFTE chart, `maturityLevelFor()`). (L538, L546, L8268, L12893, L22915, L22935)
- **🤝 Engage** section (Frame group): client onboarding runway — the four gated stages (Discover → Calibrate → Validate → Pilot & Prove) and Gantt toggle, extracted from the S-curve timing card. (L897, L879, L8264, L23249)
- Quarterly **plan-vs-actual tracker** reinstated in 🤝 Engage (extracted from the deleted 🚀 Client view), collapsed by default, spanning the full horizon (previously capped at 12 quarters). (L985, L7845, L7911, L7914, L12907)
- **🤖 Automation over time** graph (potential vs realized, with per-factor gap bands and optional human-FTE / manual / vFTE / L1–L4 lines hidden by default), moved into 🎯 Automation & Glass ceiling. (L521, L15192, L15197)
- **Free-point S-curve editor**: drag 3+ control points; a Logistic or Gompertz curve is fitted through them and sampled into the Y1/Y2/Y3 anchors. (L15604)
- Editable **technical automation cap** (`autoCapPct`, default 100% = uncapped) bounding scope-fit, the automation slider and the Monte-Carlo range (replaces static max 80). (L6762, L9099, L14384)
- L1–L4 vertical maturity markers on the FTE/vFTE chart. (L15145)

### Changed
- Default adoption curve switched from logistic to free-form **spline** reaching 100% at Y3; golden headline moved from €1,112,871 to €1,131,220. (L22457, L15609, L4824)
- `params` relabelled **🎯 Automation & Glass ceiling** and moved to the Scope group; 📊 S-curve moved Tune→Scope directly after 🎯 Scope. (L8266, L8267)

---

## [v18.5]

### New
- **🕐 Time Engine** (Time Engine spec v5): a single, horizon-dynamic, pull-based producer for every time-shaped number (curve adapters → monthly kernel → path accumulator → annual aggregation), five curve families, read-only contract (`inputHash`, `calculationVersion`, `materialise()`). Added as a sixth member of `window.AgentCaseArch` and the first live DEP node. (L21794, L4750, L4870, L22481, L4823)
- Canonical **payback / NPV** accessors (`paybackMonthsCanonical()`, `npvCanonical()`), replacing 10 payback sites (two algorithms) and three disagreeing NPV conventions. (L22423, L4880)
- Saved cases carry the canonical calculation package; on load, **staleness detection** flags a case whose figures no longer match. (L13035, L13078, L13091)
- Gantt **generated milestones band** (adoption %, L1→L4, payback, first vFTE) derived from engine crossings. (L19477)
- Live adoption S-curve chart with L1–L4 maturity levels marked. (L889, L15601)

### Changed
- `model()` = `modelRaw()` + engine overlay: Annual, Run, Results, Decision, Excel export etc. now aggregate the live monthly engine; `monthlySeries()` is a thin read layer; `rampAtMo()` and `fgRampCurve()` deleted. (L14132, L14758, L14793, L15120, L19751, L15800)
- Excel export consumes the canonical calculation package. (L7255)
- Snapshot `schemaVersion` renamed `personaSchemaVersion` (both written for one release). (L12984, L13187)
- **🚀 Client view section deleted**: timing controls moved to 📊 S-curve → Transformation timing (Horizon centralised there); executive hook and tracker removed. (L4211, L8315, L2758, L7875)

### Fixed
- Horizon-5 defect: months 37–60 of `monthlySeries()` were `NaN`, making cumulative cash flow and NPV `NaN`. (L4880)
- Monthly path omitted Knowledge-Hub run cost and avoided-KT credit, overstating savings by €67–71k/yr; headline corrected (published delta). (L4823, L4880)

---

## [v18.4]

_Thinly evidenced in the code (5 tags)._

### New
- **Assignment layout board** in Persona management: per-persona section membership (double-click assigns) and per-persona drag ordering. (L11173)
- Persona-only export also emits the persona/section config as **JSON** in native snapshot format (feedable to `applySnapshotState()`). (L17456)

### Changed
- Industry Specialist (`specialist`) section/persona deleted. *(inferred from "'specialist', deleted v18.4")* (L24200)
- v18.4's calculation is the flat-annual step model later reproduced exactly by the `legacy.flatAnnual` adapter (residual team staffed at target TJM). *(inferred, context only)* (L21842, L22041)

---

## [v18.3]

### New
- Sections extracted into their own tabs: **📊 S-curve** and **🧭 Engagement context** and **🏛️ Industry / regulatory profile** (`transform-params`) out of Parameters; **📊 Product status lifecycle weighting** out of Scope (absorbing the deleted lifecycle-doc metrics); **🎯 Phase scope** out of the deleted Guided Setup wizard. (L604, L605, L705, L1007, L1121, L1808, L18274, L18280)
- **Customer name** metadata: app header "AgentCase for <name>", browser title, Excel Parameters row, and export filename prefix. (L12805, L13628)
- **Default persona** flag (single, radio) — the persona the app opens on; round-trips via a Default column in Excel. (L8478, L10740, L17628, L17645)
- Editable **per-group colours** (`GROUP_COLORS`) shared by sidebar headers, Welcome cards and Persona management; Excel Color column. (L10203, L10787, L12901, L17703)
- Graphical **Menu layout board**: drag section cards across group columns, right-click for a live section preview pane. (L11078, L11085)
- Scope "Show selected only" view filter (default on). (L6695, L6706)
- Team sizing auto-widens pod size until the residual team can absorb the topology (keeps CC-OM-01 feasible for lean Y3 teams). (L23196)

### Changed
- Builder's stage groups promoted into the global `SECTION_CATALOG` — all personas now share one grouping; per-persona group override emptied. (L8445)
- Admin persona curated (never backfilled). (L25276, L25296)
- Model (Classic/Mod. Eng.) toggle shown only for Advanced; wizard step chips shown for every step. (L10540, L9312)
- Blank build-path tags normalised to `supports`. (L25386)
- Presales lab and Guided Setup wizard sections removed (functions guarded as no-ops). (L8086, L8102, L18280)

### Fixed
- Stale import/export status message (incl. baked example) cleared on open. (L17963)

---

## [v18.2]

### New
- **Builder persona**: curated 40 build-path sections + Welcome from the Section Stage Matrix (dated 2026-08-06), filed under 10 stage groups (Frame, Baseline, …) via a per-persona group override; excluded from auto-backfill. (L8411, L8435, L10185, L25268)
- **Build-path tags** (`drives`/`shapes`/`reads`/`supports`) and **MVP flag** per section, editable in Persona management, shown as live badges in each section's heading, round-tripped via Excel (header-located Tag/MVP columns). (L10968, L10985, L25357, L17728)
- **Fast-Track Path** top-bar toggle filtering the menu (and guided wizard) to MVP sections + Welcome. (L22652, L9266, L10491, L22561)
- One-click **guided-sequence generator** (groups → steps). (L9499)
- Excel export **scopes**: full, no-factory, persona-only. (L17024, L17441)

### Changed
- Header right-side controls wrap as one group. (L22708)

---

## [v18.1] 2026-08-04 🎨 Capgemini Engineering rebrand

### The app is re-skinned to the Capgemini Engineering design system — colour, type and logo, no logic touched

A pure presentation-layer batch: no change to `model()`, `phaseScope()`, any cost/saving formula, or the persistence layer. Golden case bit-identical throughout (Y3 €769,788.9296875, run €1,007K), re-verified after the batch — including a self-inflicted parser-breaking regression caught and fixed within the same release (see Fixed).

**New — Brand system**

- **Ubuntu typeface, embedded.** Light/Regular/Bold weights embedded as base64 `@font-face` so the file stays a fully portable, offline single HTML document (no external font CDN) — the app's body copy, headings and former `Georgia` display headlines now render in Ubuntu.
- **Brand colour remap.** Every colour in the app's ad hoc palette (~18 hex values, several thousand occurrences across static markup and generated HTML) mapped onto the Capgemini Engineering palette — primary navy → Capgemini Blue `#0058AB`, darker tones → Dark Blue `#121A38`, the bright accent → Light Blue `#1DB8F2`, greens/teals → Teal `#00828E`, ambers → Terracotta `#BE4D00`, purples → Purple `#71609E`, reds → Deep Red `#8F3237`. Neutral/light backgrounds (already a cool blue-tinted grey) were left as-is.
- **Header wordmark.** The Capgemini Engineering logo is inlined as SVG in the top-right of the header (no external asset), sized as a discreet corner mark rather than competing with the page title.
- **Chrome polish.** Card/container corner radius bumped toward the brand's 16px, shadows re-tinted navy instead of flat black, focus rings switched to the brand's 3px Light-Blue ring, and centralised `.badge` colour pairs recoloured to the new palette.
- **Guided-sequence accent harmonisation.** Two step cards ("Engagement context", "Product status lifecycle") that had kept an unrelated yellow/terracotta accent border now match the rest of the sequence in Capgemini Blue; the wizard's dark metrics ribbon was lightened from near-black Dark Blue to Capgemini Blue for a less heavy top band.

**Fixed**

- **Self-inflicted parse break in the headline font swap.** Replacing the unquoted `Georgia,serif` font-family with a quoted `'Ubuntu'` value silently broke JavaScript in the handful of spots where that CSS text lived inside a single-quoted JS string (e.g. `body+='…font-family:Georgia,serif"…'`) — the inserted quote closed the string early, producing a `SyntaxError` that killed the entire ~14,000-line application script block. `applySnapshotState`, `PM`, `syncState` and `refreshAll` all silently became `undefined` while the page still looked populated (AgentCase bakes its last-saved state into static HTML, masking the break). Caught by extracting the script block and parsing it standalone with `new Function(source)`; fixed by dropping the unnecessary quotes around the (single-word, quote-free-by-CSS-rules) font name everywhere.

## [v18.0] 2026-08-03 🧭 Guided-sequence UX 📖 Section help 🗂️ Session manager

### The guided sequence becomes a real authoring & navigation tool, every section gets an inline help toggle, and the top chrome is decluttered end to end

A UX- and workflow-focused batch: nothing here touches `model()`, `phaseScope()` or any cost/saving formula. Golden case bit-identical throughout (Y3 €769,788.9296875, run €1,007K), re-verified after every single change in the batch — including a self-inflicted regression caught and fixed within the same release (see Fixed).

**New — Per-section contextual help**

- **"?" help toggle on every section title.** All 75 static sections now carry a small "?" button at the end of their `<h2>`; clicking it expands a "📖 What this section does" panel directly under the title (`toggleSectionHelp()`), instead of a note buried at the bottom of the tab. 38 sections had their existing bottom-of-tab explainer content moved up as-is; the 37 that had none got a freshly drafted explainer, grounded in each section's own `SECTION_CATALOG` description.

**New — Guided sequence (wizard): built to actually author and navigate, not just play back**

- **Per-step section picker.** A step bundling several sections (e.g. "Levers" = 5 sections) used to force a linear Prev/Next crawl through all of them. Every multi-section step now shows one chip per section — labelled, hoverable with its description, jump-to-it directly — with the current one highlighted and visited ones checked off.
- **Sequence editor rebuilt around tags, not copy-paste.** Persona management's guided-sequence editor was a raw `Label | sectionId,sectionId,…` textarea — every section typed or pasted as a bare id, with a separate Save step. It is now a per-step card: sections are removable chips added from a dropdown (grouped by menu group), steps can be added, removed and reordered, and every action commits immediately — nothing to type or paste.
- **Section tags are drag-and-drop reorderable** within their step (native HTML5 drag-and-drop, no library) — drop on another tag to slot in before it, drop in the step's empty tag area to send it to the end. Scoped to the same step only; a cross-step drop is a safe no-op.
- **Guided-sequence focus mode.** While the wizard is running, the sidebar (plain and collapsed menu mode alike), the persona selector, the "☰ Menu" button and the page's own title banner are all hidden — the wizard bar's step chips and section picker are the only navigation left competing for attention. Everything is restored exactly as it was on exit.

**New — Session manager**

- **Promoted to its own top-level section** ("🗂️ Session manager"), out of the 📥 Import/Export tab it shared with the Snapshot library — reachable from Presales, Briefing and Advanced; the "🗂 N other sessions" scenario-bar chip now opens it directly.
- **🗑 Clear all sessions** — wipes every autosaved session in this browser in one action, same two-click confirm discipline as the existing per-row delete.

**Changed — Top chrome & navigation**

- **💾 Save HTML Snapshot is now an icon-only button** in the scenario bar, next to search; the "Model: classic/modelling engine" badge moved beside it, with the Sessions badge now appearing after it.
- **Briefing's menu now opens on 🏠 Welcome**, ahead of 🧭 Guided Setup (formerly "🚀 Start here", renamed) — a per-persona order override; Presales and Advanced unaffected.
- **App title is clickable** — one click returns to Welcome from anywhere. The existing 5-clicks-in-2s Advanced-unlock gesture on the same title is now a genuine toggle: the same gesture re-locks Advanced once it's unlocked, instead of doing nothing.
- **Collapse-mode bar gets a 🏠 home icon**, immediately left of the group dropdown, and now lays out on three explicit lines (☰ Menu + persona · 🏠 + group · section buttons) instead of an unpredictable wrap.

**Fixed**

- **Boot-time menu flicker.** The sidebar's raw HTML bakes in one persona's full unfiltered menu as its literal starting markup; only JS running after parse rewrites it to the real persona's filtered one. The gap between the two was visible on every load. The sidebar now stays `visibility:hidden` until a `boot-ready` class — set as the very last line of boot, after both `setPersona()` and the embedded snapshot restore have run — reveals it already correct.
- **Self-inflicted explainer corruption, caught in the same release.** The first pass at the per-section help toggle used a non-greedy regex to relocate each section's explainer block; for the handful whose explainer contained its own nested `<div>` (Quality, Compliance, Sensitivity), it stopped at the wrong closing tag and silently swallowed the section's live chart/table/controls into the collapsed help panel. Caught by an automated sweep for functional elements (tables with an id, canvases, inputs) trapped inside a help panel; fixed with a depth-counted matcher and re-verified across all 75 sections.
- **Group dropdown stretching to full width in collapse mode** — `.gnav-select` was missing the same `width:max-content` fix already applied to `.gnav-persona` in v17.1, so once the 🏠 icon forced it onto its own line it stretched to fill the row instead of sitting next to the icon. Same fix applied.

**Unchanged.** No calculation path, section content or persona-reachable-section list is affected by any of the above beyond the ordering/renaming noted. Golden case bit-identical throughout every change in this batch, individually and cumulatively — verified via live-browser script-compile checks, DOM structural assertions and real UI interaction (clicks, drag-and-drop, persona switches) after each one, not just at the end.

## [v17.2] 2026-08-02 🧭 Story Mode 🗂️ Session Persistence

### A guided narrative through the whole case, per-persona navigation control, and a browser-native safety net — three independent additions landing together

No shared theme beyond "shipped in the same batch" — each piece is additive and independently useful. Golden case bit-identical throughout (Y3 €769,788.9296875, run €1,007K), verified after every piece and again at the end of the batch.

**New — Story Mode (SM-SPEC v0.1)**

- **🧭 Guided sequence, built on the Briefing persona.** Rather than inventing new wizard machinery, this reuses the app's own pre-existing, persona-data-driven `seq` mechanism (the same one `presales` already had) — Briefing's sequence now walks Input → Levers → Governance → Analyse (Team & Agents / Cost & Economics / Delivery Metrics, one chip each) → Decide, 38 sections across 7 steps, with the existing Start/Next/Prev bar, step chips and progress percentage.
- **📖 "The story so far"** — one new section, a one-page AS-IS → TO-BE narrative close (baseline vs target across team, cost, delivery, and — if the Modelling Engine is on — the P6 confidence grade), distinct from the detailed AS-IS vs TO-BE comparison tab. Closes the Decide step.
- Fixed a latent gap found while building this: the embedded boot-restore blob predated Presales's own guided sequence, so `presales.seq` was being silently wiped on every load. Patched alongside Briefing's new one.

**New — Per-persona navigation control**

- **Section order is now per-persona** (sparse override, falling back to the existing global default) rather than one shared order for every persona. Editable directly in Persona management's "Assigned sections" table, or synced in bulk from a persona's own guided sequence via a new "🧭 Sync section order to sequence" button — scoped to that one persona only, verified to never move another persona's menu.
- **⎘ Duplicate persona** — copies a persona's menu membership and guided sequence into a new persona (order and compact-nav intentionally not copied, so the duplicate starts from a clean slate on those two).

**New — Session Persistence (browser-native autosave)**

- **🗂️ Autosave, IndexedDB-backed, one record per browser tab.** A rolling ~2s-debounced autosave of the working session, invisible and automatic — a safety net between deliberate saves (💾 HTML Snapshot, 📸 named Snapshots), never a replacement for them. Reload a tab and a non-blocking banner offers to restore where you left off.
- **Session manager** (Import/Export tab, next to the Snapshot manager) — every tab's autosaved session in this browser, listed newest-first, individually restorable, renameable and deletable; a small header chip ("🗂 N other sessions") surfaces the others without interrupting whatever you're doing.
- **Multi-tab by construction, not by patch** — each tab gets its own IndexedDB record (keyed by a `tabId` stable across reloads of the same tab, distinct per tab), so two tabs never clobber each other; a `BroadcastChannel` keeps an open session manager live across tabs. Capped at 20 records, oldest pruned first.
- Degrades safely: private/incognito or IndexedDB-disabled browsers show the toggle disabled with an explanation and the rest of the app is unaffected; quota-exceeded, corrupted-record, and the IndexedDB-specific `onblocked`/`onversionchange` multi-connection cases are all explicit, tested failure paths, not assumed.

**Changed**

- **Persona selection now reads visually distinct from section navigation.** The active-persona pill (sidebar) and the collapse-mode persona control were both the identical navy used for "current section" — confusing at a glance. Both are now amber, matching the app's existing "context/mode" colour language (e.g. the engagement-context badge).
- **Collapse-mode persona control is a dropdown, not a button row** — a button per persona read as more menu items, which was exactly the confusion above; sized to content instead of stretching the full row.
- **Advanced-persona unlock also triggers from the "AgentCase" title** (5 clicks within 2s), in addition to the existing "PERSONA" sidebar-label gesture — the sidebar label is `display:none` whenever a persona's compact-nav is on, which made the unlock gesture unreachable in exactly the personas most likely to need it.

**Unchanged.** No calculation path, no existing section, no other persona touched. Golden case bit-identical throughout every piece of this batch, individually and cumulatively — verified via direct save/restore round-trips (a marker value written, mutated away, and correctly restored), real UI clicks (not just console calls) on every new control, and a dedicated cap-enforcement test (26 records correctly pruned to 20).

## [v17.1] 2026-07-31 🏁 Golden Case Transition GCT-SPEC v0.1

### A governed path from the parametric golden case to the AME engine — one toggle, one comparison, one gated promotion

v17.0 shipped the Agentic Modelling Engine off by default, so it had never been exercised against the number everyone actually quotes. v17.1 answers the follow-on question — what would the golden case become under the new engine, and on what basis would it ever replace the one in use today — without ever putting the existing €770K reference at risk while that question is open. No modelling formula changes; the golden case is bit-identical throughout, including through every scenario in this release's own QA pass.

**New**

- **⚙️ Master engine toggle** — a single labelled pill in the top scenario bar ("Classic model" / "Modelling Engine"), visible from every section and persona, that turns P1, P2, P3 (Provisioned), P4 and P6 on or off together for the live case. Reuses each phase's own enable/disable function rather than duplicating logic; never touches a Provisioned/Constrained choice already made in P3's own section, and never enables P5 — both require data nobody has supplied yet.
- **🧪 AME reference snapshot** — captures the live configuration as a second, distinct candidate reference alongside the protected golden case, tagged with which phases were active and which golden snapshot it was built from. At most one at a time; capturing a new one demotes the previous rather than allowing two candidates in play.
- **Golden vs AME comparison view** — Y3 savings, run cost, NPV and payback side by side with signed deltas, a per-phase attribution breakdown, the AME reference's P6 case-confidence grade, and a staleness warning if the golden case has moved since the reference was built.
- **🏁 Promotion gate** — replaces the golden case with the AME reference only when an internal owner is recorded and a decision about any external material citing the old figure is made explicit; a two-step confirmation; the superseded golden case is kept, unprotected, never deleted, for audit trail. Supports repeated promotion cycles.

**Unchanged.** No function delivered under AME-SPEC v0.2 or the v16.x line is modified. Golden case bit-identical throughout: Y3 saving €769,788.9296875, run cost €1,007K — verified after every new control, across two independent promotion cycles, a regression sweep of 14 tabs including all six Mod. Engine sections, and every pre-existing snapshot-manager action (export, baseline, delete).

## [v17.0] 2026-07-31 🧠 Agentic Modelling Engine AME-SPEC v0.2 P0→P6

### A phased replacement of the parametric savings model with a behavioural one — seven opt-in phases, every one bit-identical to the golden case when off

AME-SPEC v0.2 lands in full: seven phases (P0 foundations plus P1–P6 modelling layers), each gated behind its own flag in a new `MODEL` namespace, each verified byte-identical against the golden case (Y3 €770K saving, run €1,007K) with its flag off, and each built by reusing an existing calculation path rather than duplicating it. A new **Mod. Engine** persona surfaces the six P1–P6 sections together for anyone evaluating the engine on its own.

**New**

- **P0 — foundations.** A dedicated `MODEL` global (`modelDefaults()` / `modelBoot()` / `modelStage()`), registered in `STATE_REGISTRY` so it snapshots and restores like any other state. Seeded numerics built from scratch to support every later phase: `mulberry32` PRNG, `bisect()`, `quantile()`, `betaFromMeanCI()`.
- **P1 — loop convergence economics (🔁 Model — Convergence).** Replaces the flat internal-token multiplier with an acceptance-probability-driven expected iteration count (`lceExpectedIter`/`lceEscapeRate`), calibrated to reproduce today's multiplier exactly at boot so the switch-on moment is continuous, not a jump. Feeds `loopInternalTokenCost()` directly. 3 logic checks (CC-LC-01…03).
- **P2 — endogenous verification tax (🧪 Model — Verification).** Replaces the flat verification-tax dial with a rate derived from artefact criticality class, base failure probability and reliability (`evtEndogenousTaxRate`), exposing a regulatory ROI ceiling (ρmax) that a client can hit even at perfect reliability — independent of the pre-existing model's assumption that more reliability always means more saving. Feeds `verificationTaxRate()`. 5 logic checks (CC-VT-01…05).
- **P3 — supervision priced as a decision (👁️ Model — Supervision).** Two named modes exposed as a toggle: **Provisioned** (solve for the headcount the workload needs and price it — the existing hybrid formula, never capped) or **Constrained** (fix headcount and let it cap achievable agentic capacity — its mathematical inverse). Includes a DORA read-out (deployment frequency, change failure rate, lead time) pulled forward from P5 so a supervision decision can be read against delivery reality in the same tab. 5 logic checks (CC-SC-01…05).
- **P4 — stochastic layer & baseline drift (🎲 Model — Stochastic).** A second, deliberately separate Monte Carlo layer from the pre-existing one: genuine Beta/Triangular/Lognormal draws (Lanczos log-gamma, continued-fraction incomplete beta, closed-form triangular inverse, Box-Muller normal) over the named P1/P3 economic drivers, correlated within an organisational vs. exogenous group via a one-factor Gaussian copula. Ships a tornado chart and a convergence trace. Alongside it, counterfactual baseline drift (CBD) separates gross savings from savings actually attributable to the programme once a counterfactual cost trend is assumed. 3 stochastic checks (CC-MC-01…03) + 1 CBD check (CC-CB-01).
- **P5 — flow & value model (🌊 Model — Flow & value).** Little's Law cycle time (`flowCycleTime`/`flowWip`) throttled by P3's own supervision cap — a supervision-constrained team measurably slows delivery in the same model that priced it. A sponsor-owned time-to-market value calculation (`flowValue`) sits alongside, deliberately *not* auto-seeded: margin-per-month is revenue data no engineering default can honestly stand in for, so the panel shows "hidden, not zero" until a sponsor supplies it, guarding against double-counting against the existing cost-out savings. 1 logic check (CC-FL-01).
- **P6 — evidence ledger (📋 Model — Evidence).** Every named driver from P1–P5 gets an evidence entry — tier (MEASURED/BENCHMARK/ASSUMPTION), source, as-of date, owner — weighted by P4's real tornado influence rather than an arbitrary priority list, rolling up into a stage-benchmarked case-confidence grade (A–D) and a ranked upgrade path showing which single piece of evidence would move the grade fastest. Deliberately positioned as a companion to the existing Due-diligence register, not a replacement. 3 logic checks (CC-EV-01…03).
- **🧠 Mod. Engine persona** — a new persona reaching Home plus all six P1–P6 sections, for reviewing the modelling engine as a coherent whole independent of the main business-case flow.
- **22 new logic checks** registered in the existing `AUDIT` framework (CC-LC/CC-VT/CC-SC/CC-MC/CC-CB/CC-FL/CC-EV), every one gated on its phase's flag so they are inert on the golden case.

**Changed**

- The pre-existing flat verification-tax function is retained, renamed `legacyVerificationTaxRate()`, and used as P2's fallback when the flag is off — the switch is a single call-site branch, not a rewrite.

**Unchanged.** Every phase is additive and flag-gated: with P0–P6 off, `model()`, `phaseScope()`, `verificationTaxRate()`, `targetTeam()` and every existing cost/saving path are byte-for-byte what they were in v16.3. Golden case verified bit-identical after every phase, individually and cumulatively: Y3 saving €769,788.9296875, run cost €1,007K. Delivered phase by phase (engine, then UI, then verification) against AME-SPEC v0.2, each phase's live-browser verification run before moving to the next.

## [v16.3] 2026-07-27 Version marker Golden-case reference

### A marker release — version strings unified to v16.3, the stale build constant corrected, no functional change

No modelling, UI or data change. The build is byte-for-byte v16.2 with only the version identifiers advanced, so v16.3 can serve as a clean golden-case reference point. Verified on a fresh load: golden case bit-identical at Y3 €770K saving / run €1,007K, zero console errors.

- **Version strings unified to v16.3** — the `<title>` and the header `<strong>AgentCase v16.3</strong>` badge.
- **Stale build constant corrected** — `window.AgentCaseArch.VERSION` was left at `'16.0.0'` through the v16.1 and v16.2 builds, so Playwright assertions and every version-tagged export (`appVerTag()`) were reporting the wrong build. Now `'16.3.0'`, matching the title.
- **Schema anchor unchanged** — snapshot `schemaVersion` stays `'15.0'` by design (it marks schema compatibility, not the build number), so snapshots round-trip across every v15.x/v16.x build exactly as before.

## [v16.2] 2026-07-27 🧬 Factory generation Weekly time base Monthly adoption curve

### The Factory group stops shipping a fictional dataset and starts generating from the case in front of you

The Factory group now generates its whole meta-model from the current case — over its own horizon, on its own calendar, with adoption following a monthly curve through the three annual breakpoints. No euro figure moves: golden case bit-identical at Y3 €770K saving, run €1,007K.

**New**

- **🧬 Generate data** — one button in Factory Model. Builds the whole meta-model (Vision → Portfolio → Epic → Feature → Story → Task, releases, RCs, approvals, deployments, commits, builds, gates, monitoring, feedback) from the current scope, over the case horizon, anchored on the Gantt calendar. Deterministic: same case and seed give the same output.
- **Weekly time base** — events carry week-resolved timestamps and follow the phase schedule: a phase opening in week 34 produces its artefacts in week 34. Nothing is emitted for a week in which no phase is open.
- **Monthly adoption curve** — adoption progresses from 0 through the three annual breakpoints (months 12, 24, 36) as a monotone monthly curve rather than three annual steps. Generated agent authorship follows it: 31% → 42% → 54% → 62% by quarter on the golden case. The curve drives event generation only; the cost model keeps its annual figures.
- **Two-step confirmation** — generating over existing data shows the actual record counts that will be deleted and requires a second, deliberate click. Cancel is the default.
- **Minimum-sample suppression** — a rate computed over fewer than 5 events shows the sample size instead of a number. Two deployments give a change-failure rate of 0, 50 or 100%; reporting that as a measurement would manufacture precision the data cannot support. Counts and scope-derived task shares are exempt.
- **Generator parameters in the due-diligence register** — all 25 appear as PC4 (unvalidated), editable in place, with the *Used in* column showing **display**: they shape illustration, not euros.

**Fixed**

- **Engineering view was quadratic (F10)** — every commit row rendered a `<select>` holding the full task list, so the cost grew as commits × artefacts. Invisible with the 18-record demo dataset; it exhausted a 2 GB heap at 662 commits. Rendered rows are now capped at 100 with a "showing the first 100 of N" notice, and the task option list is memoised. The underlying arrays are untouched and every KPI still reads all of them.

**Unchanged.** `model()`, `phaseScope()`, `computeGlassCeiling()`, `monthlySeries()` and every cost path are untouched by the generator. Golden case €770K / €1,007K to the last decimal — before generation, after generation and after clearing. Human supervision never falls below an artefact's floor in any week of the horizon, asserted in test. Delivered as five ordered patch scripts with exact match-count assertions, each validated by `node --check` and a golden-case non-regression run.

⚠️ **Read this before showing it to a client.** Generated events are simulated from the case's assumptions, not measured data, and the provenance strip says so on screen and in every export. Two figures will differ, and the difference is deliberate: reading the ramp values as breakpoints in time makes the curve's annual averages (11/41/74% on the golden case) lower than the model's annual figures (25/55/85%). The model states the year's representative level; the curve states the path.

## [v16.1] 2026-07-26 🧾 Due diligence Auditability

### No new modelling capability, one purpose — make the model auditable

Eight verified defects fixed, sixteen internal coefficients surfaced for the first time, and a new register of what a client must confirm for the case to be defensible. No euro figure moves — golden case bit-identical at Y3 €770K saving, run €1,007K.

**New**

- **🧾 Due diligence** — new section in the Reference & Share group, present in every persona. Consolidates 52 elements requiring client confirmation: inputs (consumed from the Assumptions register, not duplicated), metric anchors, and the coefficients embedded in the calculation path.
- **Embedded-coefficient inventory** — 16 coefficients that drive the euro result surfaced with their live value, location and effect. Nine of them are editable nowhere in the interface, so until now the question "where does that number come from?" had no answer, even internally.
- **€-weighted coverage** — one-at-a-time +20% perturbation on Y3 savings, run on demand and cached. Function-embedded coefficients are measured by temporarily wrapping the binding, so no refactor of the calculation path is required and nothing is left changed. Answers the only question that matters: how much of the euro result rests on something nobody has checked.
- **Due-diligence pack** — Excel export grouped by confirming role (DSI, delivery, quality, certification, engagement, product, HR), phrased as evidence requests in the client's terms rather than as parameter names. Annotated packs re-import; the import path writes state, owner, due date and note only and cannot change a model value.
- **Editable metric anchors** — DORA and throughput anchors extracted from hardcoded literals into state, so a client-specific baseline can be set.

**Fixed**

- **Anchor overshoot (F9, F9b)** — `perfRel()` is clamped to 1.4, but three functions each carried their own unclamped interpolation. The build displayed a lead time of −2.1 d, a review cycle of −2 h and a doc-sync rate of 103%, plus eleven values beating the target they were measured against. Every interpolation now clamps to the declared target. 14 displayed values change across Velocity, Productivity, Quality and the KPI scorecard; Y0–Y2 are unchanged — only the overshoot is corrected.
- **Factory KPIs ignored the scope (F1)** — `fmAllTasks()` returned the whole 53 + 370 catalogue, so autonomous-completion, human-intervention and agent-test-share were catalogue constants that never responded to the case. Now scope-aware: 423 → 10 tasks on the default scope.
- **Lead time stated three ways (F6)** — the KPI scorecard carried "14 wk → 6.5 wk" and "2-4 wk → 2-4 d" while Velocity carried "21 d → 1 d". Single source now.
- **Quality target uneditable and invisible (F8)** — the target was consumed by the interpolation but never rendered and never editable, so an operator could set a client's real baseline but not the target it was measured against. Now an editable field per row.
- **Deploy frequency divisor (F2)** — a single deployment returned 0 and two close ones inflated the rate. A single point has no observable frequency and now reports as such.
- **Production environment keyed by name (F3)** — renaming the environment silently zeroed three KPIs. Now keyed on an `isProd` flag with a sequence fallback.
- **Cost per story point retired (D2)** — story points are a team convention, not a measurable property. Replaced by figures derived from the model.

**Changed**

- **Glossary corrected (AL7)** — the ramp was described as an "S-curve adoption ramp". No S-curve exists: it is three annual anchors held constant within each year. The glossary now says so.
- **Explanation surfaces** — the ramp (Parameters), the four-point reading resolution (Velocity) and the month-12/24 step (Monthly) are now explained in place, as facts rather than disclaimers.
- **Provenance notice** — the Due diligence tab states permanently that the shipped defaults are engineering estimates with no cited source, and that confirming them is what the register is for.

**Unchanged.** Calculation core byte-identical across 15 functions (`model`, `phaseScope`, `computeGlassCeiling`, `targetTeam`, `verificationTaxRate`, `monthlySeries`, `perfRel` …). Golden case Y3 €770K saving / run €1,007K, to the last decimal. KPI economics table identical row for row; payback, NPV and the financial sheets untouched. Delivered as seven ordered patch scripts with exact match-count assertions, each validated by `node --check` and a golden-case non-regression run.

## [v16.0] 2026-07-25 Onboarding UX Hide-menu mode 📊 Factory KPIs

### Navigation and onboarding UX — a dynamic Welcome, a compact hide-menu mode, and the Factory KPIs surfaced as their own section

A UX-only release on top of the v15.8 Factory meta-model: nothing here is read by `model()`, `phaseScope()` or any cost/saving formula, and the golden case (Y3 €770K, run €1,007K) stayed bit-identical throughout.

- **Dynamic Welcome.** The Home page now builds one card per navigation group from the live group list and the current persona's reachable sections (`renderHomeCards()`), each card carrying the group's own editable description and deep-linking to the first section of that group. Groups a persona can't reach produce no card, so the Welcome reshapes itself per persona instead of listing a fixed set.
- **Hide-menu compact mode.** A ☰ toggle collapses the sidebar and replaces it with an in-content group nav bar above the section title (`toggleMenuHidden()` / `renderGroupNavBar()`), so an operator can move within the current group without the full sidebar. The mode is also a per-persona default (`compactNav`, editable in Persona management) — the Sales persona now starts compact.
- **📊 Factory KPIs surfaced as a section.** The 14 DORA + agentic metrics introduced with the v15.8 Factory meta-model now have their own tab, computed live from the Release Pipeline / Engineering / Factory Model data and bindable as Board variables like any other metric.

Verified: golden case bit-identical; Welcome cards regenerate on persona change; the hide-menu toggle and the per-persona compact default both behave as authored; no console errors.

## [v15.8] 2026-07-24 🏭 Factory meta-model 11-group navigation Accessibility

### A canonical Software/Agentic Factory meta-model, a reorganised navigation, and an accessibility pass — all additive, golden case untouched

The largest single-session addition to date: an entire Software/Agentic Factory meta-model layered alongside the existing engine as pure metadata and display, plus a navigation reclassification and a sidebar contrast fix. Nothing here is ever read by `model()`, `phaseScope()` or any cost/saving formula — the golden case (Y3 €770K, run €1,007K) stayed bit-identical through every change, verified against a genuinely fresh cold-boot each step.

- **🏭 Software/Agentic Factory meta-model — a graph, not a tree, built in six verified phases.** A new **🏭 Factory Model** section holds the Business + Delivery domain (Vision → Portfolio → Epic → Feature → Story), each Story optionally linked down to the existing 53 SDLC / 370 regulatory artefacts (a "Task") and each Feature to the SDLC phases it runs through — extending those records with optional `storyId`/`capability`/`agentActivityType` and `featureIds[]` fields only, never renaming or replacing anything the financial engine reads.
  - *🚀 Release Pipeline* — a deliberately separate flow (Release-on-Demand, not a sprint/PI descendant): Release → Release Candidate → Approval → Deployment → Environment (6 seeded promotion stages) → Monitoring → Feedback → Backlog, with polymorphic Release Items (Story/Feature/Fix/Technical Change) and orphan-on-delete discipline throughout.
  - *⚙️ Engineering* — Commit → Build → Build Artifact → Quality Gate → Integrated Product (illustrative, operator-entered — AgentCase has no live CI/CD to pull from). "Build Artifact" is deliberately renamed from the referential's plain "Artifact" to avoid colliding with AgentCase's existing SDLC/regulatory "artefact" vocabulary.
  - *📅 Factory Timeline* — a brand-new, **separate** section (the existing 📅 Gantt/Timeline is untouched, byte-for-byte): a Business-chain structural view plus a real calendar timeline of every dated Release-pipeline/Engineering event across seven swimlanes.
  - *14 DORA + agentic KPIs* (deployment frequency, promotion lead time, rollback/failed-deploy rate, approval duration, autonomous-completion & human-intervention rate, quality-gate pass/rework rate, commit volume, agent-driven test share, build success rate, …) joined into the existing Variable registry so Board cards can bind to them like any other metric.
  - *Full Excel round-trip* — 18 new sheets export and re-import with defensive FK validation, verified byte-perfect through an export → wipe → re-import cycle.
  - *Demo-dataset loader and delete-all control* — a "🧪 Sample data" card on the 🏭 Factory Model tab loads a realistic, cross-linked dataset spanning ~2.7 months (57 dated events across all seven timeline lanes) or clears every Factory array back to empty, both gated behind an arm-then-confirm step and both runtime-only, so the protected golden snapshot always reflects an empty Factory meta-model.
- **Navigation reorganised from 7 groups into 11 functional groups.** The overloaded `LEVERS` (21 sections) and `DECIDE` (23 sections) catch-alls were split by purpose into 🎛️ Inputs, 🎚️ Levers, 👥 Team & Agents, 💰 Cost & Economics, 📈 Delivery Metrics, 🎯 Decide, 🚀 Go-to-Market, 🏭 Factory, 🛡️ Governance & Compliance, 🏛️ Reference & Share and 🔧 Configure — a pure `SECTION_CATALOG[i].group` reassignment, since the nav, persona tables and Excel sheets are all already data-driven off `GROUPS` × `SECTION_CATALOG`. The Sales persona now reaches every section except the Factory and Configure groups.
- **Section Dependencies extended to match the real calculation chain.** The 🔗 dependency map (untouched since v14.3, covering 25 of 66 sections) gained the three genuinely missing calc-chain edges found by code trace — Location strategy (blended day-rate → setup/run/financial), Run-team sizing (AgentOps cost → run/financial) and the Agent Directory external-rework loop (→ financial) — with the ~20 other candidates confirmed as correctly-excluded display/leaf views.
- **Architecture chapter refreshed to describe the instant-t build.** The 🏛️ Architecture — Layers pages dropped all version-history framing (staged "Phase N is now done" narrative, per-lot version badges) in favour of a plain present-tense description of what is wired today, plus a short "known limits & opt-in switches" note; the Factory meta-model and Section Board are now both documented as current additive subsystems.
- **Accessibility — sidebar group headers fixed.** The group labels (`#8a94b0` on white, ~3.0:1 — below the WCAG AA 4.5:1 floor for small text) now sit on a pale ice band with dark navy text (~9:1, passes AA + AAA), which also visually chunks the 11 groups.

Verified throughout: golden case bit-identical after every change (checked via an isolated fresh cold-boot, since the dev browser tab does not reliably give a true reload); all 67 tabs render with zero console errors; the full Factory Excel round-trip is byte-perfect; the new group scheme survives a fresh load (confirmed neither `GROUPS` nor `SECTION_CATALOG` is captured in the embedded boot-restore snapshot before relying on it).

## [v15.7] 2026-07-23 📅 Gantt/Timeline Golden-case protection Agentic Setup

### A protected reference case, versioned exports, and a delivery-schedule visualisation rebuilt twice against real feedback

The largest single-session addition since the Section Board: a new 📅 Gantt/Timeline section modelling the whole engagement — plus golden-case protection and a consolidated Agentic Setup tab. The Gantt went through two substantial rebuilds after direct user correction ("nothing aligned with reality", "you need at least one full phase cycle for 1 release") — both are recorded here since they materially shaped the final design. No calculation formula touched anywhere; golden case (Y3 €770K, run €1,007K) re-verified after every change, dozens of times.

- **Golden case is now a protected, un-deletable snapshot, with a one-click reset.** On first boot (or after a snapshot/Excel/HTML restore), `ensureGoldenSnapshot()` captures the fully-restored reference state — deterministically, at the end of `applySnapshotState()`, so it can never race the restore — and pins it first in the Snapshot manager as `protected`/`isGolden`, with delete blocked and a "🔄 Reset to golden case" banner button (`snapResetToGolden()`).
- **Every export now carries the app version in its filename**, via new `appVerTag()`/`appVerFileTag()`/`withVerTag()` helpers reading the single `window.AgentCaseArch.VERSION` source of truth: named snapshots, the downloaded HTML snapshot (`AgentCase_v15_7_Snapshot_<timestamp>.html`), and both Excel exports (`..._v15_7_Parameters_<timestamp>.xlsx` / `..._Financial_...`).
- **📅 Gantt/Timeline — a new section modelling the whole engagement on one shared calendar.** Two bands: the **Transformation program** (Discover→Calibrate→Validate→Pilot & Prove, from the 🧭 AI Readiness roadmap, then Agentic Build/Run) and the **Delivery rollout** (every in-scope SDLC phase, regulatory artefact and 🔶 Cross-cutting work), both anchored to real dates.
  - *Weighted, not static.* Phase/artefact/cross-cutting durations are sized by their real effort weight (`a.w = effort × lifecycle`, the same basis as every other scope aggregate) instead of the old static `p.sdlc` field, and compressed by an automation-velocity ramp (derived from the Y1→Y3 adoption ramp) — the same weight takes visibly less time later in the engagement.
  - *Calendar-anchored, overlapping rollout — rebuilt after user correction.* The first version placed phases on an abstract sprint/release axis decoupled from the calendar; told "nothing aligned with reality", it was rebuilt so every phase sits directly on the real calendar, starting in ramp-up order and **overlapping** (pipelining — different artefacts in different phases at once), each still sized by its own weight/velocity.
  - *A release is where a full cycle actually completes — not a calendar slice.* A follow-up correction ("il faut au moins un cycle de phase complet pour 1 release") removed the arbitrary monthly release ruler entirely; the 🏁 marker now sits at the real point every in-scope phase (and cross-cutting) has finished, labelled simply "🏁 full cycle complete".
  - *Editable ramp-up sequence, round-tripped.* Every phase and artefact (SDLC + regulated) gained a numeric `seq` (seeded from natural order), editable in 🎯 Scope, persisted via the snapshot library and new Excel `Seq` columns on the `SDLC Artifacts`/`Reg Artifacts` sheets.
  - *Same-seq items start together — at every level.* A shared `ganttGroupLayout()` helper groups participants by seq instead of staggering them as if strictly sequential: two phases (or cross-cutting) tied on seq now start at the same point, and the identical rule was extended one level down to the artefacts revealed by expanding a phase or Cross-cutting.
  - *Cross-cutting sized by its own weight, not full-width.* Gained its own weight/supervision computation and an editable "🔶 Cross-cutting seq" control, participating in the same layout as real phases instead of always spanning the entire delivery window.
  - *Knowledge Hub* lives in the program band as two rows (Build/Setup, Run) when enabled, its Build/Setup row now sized by its own new "Setup duration (days)" input (🧠 Knowledge hub section) rather than borrowed from the Agentic Build ramp.
  - *Client-view control over the onboarding sequence.* A "Display Discover/Calibrate/Validate/Pilot & Prove in Gantt/timeline" toggle (🚀 Client view, on by default) hides all four onboarding rows together when off — and genuinely reshapes the downstream sequence (Agentic Build/Run start right at the roadmap's start date instead of after onboarding), not just hiding bars.
  - Each row shows two bars — translucent *activity* span and solid *human-supervision* subset — and phases/Cross-cutting expand (▶) to their artefacts.
- **Roadmap defaults updated** — Validate 6→4 weeks, Pilot & Prove 12→6 weeks — which surfaced (again) a stale embedded boot-restore snapshot silently re-applying its own old values over fresh HTML defaults on every load; fixed the same surgical way as the earlier nav-config incident (patched only the two stale `dom.values` entries, byte-identical otherwise).
- **⚙️ Agentic Setup consolidated into its own tab.** A new "Setup duration (months)" input now directly drives the Gantt's Agentic Build ramp (replacing an invisible auto-clamped heuristic); the existing amount inputs were relabelled to **Tooling & infra** / **Training & change** / **Coaching** / **Governance**; and the whole "⚙️ Agentic Setup & Run" card was relocated (ids can't be duplicated) from the Params tab into the 🧱 Agentic Setup tab itself, so it can be both viewed and edited in one place.

Verified throughout: golden case bit-identical after every one of the changes above, including both Gantt rebuilds and the embedded-snapshot patch; the velocity ramp visibly compresses later work (a heavier, later phase rendered shorter than a lighter, earlier one); equal-seq synchronisation confirmed at the phase, cross-cutting, and artefact levels; the onboarding toggle reshapes downstream timing (Agentic Build start moves from 11.5% to 0% of the calendar) while the calendar origin itself never changes; no duplicate DOM ids after the Agentic Setup relocation; no console errors at any point.

## [v15.6] 2026-07-22 Board templates Card sequencing

### A comprehensive All-in-One template, "template" terminology throughout, and per-card display order

A focused follow-on to the v15.5 Section Board. Three operator-driven refinements, no calculation formula touched; golden case (Y3 €770K, run €1,007K) re-verified after every change.

- **New "🧩 All-in-One dashboard" template** (Levers group) — a comprehensive consolidated section. Rather than hand-listing cards, the template-creation path was generalised to support a `buildCards` generator, and the All-in-One one produces **≥ 2 cards for every section that owns variables** (54 cards across 27 sources in the shipped case: two GLOBAL headline cards plus two per real section), each sourced to and goto-targeting its own section, binding that section's own variables first and padding from GLOBAL when a section is thin. Because it's generated, it stays in sync automatically as the variable registry grows. The existing four templates (Build / Lever / Analyse / Decide) are unchanged — they still seed their single default card through the same generalised path.
- **"Archetype" terminology retired in favour of "template"** across every user-facing surface — the Board intro, the section-catalog descriptions, the create-panel text, each dynamic section's own description, and the Excel `Dynamic Sections` sheet column header (Archetype → Template). The internal identifiers (`ARCHETYPES`, `d.archetype`) are unchanged — invisible to the user, and renaming them would be churn with no benefit.
- **Per-card display sequence** — cards gained an editable `CARD_SEQ` (a numeric **Seq** column, first in the Configure card table, mirroring how body rows already work). Cards now render sorted by Seq everywhere: the section's own results tab, the Configure preview, and the editor table. New cards auto-take `max(seq)+1`; the All-in-One template numbers its cards 1, 2, 3… in generation order. Round-trips through Excel (new `Seq` column on the `Dynamic Section Cards` sheet). Backward-compatible: cards saved before this default to Seq 0 and keep their insertion order under the stable sort.

Verified: All-in-One creates 54 cards with ≥ 2 per source section and renders in one pass with zero console errors; reordering a card's Seq (e.g. to −1) correctly moves it to the front of the results grid; no user-visible "archetype" text remains anywhere in the Board or a created section; Seq round-trips through export→import; golden case bit-identical throughout.

## [v15.5] 2026-07-20 Section Board Variable registry

### A new operator-configurable dashboard subsystem, built to spec then substantially refined against real use

The largest single addition since the v14.17→v14.20 architectural lots: a full "Section Board" feature (per `AgentCase_Spec_SectionBoard.md`) letting an operator create first-class, persona/group-assignable sections from an archetype, each with its own card set and body rows bound to live model variables — plus a full pass of iterative refinement once the first version was in use. No calculation formula touched anywhere; golden case (Y3 €770K, run €1,007K) re-verified after every change below, dozens of times.

- **Dynamic sections, built from 4 archetypes** (🧱 Build, 🎚️ Lever, 📈 Analyse, 🎯 Decide, each with sensible default cards/rows) — created from the 📊 Board tab, each gets a real tab, its own `SECTION_CATALOG` mirror entry, a dynamically-created DOM host and `TABRENDER` registration, and behaves exactly like a built-in section: same group/order/persona-assignment machinery, zero special-casing. Full cascade-delete (catalog mirror, DOM node, `TABRENDER` entry, persona membership, any dangling `CARD_SOURCE_SECTION`/`CARD_TARGET_SECTION` pointers from other sections' cards).
- **"The Board holds no cards of its own" — a mid-flight architectural pivot.** The first build gave the Board tab its own Card Library (one auto-seeded card per static section) and a Board composition/grid with a live aggregate. Once in use, the call was made to remove all of it: `CARD_LIBRARY`, `BOARD_LAYOUT`, the Board's own card grid, and their 2 Excel sheets are gone entirely. The Board is now purely the **configuration surface for dynamic sections** — every card lives inside a dynamic section's own `cards[]`, never in a shared library.
- **Configuration fully separated from results.** A dynamic section's own tab now displays results only (its card grid + body-row values, read-only) with an editable **description** shown under the title. All editing — cards, rows, the description, and a live non-clickable **preview** of the section's own cards — happens in a ⚙️ Configure panel that expands inline in the Board tab's "Dynamic sections" registry, reusing the exact same card-rendering helper (`dynCardHtml()`) as the results view so the preview can never drift from reality.
- **Goto: a real bug found and fixed.** A card's click-to-navigate target (`CARD_TARGET_SECTION`) defaulted to the section's own id with no field to change it — clicking a card just silently re-landed on the page you were already on. Added an editable **Target** picker (and a small badge in each card's top-right corner naming its target) so goto genuinely goes somewhere.
- **Variable registry grown from 22 to 114 entries, in three passes**, each verified against the real computing function before being added (no guessed formulas): first broadened coverage from 6 to ~21 sections (financial, commercial, compliance, quality, velocity, productivity, risk, decision, montecarlo, agent-dir, token-econ, phase-art, opmodel, loc-strat, strategies, plus artefact/scope-selection counts); then a detailed second pass added ~34 more (params, setup, team-in/out, ratecard, financial detail, knowledge, opmodel detail, maturity, readiness); then every one of the app's **19 checkboxes** was exposed as a bindable variable via a new `BOOL` canonical format (renders `✓ On`/`✗ Off`). A new "Variable catalog" reference table at the bottom of the Board tab lists all 114 with their source, format and live current value.
- **Source-scoping usability fixes.** Body rows were hard-locked to their owning section's (always-empty) scope, so their Var picker was permanently stuck at the 15 GLOBAL variables regardless of any card's Source — rows gained their own editable Source picker, mirroring cards. Separately, **Source** was the last column in both the card and row editor tables, after the variable pickers it controls — reordered to appear first, with a one-line hint, since it was easy to miss and looked like a hard 15-entry limit rather than a "change Source to unlock more" affordance. Every variable-picker option is now also prefixed with its source section, e.g. `[Quality] Test coverage Y3`.
- **Key1/Key2 custom labels.** Each card's Key1/Key2 slot can now carry an optional label (defaults to the bound variable's own name) rendered as "Label: value" in the card's subtext — editable via a small input under each variable picker in the Configure panel.
- **A real pre-existing bug found and fixed along the way**: the file carried an embedded `<script data-agentcase-snapshot>` restore block (dated 2026-07-17, from before the Section Board existed) that silently re-applied stale `GROUPS`/`PERSONA_SECTIONS`/`sectionGroups` on every single page load — masking any code-level edit to a section's group/order (a "move X to Y" request would appear to do nothing). A first attempt to strip the whole block broke the golden case outright, revealing the same embedded snapshot was *also* the sole source of the calculation-relevant defaults (team composition, rate card, selected artefacts). Fixed correctly: reconstructed the snapshot, surgically removed only the three navigation-structural keys, and re-embedded the rest — golden case restored, and section moves now take effect immediately as authored.
- Excel round-trip extended throughout: `Dynamic Sections`/`Dynamic Section Cards`/`Dynamic Section Rows` sheets gained Description, Source Section (for rows), and Key1/Key2 Label columns; the two Board-owned sheets (`Card Library`, `Board Layout`) were removed along with the feature they served.

Verified throughout: every one of the 114 variable getters executes with zero errors on a fresh load (spot-checked against the app's own render functions for the trickiest — commercial model, Monte Carlo, decision engine, operating-model topology); goto correctly re-targets after editing; description and Key1/Key2 labels round-trip live and through Excel; cascade-delete leaves no dangling references; the Configure-panel preview matches the results view exactly (shared renderer); golden case bit-identical on every check, including immediately after the snapshot-masking fix. No console errors.

## [v15.4] 2026-07-17 Snapshot-backed export/import

### The Excel round-trip and the snapshot library become one system

A short, focused follow-on to v15.3: the Snapshot manager moves into Import / Export, and both directions of the Excel round-trip now leave a traceable snapshot behind. No calculation formula touched; golden case (Y3 €770K) re-verified after every change.

- **Snapshot manager relocated**: no longer a standalone Configure tab — it's now a card inside 📥 Import / Export, between 💾 Save HTML Snapshot and ⬇️ Export current settings. Its own `SECTION_CATALOG` entry, `TABRENDER` key and sidebar button were removed; it renders as part of `renderIo()` instead.
- **Excel export is snapshot-backed, two ways**: each row in the Snapshot manager table gained a **📊 Export to Excel** action — temporarily activates that snapshot, runs the unmodified export, then restores whatever was live before (a brief visible flicker, zero changes needed to `exportParams()` itself). The general **⬇️ Export to Excel** button now auto-captures the current configuration as a new snapshot first if nothing was explicitly picked, then exports that — every export now traces back to a named, timestamped entry in the library.
- **Import creates a snapshot too**: a successful ⬆️ Import settings now auto-captures the just-imported state as a named snapshot (named after the uploaded file, e.g. "Import ClientX_Config.xlsx") — the same `snapCreate()` helper the export side uses. The import status message confirms it and links back to the tab.

Verified: per-row export activates the correct snapshot's data and restores the prior live state afterward (checked with an independent field unaffected by the "Fit to selected scope" auto-lock, to get a clean signal); the general export button's auto-capture fires exactly once and leaves live state untouched; import against a minimal in-memory workbook correctly appends a named snapshot and reports it. Golden case bit-identical throughout, no console errors.

## [v15.3] 2026-07-17 Navigation Snapshot library Code quality

### Architecture chapter split in two, four real bugs found and fixed, a new in-file snapshot library, and a full dead-code sweep

A dense follow-on to v15.2 — no calculation formula touched, golden case (Y3 €770K) re-verified after every change below.

- **Architecture chapter split into two tabs**: `🏛️ Architecture — Layers` is now a short, one-line-per-item index of the 5 layers plus the 5 cross-cutting engines; `🏛️ Architecture — Layers content` carries the full technical detail (functions, code references, live-vs-scaffolding status, data flow, migration plan) that used to be the whole chapter. Cross-linked both ways.
- **Two logic-verification checks fixed** — both were check-formula bugs, not model regressions; the reported numbers were always right, only the checks disagreed with themselves: **CC-AG-01** required every `AGENT_CATALOG`/`LOOP_PAIRS` artefact reference to be in the *current scope selection*, when it only needs to be a *valid* artefact id — the Agent Directory is a 53-artefact reference catalogue by design, the shipped scope is 10 artefacts, so the check failed by construction in the shipped default. Narrowed to referential integrity; out-of-scope references are now informational. **"Benefit Y1/Y2/Y3 = baseline−run"** compared against baseline-minus-run alone, but `yearSav`'s real formula also adds KT-avoided credit and subtracts verification tax and external rework — the check failed whenever any of those was nonzero (€4.7K–8.5K/yr from KT-avoided alone in the golden case). Fixed to the full formula; the adjacent "Savings reconciliation" check had the same latent gap (missing the external-rework term, masked only because that feature defaults off) and was fixed too.
- **Duplicate Assumptions section, a real bug not just a cosmetic one**: two `SECTION_CATALOG` entries shared id `assumptions`, two `TABRENDER` keys silently shadowed each other, and — the actual bug — two `<div id="assumptions">` blocks existed in the HTML. Duplicate DOM ids aren't valid; `getElementById` always returned the older, simpler div, so the rich Assumptions Register (client-validation checkboxes, current-vs-default status, Monte Carlo impact) was rendering into a div that could never become visible. Removed the superseded old div and its now-dead renderer; the real register is reachable again.
- **Section placement**: 🔧 Build moved from Inputs to the end of Levers; 📒 Assumptions register moved from Decide to the end of WIP Section — both the source defaults and the file's baked-in boot-restore snapshot were updated, since the snapshot wins at runtime.
- **Snapshot accumulation, found and fixed at the root**: `saveHtmlSnapshot()` cloned the whole DOM — including any restore script baked in by a *previous* save — then appended a new one on top, without ever removing the old one. This file had silently accumulated **five** stacked restore scripts (2026-07-10 through 2026-07-17, ~137KB), all re-executing on every load. Fixed the function to strip prior restore script(s) before appending the new one — every future save is now a clean, single-script baseline. Also consolidated this file's own five accumulated scripts into one, capturing the verified-correct live state (deleting them outright was tried first and broke the golden case badly — the DOM-value portion of a snapshot is load-bearing, not just cosmetic).
- **🗂️ Snapshot manager** (new, Configure group, Advanced-only): a named library of configuration snapshots stored inside the file, separate from the single-file 💾 Save HTML Snapshot download. **Capture** the current configuration under a name; **Activate** an earlier one; **Delete** one (single arm-then-confirm, matching the existing Persona/Group delete pattern); **Set as baseline** (two distinct sequential confirmations — it changes what every future opener of a saved copy of the file starts from, so a single misclick can't trigger it). Captured snapshots deliberately exclude the snapshot library itself from their own payload, so capturing never nests earlier captures inside the new one.
- **Dead-code sweep** — every one of ~500 top-level functions cross-referenced against every call site in the file. Found **one real functional bug**: `renderQuality()` was defined twice — once for the KPI "Quality" tab (test coverage, bug counts, radar chart), once for the AI-code-quality-tax section under Risk & Compliance. The second silently won everywhere, so the Quality tab's table and chart had been rendering nothing; renamed the second to `renderQualityTax()` and fixed its one call site. Removed 10 confirmed-dead functions with zero references anywhere (`selectedPhasesList`, `setGcScopeWeighted`, `franceBlendedTJM`, `advancedVisible`, `setNavMode`/`renderQuickBuild` — a fully superseded old "Quick/Advanced nav mode" toggle, `selectedRegOfPhase`, `rampAtMonth` — an exact duplicate of the still-used `rampAtMo`, `_glCatLabel`, `abaqueAPhase`). One candidate, `ensureConvergenceBoot()`, looked dead but wasn't — it's a legacy PERSONA_SECTIONS migration shim that the snapshot-accumulation fix above had accidentally orphaned by removing its only call site. Re-wired into `applySnapshotState()` instead of deleted, so it now runs on every restore (HTML snapshot, Excel/JSON import, Snapshot manager activation) rather than the one legacy boot path it used to depend on.

Verified throughout: golden case bit-identical after every change, re-ran the full dead-code scan against the cleaned file (0 duplicates, 0 remaining candidates), smoke-tested every major tab, no console errors.

## [v15.2] 2026-07-17 Extraction series Phases 1–4 wired

### The v15.x scaffolding (BUS/APP_STATE/PM/DEP/AUDIT) goes from additive-only to actually wired, end to end

v15.0/v15.1 shipped the scaffolding but nothing routed through it. This release completes all four phases of the Architecture chapter's own migration plan, in order, each gated on a bit-identical golden case (Y3 €770K) before the next started. No calculation formula is touched anywhere in this release.

- **Phase 1 — mutations routed through `APP_STATE.set()`, in two tiers.** The 7 standalone scalar toggles (`regUse`, `regInclude`, `forceGlassCeiling`, `TOK_OUT_SHARE`, `lifecycleUse`, `lifecyclePos`, `mcAuto`) call `APP_STATE.set(key,value,source)` directly, with a genuine pre-mutation snapshot for `AUDIT.log()`. The remaining ~65 handler functions across ~20 composite-key registry entries — `teamIn`, `selectedArtefacts`/`selectedNorms`/`selectedRegArtefacts`/`phaseOff`, `PERSONAS`/`PERSONA_SECTIONS`/`GROUPS`/`sectionGroups`, `TOKEN_MODELS`, and the strategy/lifecycle/Monte-Carlo/rate-card/quality/readiness/tracking editors — keep their existing add/delete/splice/cascade logic completely untouched, and instead call a new `syncState(key(s), source)` helper right where they already called `refreshAll()`/render. It re-reads the just-mutated value via the registry's own `get()` and feeds it back through `set()` (`entry.set(entry.get())`, verified idempotent per key) — far lower risk than rewriting each cascade to compute next-state before mutating, with no regression-test coverage beyond the golden case to catch a mistake there. Honest trade-off, documented in the Architecture chapter: `AUDIT`'s "before" equals "after" for these composite keys, since the direct mutation already ran by the time `syncState()` fires. Two side-effect gaps were found and closed along the way — `setRegUse(false)` and `applyStrategy()` were each mutating a second registry key (`selectedNorms`/`selectedRegArtefacts`, `targetLocPct`/`forceGlassCeiling`) without notifying it. Left alone, correctly: `gcScopeWeighted` (dead setter), `toggleAllRegOfPhase`/`resetRegArtefacts` (dead functions), and `REG_OVERRIDES`/`REG_HUMAN_SUP`/`REG_EFFORT` (legacy import-only keys with no live handler at all).
- **Phase 2 — `refreshAll()` routed through `DEP`.** Its two unconditional calls (`recomputeWeights()`, `mcAutoHook()`) now go through `DEP.flushDirty()` instead, with `FULL_REFRESH` still `true` by default — verified byte-identical, `calc:done` fires exactly once per refresh. The documented `window.__DEP_FULL_REFRESH__` QA hook is now actually wired. Found and fixed a latent bug while in there: both `DEP.node()` registrations used a namespaced `reads` convention (`'scope.selectedArtefacts'`, `'team.teamIn'`) that never matched the real flat `STATE_REGISTRY` keys — harmless only because `FULL_REFRESH` defaulted `true`; corrected to real keys and verified the incremental filter now genuinely discriminates.
- **Phase 3 — `AUDIT` surfaced in the product.** `renderConvChecks()` now calls `AUDIT.runChecks()` and merges every registered check into the same table as the existing `CC-XX-NN` checks, generically — any future `AUDIT.registerCheck()` call shows up automatically. Found a real ID collision while wiring this: the check registered as `CC-AG-01` (Lot 4, v14.20 — validates `LOOP_PAIRS` agent-id references against `AGENT_CATALOG`) silently shared its id with a pre-existing, unrelated `CC-AG-01` already in `wave5Checks()` (v14.14 — validates artefact references). Renamed the newer one to `CC-AG-02`; both are now visible and distinct. Added a read-only `AUDIT.log()` debug panel (last 25 mutations), gated to the Advanced persona, directly below the checks table.
- **Phase 4 — the Lot 1 event contract completed.** `setPersona()` now emits `persona:changed` (`{persona, previous}`) and `goTab()` now emits `tab:activated` (`{tab}`, only for a tab that actually exists in the DOM) — the two events named in the original Lot 1 (v14.17) contract but never fired. Nothing subscribes to either yet; they exist so a future feature can react to navigation without patching either function directly.

**Net effect**: the five engines are no longer additive-only scaffolding — `BUS`, `APP_STATE`, `PM`, `DEP.flushDirty()` and `AUDIT` are all live and exercised on every refresh, for essentially every mutation in the app. Still deliberately conservative where it matters: `FULL_REFRESH` stays `true` as the shipped default (flipping it — Phase 2c — needs a dedicated audit of every `DEP` node's `reads` array against the now much wider mutation surface, which nothing has done yet). Behaviour is unchanged for every user regardless of how much of the registry is now observed. Golden case verified bit-identical throughout (Y3 saving €770K, run €1,007K) — after Phase 1's original 7, after Phase 2, after Phase 3, after Phase 4, and again after Phase 1's remaining ~65 handlers, plus a live spot-check of ~20 representative handlers with zero errors.

## [v15.1] 2026-07-16 Snapshot fix Golden-case hotfix

### Save/reopen round-trip and a real golden-case regression, both fixed

v15.0's own release note claimed a bit-identical golden case against v14.16 (Y3 €770K). Live testing against the actual file found that claim false — Y3 measured €742K on a clean load, no manual steps. All three issues below were found and fixed while investigating the "💾 Save HTML Snapshot" report that it was dropping the Persona-management Groups.

- **Golden-case regression (the real bug behind the €770K vs €742K gap)**: `applySnapshotState()` restores `autoPotential` from whatever raw value was saved, but never re-ran `applyScopeAuto()` afterward. When "🎯 Fit to selected scope" (`fitAuto`) is on — as it is in the shipped case — `autoPotential` is supposed to be *locked* to `phaseScope().avgAgent` for the current scope (verified by hand: 75% for the 10 in-scope artifacts), not to a saved snapshot value that can go stale (71%). Fix: `applySnapshotState()` now calls `applyScopeAuto()` right after restore, before `refreshAll()`, so the `fitAuto` lock's own contract holds. Verified on a clean reload with zero manual intervention: `autoPotential` 71% → 75%, Y3 saving €742K → **€770K**.
- **Groups/Sections missing from the snapshot** (the originally reported bug): `GROUPS` (sidebar groups — order, and any added/renamed/deleted via the Personas tab) and each section's `group`/`groupSeq` were never registered in `STATE_REGISTRY`, so a saved HTML snapshot silently reverted them to source defaults on reopen. Fixed by adding two entries (`GROUPS`, `sectionGroups`) — verified: a custom group and a section reassigned into it now survive a save/reopen cycle.
- **Snapshot restore could abort partway through**: `pmApplyDomState()` set every saved DOM value in one `forEach` with no per-field recovery; the `importFile` field (a file input, which browsers refuse to set programmatically to a non-empty value) threw and silently dropped every field still queued after it. Fixed with a per-field try/catch — one bad field can no longer take the rest of the restore down with it.

Golden case now genuinely bit-identical to v14.16 and to the v15.0 claim: Y3 saving €770K, run €1,007K — verified on a clean reload, no manual steps, no lingering console errors.

## [v15.0] 2026-07-16 Series graduation Milestone

### End of the v14.x integration series — architectural foundation now canonical

Marker release. Closes the four-lot architectural refactor delivered in v14.17→v14.20 and opens the v15.x extraction series, in which existing mutation sites will be progressively retargeted onto `APP_STATE.set()` and `DEP.FULL_REFRESH` will be flipped to `false` behind a QA toggle. No calculation code is touched in this bump — the change is intentionally minimal so v15.0 can serve as the golden-case reference point for every incremental extraction that follows.

- **Display strings bumped**: `<title>` and the header `<strong>AgentCase v15.0</strong>`. All historical version comments (`// v12.44:`, `// v14.16:`, etc.) preserved as-is — they document when each feature landed and must not be rewritten.
- **Snapshot schemaVersion unified**: `APP_STATE.toJSON()` was stamping `'14.17'`, `PM.serialize()` was stamping `'14.18'` — a latent inconsistency from the staged delivery. Both now stamp `'15.0'`. Migration keys inside `MIGRATIONS` (e.g. `'<12.43'`, `'12.43'`) untouched — those are semantic version anchors for schema transitions, not build versions.
- **Public version constant**: `window.AgentCaseArch.VERSION === '15.0.0'`, added to the non-enumerable arch namespace object. Playwright QA can now assert on it directly instead of scraping the `<title>` tag.
- **Golden case invariant**: no computational change. Y3 saving €770K, run cost €1,007K — same as v14.20, same as v14.16. Snapshots produced by v15.0 will hydrate on v14.17→v14.20 identically because `applySnapshotState` ignores unknown top-level keys (schemaVersion is metadata only, not consumed by the restore pass).

**What v15.x will bring** (planned, not shipped here): (Lot 3.b) flip `DEP.FULL_REFRESH` to `false` under a Playwright-gated toggle and validate incremental recompute produces bit-identical output; (Lot 5) retarget scope mutation sites (`scope.selectedArtefacts`, `scope.phaseOff`, `scope.regUse`) onto `APP_STATE.set` so `state:changed` starts flowing and `AUDIT.log()` begins capturing real mutation traces; (Lot 6) PM.serialize consumers replace the four ad-hoc backends; (Lot 7) Excel Audit sheet driven off `AUDIT.log()`.

## [v14.20] 2026-07-16 Architecture Lot 4 Audit Engine

### Bus-driven audit ring buffer + declarative logic-check harness (CC-AG-01 seeded)

Fourth and final lot of the architectural refactor. Introduces an `AUDIT` namespace that subscribes to `state:changed` events on the bus (delivered by Lot 1) and maintains a capped ring buffer of 500 mutation records — each entry captures `{ts, path, before, after, source}`. The ring is the substrate for two use cases: a future Excel "Audit" sheet in the export, and traceability during presales ("why did Y3 saving move from €770K to €812K" now has an on-file answer instead of requiring memory).

- **`AUDIT.registerCheck(id, paths, fn)`**: declarative logic-check harness. Each check declares the state paths it depends on and a pure function that inspects a JSON snapshot of `APP_STATE`. Non-blocking by design — checks produce warnings, never throw. `AUDIT.runChecks()` emits `audit:checks-done` with the violation list.
- **CC-AG-01 seeded**: verifies that every agent id referenced in `LOOP_PAIRS` (verifier/generator/agent role) exists in `AGENT_CATALOG`. Skips silently when catalogs are absent so it cannot fire on pre-v14.14 snapshots. This is the shape-check form of the rule; the full persona-coverage variant ships once the AG-persona mapping is stable.
- **Non-enumerable window export**: `window.AgentCaseArch = {BUS, APP_STATE, PM, DEP, AUDIT}` defined with `enumerable:false` so Playwright QA scripts have a single hook without polluting `for..in` loops on window.
- **Golden case invariant**: purely additive, observation-only. No existing site emits `state:changed` yet (Lot 1 provided the emitter but no producer has been rewired), so `AUDIT.log()` returns `[]` at runtime — same as v14.19. Y3 saving €770K, run cost €1,007K unchanged.

End of the initial architectural refactor. Follow-up lots (Lot 3.b incremental dirty-tracking flip, PM.serialize consumers, Excel Audit sheet, CC-AG-01 persona-coverage variant) are gated by golden-case parity runs and separate release notes.

## [v14.19] 2026-07-16 Architecture Lot 3 Dependency Engine

### Declarative derived-value graph with FULL_REFRESH=true fallback for golden-case parity

Third architectural lot. Formalises the derived-value graph as a `DEP` namespace so downstream work can move from "call `refreshAll()` and recompute everything" to "mark path X dirty and let the engine recompute only what depends on X". Deliberately ships with the incremental path DISABLED (`DEP.FULL_REFRESH = true`) so this lot alone cannot break the golden case.

- **API**: `DEP.node(id, reads, compute)` registers a derived node; `DEP.markDirty(path)` and `DEP.flushDirty()` drive recomputation. Path matching supports `foo.*` wildcards for read declarations.
- **Two nodes seeded** as thin wrappers on existing globals: `derived.weights` (reads `scope.selectedArtefacts`, `scope.selectedRegArtefacts`, `catalogs.artefactsEdited`, `catalogs.regArtefactsEdited` → calls existing `recomputeWeights()`) and `derived.mcHook` (reads `inputs.*`, `team.teamIn`, `scope.*` → calls existing `mcAutoHook()`). Registration alone cannot alter behaviour; both compute functions delegate to the same globals `refreshAll()` already calls.
- **Bus wiring**: `DEP` subscribes to `state:changed` and pushes the path into its dirty set. Since no site emits `state:changed` yet (Lot 1 is the plumbing lot), the dirty set stays empty at runtime and `flushDirty()` — even if called — is a no-op.
- **QA hook**: `DEP.FULL_REFRESH = false` then triggering a normal edit is the QA path for validating incremental recompute against golden case, gated behind a Playwright toggle before Lot 3.b sign-off.
- **Golden case invariant**: existing `refreshAll()` and its call sites untouched. Byte-identical output for the same input state.

## [v14.18] 2026-07-16 Architecture Lot 2 Persistence Manager

### Unified serialize/hydrate façade + declarative MIGRATIONS registry

Second architectural lot. Converges four persistence backends (HTML snapshot, Excel round-trip, JSON import/export, localStorage autosave) behind one `PM.serialize()` / `PM.hydrate(obj)` pair, and turns the ad-hoc legacy shims into a declarative migration table keyed by schema version.

- **`PM.serialize()`**: thin wrapper on `collectSnapshotState()` — emits `snapshot:collected` on the bus, stamps `schemaVersion:'14.18'` on the output. Byte-identical shape to the existing HTML-snapshot payload; existing `saveHtmlSnapshot` continues to work unchanged and remains the caller for the HTML backend.
- **`PM.hydrate(obj)`**: applies registered migrations in order, then delegates to the existing `applySnapshotState()`. Emits `snapshot:applied`. The pre-v12.43 regulatory-shim path (formerly gated by the `_regLegacyPending` flag inside `applySnapshotState`) is now surfaced as the first entry in `MIGRATIONS`, documenting the transform rather than hiding it inside the restore function.
- **`PM.registerMigration(from, to, fn)`**: declarative API for future schema evolutions. Migrations run left-to-right on the incoming JSON before the restore pass.
- **Golden case invariant**: no existing persistence caller is retargeted in this lot. `PM` sits alongside `saveHtmlSnapshot` / `collectSnapshotState` / `applySnapshotState` as an additional entry point. Y3 saving €770K, run cost €1,007K unchanged.

## [v14.17] 2026-07-16 Architecture Lot 1 Event Bus + APP_STATE

### Single mutation channel and JSON façade over existing globals

First lot of the architectural refactor. Introduces an event bus and an `APP_STATE` namespace that projects the existing scattered globals (already declared through `STATE_REGISTRY`) as one JSON view. Prepares the ground for Lots 2 (Persistence Manager), 3 (Dependency Engine) and 4 (Audit Engine) — none of which are possible without a single mutation choke point.

- **`BUS`**: minimal pub/sub. `BUS.on(evt, fn)` returns an `off()` handle; `BUS.emit(evt, payload)` is defensive (subscriber throws are logged, not propagated). Standard events documented in the source: `state:changed`, `snapshot:applied`, `snapshot:collected`, `calc:done`, `persona:changed`, `tab:activated`.
- **`APP_STATE.toJSON()`**: same shape as `collectSnapshotState()` minus `savedAt`, with an explicit `schemaVersion`. Reads walk `STATE_REGISTRY.get()`. Cannot drift because there is no separate storage — it's a live view.
- **`APP_STATE.set(path, value, source)`**: the future single mutation entry point. Sets via the registry, then emits `state:changed {path, before, after, source}`. No existing site is retargeted yet, so this lot is byte-identical to v14.16. Rewiring happens progressively in follow-up lots (starting with high-signal paths like `scope.*` and `catalogs.*`).
- **Design invariant**: existing globals remain the source of truth. Nothing is duplicated. `APP_STATE` is a projection, never a copy.
- **Golden case invariant**: purely additive plumbing. Y3 saving €770K, run cost €1,007K unchanged.

## [v14.16] 2026-07-16 Persona management Groups

### Sidebar groups become a first-class, editable entity — full CRUD, global ordering, Excel round-trip

The Persona management tab's "Menu" concept — previously a fixed, code-only classification (Inputs/Levers/Engine/Build-up/Outputs/Decide/Configure/Share) — is now a fully editable **Group** entity, on top of which every section's position becomes explicit and global:

- **Terminology**: "Menu" renamed to "Group" everywhere in the tab (headers, detail panel, dropdowns, buttons).
- **Groups are now editable data** (new `GROUPS` array, replacing the hardcoded `NAV_GROUPS` constant): a new "Groups (order in the sidebar)" table supports full CRUD — **add** (label → auto-slugified id), **rename** (inline, same pattern as personas), **delete** (two-click confirm, **blocked** if any section is still assigned to that group, with a message naming the count and an example section — no silent orphaning), and **reorder** via a typed number instead of ▲▼ arrows.
- **Every section's group + position becomes global**, not per-persona: new `groupSeq` field on each `SECTION_CATALOG` entry, seeded from declaration order so the initial sidebar is unchanged. The "Sections (group & order)" table (formerly a read-only "Auto-generated summary") now has an editable **Group dropdown** and a typed **Group Seq** number per section, plus the section's display name (was missing) and compact styling on the new controls (11px, matching the rest of the table — the browser-default control size read as oversized and inconsistent).
- **Behavior change, called out explicitly**: since order is now global, the per-persona "Section assignment" panel no longer reorders (▲▼ removed) — it's membership only (add/remove), shown pre-sorted in actual app order for readability. The persona landing tab (first section shown on switch) now follows this same global order instead of raw array position.
- **Excel round-trip**: new **Groups** sheet (ID/Label/editable Order) and **Sections** sheet (ID/Label/editable Group with dropdown validation/editable Group Seq/Description) — `Persona Sections` simplified to pure membership (Persona ID/Section ID), its former per-row Order column removed since order no longer lives there.

Golden case bit-identical: purely a navigation/admin feature, no calculation touched. Verified: Y3 saving unchanged (€770K); group reorder, section reassignment, groupSeq edits, delete-guard, and landing-tab logic all confirmed live in-browser.

## [v14.15] 2026-07-15 Agent Directory Token economics

### Phase descriptions, regulated-artifact flagging, and a shared runs-by-artifact table on Agent details

Three targeted refinements on top of the v14.14 Agent Directory / Loop Pairs foundation, all display-only:

- **Token economics — "📦 Agent runs by artifact (in-scope)"**: new **Phase Description** column (the phase's human-readable name, e.g. V3 → "Implementation"; regulatory artifacts on the `Cross-cutting` pseudo-phase show "Cross-cutting (regulatory)"). Regulated artifacts (`isReg`) are now visually flagged — amber row background plus a **REG** badge in front of the artifact name — so SDLC and regulatory rows are distinguishable at a glance.
- **Agent Directory — "Execution agents by authorization level"**: new **Agent code** column (`AG001`–`AG016`). The "Artefacts produced" column now shows each artefact's name in parentheses next to its ID, e.g. `A017 (Source code)`, instead of bare IDs.
- **Agent details tab**: a new **"📦 Agent runs by artifact (in-scope)"** table, positioned right before the "📊 Agent usage — consumption for this case" section, mirrors the Token economics table exactly (same columns, same REG flagging). Rather than duplicating the computation, both tables share one rendering pass via a common `artifact-run-table` class — they are guaranteed to stay in sync by construction, not by convention.

Golden case bit-identical: all three changes are additive columns/tables on top of existing computed values — no formula, weight, or toggle touched. Verified: Y3 saving unchanged (€770K) before/after.

## [v14.14] 2026-07-15 Agent Directory Loop Pairs

### New Agent Directory tab + agentic Loop Pairs (internal iteration / external rework), both opt-in

Adds a phase-indexed directory of execution agents and operational roles, plus a small model of the agentic quality loops that run underneath the SDLC — anchored on real artefacts, not new assumptions:

- **Agent Directory tab** (Analyze group, presales menu): a Phase selector (the 12 `REG_PHASES` + "All phases") drives two tables — **execution agents by authorization level** (capacity, average agentSup, artefacts produced) and **operational roles** relevant to the phase (via the existing `artTeamSkill()` resolver — no new role taxonomy). Wired through the standard invariant: `SECTION_CATALOG`, `PERSONA_SECTIONS`, `TABRENDER`, and injected into `ensureConvergenceBoot()` so restored snapshots pick up the new tab.
- **`AGENT_CATALOG`** — 16 execution-agent entries (`AG001`–`AG016`), derived automatically by grouping the 53 SDLC artefacts by (team skill × authorization level) — a soft reference to artefact IDs, no duplicated fields. Capacity is editable per agent (default: the existing global "runs/day" assumption); average agentSup is computed live from the referenced artefacts.
- **`LOOP_PAIRS`** — 3 fixed pairs anchored on real artefacts: `LP001` Code ↔ Unit tests (A017↔A023), `LP002` Code ↔ Code review (A017↔A018), `LP003` Validation ↔ Implementation (A033↔A017). Each carries an **internal loop** (average agentic iterations, always display-only) and, for LP001/LP003, an **external rework loop** (editable rework %, e.g. 10% V4→V3 for LP001).
- **Two opt-in calculation branches**, both OFF by default: *Internal* multiplies the existing global token-cost assumptions by the referenced artefacts' iteration count — a display-only estimate that never touches FTE, V7 conservation or the glass ceiling. *External* reuses the verification-tax mechanism exactly (a rate against realized savings, Apply-vs-informational toggle) rather than reshaping artefact weights, since that is what actually drives cost in this model.
- **Output Provenance**: two new overlay rows (Internal / External loop state) and a 5th double-count guard flagging when the external rework toggle and the verification tax are both active simultaneously.
- **`CC-AG-01`** (Logic Verification): warns if any `AGENT_CATALOG`/`LOOP_PAIRS` artefact reference falls outside the active scope.
- **Excel round-trip**: two new sheets, `Agent Catalog` (capacity editable) and `Loop Pairs` (external rework % editable), following the same export/import pattern as `Reg Artifacts` — verified with a live round-trip (edited capacity + rework % → exported → re-imported → correctly restored).

Golden case bit-identical: both loop toggles ship OFF, verified Y3 saving unchanged (€770K) with default configuration; the dependency graph and no artefact/pair data beyond the 3 pairs above were touched.

## [v14.13] 2026-07-15 Export/Import

### Deliverable column added to Excel export/import

Following the v14.12 UI addition, the new "Deliverable" description is now included in the round-trip Excel file:

- **SDLC Artifacts sheet:** new read-only `Deliverable` column inserted right after `Artifact` (columns now ID · Phase · Artifact · **Deliverable** · Selected · % auto · Effort weight).
- **Reg Artifacts sheet:** same insertion (ID · Industry · Norm · Phase · Artifact · **Deliverable** · Selected · % auto · Effort weight), populated via the unified `artDeliverable(a)` accessor.
- The column is reference-only — not read back on import (Selected/% auto/Effort weight indices were shifted accordingly in the import parser, verified with a live round-trip: edited scope + values → exported → re-imported → correctly restored).
- IO tab's sheet-reference table updated to mention the new column.

Golden case bit-identical (export/import structural addition only, no calculation touched).

## [v14.12] 2026-07-15 Deliverable descriptions

### New "Deliverable" column in the Scope tab's Full catalogue

Every artefact — SDLC and regulatory — now carries a plain-language description of what the deliverable actually is and which requirement it satisfies:

- **53 new descriptions** written for every SDLC artefact (`ART_DELIVERABLE`), e.g. A009 Traceability matrix: "Matrix linking each requirement to its design, code and test artefacts, evidencing nothing is missed or orphaned."
- **Regulatory artefacts** (370, across DO-178C/DO-254/ARP4754A/DO-330/DO-326A/ECSS and 10 other industries) already carried a `purpose` field written as a deliverable description — reused as-is via a new unified accessor `artDeliverable(a)`, no duplication.
- **New "Deliverable" column** added to the Full catalogue table (Scope tab), positioned right after Artifact as requested — shown for every row, SDLC or regulatory.

Golden case bit-identical (documentation-only addition, no calculation touched).

## [v14.11] 2026-07-15 Dependency graph

### Dependency graph updated — missing product-profile node added

An audit of the interactive Section Dependency graph found it still reflected the pre-v14.8 structure: the **Product profile & coefficients** tab (the unified EV-13 profile introduced in v14.8, driving both the effort weighting and the Eligibility potential matrix) had no node on the graph at all — a real gap after the pillar/lifecycle unification.

- New node **PP — Product profile & coefficients** added to the Levers stage, between AI Readiness and Knowledge hub.
- Two edges added: **PP → FTE/vFTE** (phase-coefficient re-weighting) and **PP → Eligibility** (unified potential matrix / abaque lever) — matching the exact mechanism verified in v14.8.
- Graph, matrix and description panel now show **25 sections** (was 24); the section count in the caption is now computed dynamically rather than hardcoded.
- **Hover-to-isolate verified**: hovering the new PP node dims the graph and highlights exactly its two edges and their endpoints (FTE/vFTE, Eligibility); hovering any other node still isolates correctly; mouse-leave clears all highlighting.

Golden case bit-identical (data/documentation update only, no calculation changed).

## [v14.10.1] 2026-07-14 Export fix

### Removed duplicate SDLC-artefact worksheet in Excel export/import

The round-trip file had **two sheets carrying the identical SDLC artefact data** (same 53 artefacts, same fields): `Artifacts` and `SDLC Artifacts`. On import, `SDLC Artifacts` ran after `Artifacts` and silently overwrote it — so editing only the `Artifacts` sheet and re-importing could revert those edits without warning.

- **Kept:** `SDLC Artifacts` (already documented in the IO tab's sheet-reference table, positioned next to `Reg Norms` / `Reg Artifacts`).
- **Removed:** the `Artifacts` sheet, both its export block and its (now redundant) import block.
- Round-trip verified: editing scope/%auto/effort, exporting, and re-importing restores the edits correctly through `SDLC Artifacts` alone.

Golden case bit-identical (structural export/import fix only, no default changed).

## [v14.10] 2026-07-14 Aero/defence DOx

### Regulatory catalogue: DOx coverage completed

Following a coverage audit, the aerospace-defence-space set went from 48 to **69 artefacts**. Three referenced-but-empty norms are now populated and the residual gaps in the existing norms are closed:

- **DO-330 (tool qualification)** — 5 artefacts: TQP, Tool Operational Requirements, Tool Qualification Cases & Procedures, Verification Results, Tool Accomplishment Summary.
- **DO-326A / ED-202A (airworthiness security)** — 6 artefacts: PSecAC, Security Scope & Perimeter, Security Risk Assessment, Security Architecture & Measures, Security Verification & Effectiveness Assurance, Security Accomplishment Summary.
- **ECSS (space)** — 6 artefacts: Software Requirements Spec (E-ST-40C), Design Document, V&V Plan, Product Assurance Plan (Q-ST-80C), Configuration Management File, Criticality & Reuse Analysis.
- **DO-254** — 3 missing items added: Hardware Environment Configuration Index (HECI), Hardware Acceptance Test Criteria, Hardware Problem Reports (now 18).
- **DO-178C** — the Parameter Data Item File (§11.22) added (now 23).

Each new artefact carries its phase, a phase-seeded human-supervision % (safety-critical: 75–85% on plans/cross-cutting), an effort/activity weight and a glass-ceiling contribution — verified: selecting the DO-326A norm adds its 6 artefacts to scope and moves the glass ceiling. IDs are unique (R350–R370); the artefacts are not selected by default, so the golden case (v14.9 baseline, €770K Y3) is **bit-identical**.

## [v14.9] 2026-07-13 UX + Knowledge hub

### Six targeted requests: navigation, personas, and Knowledge hub defaults

- **Quick build tab removed.** The compact one-page setup is gone; the guided 7-step (now 8-step) **Build** wizard is the single entry point. Internals needed by the wizard (e.g. the Phases control) were preserved in a hidden holder, not deleted.
- **Engagement context added as wizard step 1.** The exact same control as the Parameters tab (not a copy) now opens the Build wizard — set MSC/MSI/STA first, before industry, since it frames every other lever. Verified: the wizard control drives the single `engagementCtx` source and is returned to Parameters when you leave the wizard.
- **Persona menus extended:** Rate Card and 🧭 AI Readiness added to **Sales**; 🔧 Build added to **Presales**. Enforced at boot so the additions survive a restored snapshot.
- **Knowledge hub — living memory, four refinements:**
  - Target CC confirmed defaulting to **CC3** (Connected knowledge hub, agent-ready).
  - New **CC0–CC4 maturity-scale reference table** at the bottom of the tab.
  - **Enabled by default** — the Knowledge hub now ships ON. This is a deliberate default change and it moves the headline: Y3 saving €837K → **€770K**, Run/yr €931K → **€1,007K** (hub setup/curation/infra cost, offset by the automation multiplier, KT-avoided savings and a narrower Monte-Carlo spread). Toggle it off to return to the prior baseline.
  - The 9 AS-IS statements (Coverage / Freshness / Structure) are now **one per line** instead of inline, for readability.

**Note on the golden case:** enabling the Knowledge hub by default is an intentional change requested in this release — the historical "bit-identical" headline no longer applies out of the box. All other invariants (V7 conservation, consistency checks, round-trip) were verified to still hold with the new default.

## [v14.8] 2026-07-13 Option A EV-13 unified

### One product profile (EV-13) — pillars and product status unified

The use-case pillar and the product-status lifecycle are now **one canonical product profile** with EV-13 semantics, ending the double declaration of "what kind of product is this":

- **Four profiles:** Greenfield · Feature add · Maintenance · Modernisation (End-of-life maps to Maintenance). **Critical is no longer a profile** — it lives only in the eligibility delivery-nature flag (single source for criticality).
- **One coefficient per profile × phase (12 phases kept):** each phase keeps its effort point; the profile applies one coefficient per phase (business values derived from the former lifecycle weights). The same matrix drives BOTH the effort weighting and the Eligibility potential view — selector on either tab moves the single axis.
- **Editable in Configure:** the "Product profile & phase coefficients" tab (former Status & phase weight) edits the very coefficients the profile reads — verified live: editing a cell updates profileCoef() and cascades.
- **Potential matrix display kept:** the "Use-case pillar × SDLC potential" card keeps the familiar Strong/Medium/Cautious notation and colours, now over 12 phases with the coefficient value in parentheses; the Abaque reconciliation stays per-phase via the (now unified) crosswalk.
- **Propagated everywhere:** Product status tab, Quick build, and the Build wizard (step "Product status") all show the EV-13 profiles; all 19 hardcoded old-label occurrences replaced. New consistency check **CC-PROF-01** guards profile↔matrix↔weights coherence. Profile round-trips in import/export.
- **Golden case bit-identical:** the default profile (Feature add) reproduces the former Growth weighting exactly.

## [v14.7] 2026-07-12 Navigation

### Top menu reorganised into the 8 dependency-flow stages

The left navigation now follows the same flow as the Section Dependency graph, for every persona:

- **🎛️ INPUTS** — home, build wizards, parameters, scope, product status, input team, rate card, location, assumptions, coefficients.
- **🎚️ LEVERS** — AI readiness, token economics, knowledge hub, eligibility & abaques, maturity & measurement, risk & compliance.
- **⚙️ ENGINE** — FTE/vFTE, vFTE overview, target team, TO-BE team by skill, operating model, phase/artifact detail.
- **🧱 BUILD-UP** — Monte Carlo, agent details/usage, agentic setup & run, annual/monthly, execution timeline.
- **📈 OUTPUTS** — productivity, velocity, quality, compliance, financial, commercial, AS-IS vs TO-BE, results.
- **🎯 DECIDE** — Decision Intelligence, scenarios, comparison, strategies, sensitivity, KPI, client view, sales/presales, architecture, sources, logic verification, program.
- **🔧 Configure** — status & phase weight, run-team sizing, personas.   **📤 Share** — reference map, section dependencies, glossary, import/export.

Section placement matches the dependency-graph stages. The empty-group rule is preserved: a top-level group is hidden for any persona that has no section in it (e.g. Sales shows 7 groups, Configure hidden). The Welcome hub cards were repointed to the new flow (Inputs · Levers · Engine · Outputs · Decide · Configure). Advanced-only sections (Section Dependencies) stay Advanced-only. Golden case bit-identical.

## [v14.6] 2026-07-12 EV-27+

### Verification tax — two selectable modes (overlay vs net of supervision)

- The Eligibility & Abaques tab now offers a **tax-mode selector** under the verification-tax toggle, each mode explained in the card with the live figures of the current case:
- **Case 1 — Overlay (current behaviour, default):** rate = base × average human supervision, deducted *on top of* the supervision effort already retained in the run. A deliberate prudence cushion that partially overlaps the retained review cost — the explanation now states the overlap and shows what Case 2 would deduct for comparison.
- **Case 2 — Net of retained supervision (precise):** rate = max(0, review need − supervision already retained). Only the uncovered excess is deducted, so **nothing is counted twice by construction**; if the supervision assumptions cover the need (e.g. at high SDD maturity), the tax is zero and the saving returns exactly to baseline.
- The provenance panel's double-count guard is now mode-aware (Case 1 → ⚠ REVIEW with a hint to switch; Case 2 → OK, "double count structurally excluded"), a new consistency check **CC-ABQ-03** guards the net-mode arithmetic, and the mode round-trips through import/export. Defaults unchanged — golden case bit-identical.

## [v14.5] 2026-07-12 Auditability

### Output provenance & double-count audit panel

- The **🔍 Logic verification** tab now opens with a **provenance panel** that answers "what am I actually looking at?": the headline (top-bar) figures, plus a banner stating whether you are on the **clean baseline** (all euro-affecting overlays neutral) or have deviated.
- **Optional overlays — current state:** every lever (engagement context, knowledge hub, verification tax, AI code-quality premium, SDD maturity, pillar leverage, risk register → DI, AI-Act → DI) is listed ACTIVE/neutral, with a note on whether it moves the euros or only the Decision-Intelligence verdict.
- **Double-count guards:** V7 effort conservation (Human + Agent = Input every year), a savings reconciliation (saving = baseline run − run + KT avoided − verification tax, no hidden term), an explicit flag that the verification tax is an opt-in conservative overlay on top of retained supervision, and confirmation that the analytical tabs (coaching, socle, gates, program, pillar) never feed the P&L.

## [v14.4] 2026-07-12 Advanced only

### Dependency graph added to Section Dependencies

- The **🔗 Section Dependencies** tab now opens with a **directed dependency graph** above the matrix: 24 section nodes laid out by flow stage (Inputs → Levers → Engine → Build-up → Outputs → Decide), with 72 directed edges — navy solid arrows for strong (calculation) dependencies, amber dashed for soft (annotation) signals.
- **Hover a node** to isolate its links: connected edges and neighbour nodes stay lit while the rest dims, so an impact chain is easy to trace. The matrix and the description table remain below. Pure display, Advanced persona only.

## [v14.3] 2026-07-11 Advanced only

### New Section Dependencies matrix

- New **🔗 Section Dependencies** tab (Share group, **Advanced persona only**): a 24×24 matrix over the sections that drive the calculation/data chain. A marked cell reads **row → column** (the row section feeds/impacts the column) — ● strong (calculation input), ○ soft (annotation/signal).
- Below the grid, a **dependency description table** lists, per section, its downstream impacts and the nature of each (e.g. engagement context cascading into the master formula, SDD maturity cutting the verification tax, the risk register raising the Decision Intelligence bar). Row labels deep-link to each section. Pure display, no model impact.

## [v14.2] 2026-07-11 Reference Map

### New Reference Map tab — coverage by reference subchapter

- New **🗺️ Reference Map** tab (Share group): a table with one row per subchapter of the *Software Engineering Delivery Model 2026* (17 rows across the six parts), each with a ≤5-line summary, a colour-coded **coverage** badge (Covered / Partial / Playbook) and a **direct link** that jumps to the AgentCase section carrying it.
- Coverage headline: 15 covered · 1 partial (1.1) · 1 playbook-only (2.2). The tab is available in the Presales, Sales and Advanced personas; pure display, no model impact.

## [v14.1] 2026-07-11 Persona

### All convergence tabs assigned to the Sales persona

- The eight tabs created across the convergence stream — **Eligibility & Abaques, Knowledge hub, Operating model, Commercial model, Maturity & Measurement, Program & Completeness, Risk & Compliance** and the **Delivery-model glossary** — are now all available in the **Sales** persona menu, not only in Presales/Advanced.
- The assignment is enforced at boot (robust to restored HTML snapshots), so the Sales view reliably exposes the full convergence toolset regardless of prior saved state. The Presales and Advanced personas are unchanged.

## [v14.0] 2026-07-11 Wave 4 Convergence complete

### Wave 4 — completeness: full convergence with the delivery model

New **🧭 Program & Completeness** tab (Analyze group) closing the last structural gaps. With this release, AgentCase covers all six parts of the *Software Engineering Delivery Model 2026* — it is the executable Part 6 of the merged reference model. All Wave-4 additions are analytical, so the golden case is bit-identical.

- EV-21 — Pilot sizing (pilot as product). Pod size, break-in sprints and prove weeks → pilot duration & indicative cost, framed as DEC → HOW → BLD with a frozen harness and demonstration milestones. Closes G-4.1-01.
- EV-22 — Internal capability build (Volet A). The 50 → 200 → 500 internal ramp carried by the champion/preceptor network, distinct from the client engagement (Volet B). Closes G-4.3-01.
- EV-18 — Multi-pod / AI-Native SAFe overhead. Coordination overhead (~3% per extra pod) and the bottleneck migration merge → specs → program/portfolio. Closes G-3.1-02; the Operating model tab also gains the 10 → 3×3 AS-IS → TO-BE conversion view (G-3.1-01).
- EV-26 — IP · confidentiality · sovereignty synthesis. Per-context (MSC/MSI/STA) IP ownership, confidentiality posture and sovereignty, exported in the Critical & Regulated report. Closes G-5.3-01.
- EV-14 — Maturity transition criteria. Objective L→L gates (e.g. L2→L3: acceptance ≥ 90%, override 5–15%, 0 P1, 90 days green, Design Authority approval), with the next gate highlighted. Closes G-1.1-02.
- EV-28 — Token cache & total-cost. Cacheable share × discount and the lowest-total-cost logic (not lowest token bill), pairing with Token economics. Closes G-6.2-02.
- **Glossary updated (now 81 terms):** "Deployment roadmap", "Team topology" and "Confidentiality & sovereignty" re-pointed; five terms added — "Pilot as product", "Internal capability build (Volet A)", "AI-Native SAFe scaling", "Maturity transition criteria", "Token cache & total-cost".

**Milestone:** convergence complete — 26 gaps closed across four waves; 16 of 17 reference subchapters fully covered, the rest optional polish or playbook-only.

## [v13.9] 2026-07-11 Wave 3 EV-16/19/20/24/29

### Wave 3 of the gap-analysis roadmap — human transformation & measurement

New **📐 Maturity & Measurement** tab (Analyze group) closing ten gaps. SDD maturity feeds the economics; the rest is analytical. Golden case bit-identical.

- EV-16 — SDD & tooling maturity. A 0–100 SDD-maturity lever (Vibe coding → Emerging specs → Spec-first → Spec-Driven Development → SDD + living metamodel) that cuts the verification tax by up to 50% and mitigates the AI code-quality premium (now the single source for EV-23), plus a separate agent-stack / harness readiness score. Closes G-2.1-01, G-2.1-02.
- EV-19 — Coaching curve & autonomy weaning. Coaching modelled as a declining load (Y1 40% → cruise 20%) with indicative cost, and the four autonomy-weaning tiers (intensive → on-demand → self-service → community of practice). Closes G-3.2-01, G-4.2-01.
- EV-20 / EV-29 — Four-family measurement socle. DORA + SPACE + AI signals + human early-warning indicators (time-to-judgment, bus factor, % mentoring compensated), with the change-failure-rate stability guardrail and a beyond-billable-staffing value metric. Closes G-3.3-01, G-3.3-02, G-6.3-01, G-6.3-02.
- EV-24 — Governance gates · enlarged DoD · AI-BOM. Non-bypassable CI gates, C2, anti-false-success guardrails, an enlarged Definition of Done and an AI Bill of Materials — exported in the Critical & Regulated report. Closes G-5.1-02, G-5.1-03.
- **Glossary updated (now 76 terms):** "Spec-Driven Development", "Agent stack", "Preceptorship" and "DORA metrics" re-pointed to the new tab; five terms added — "SDD & tooling maturity", "Coaching curve & autonomy weaning", "Human early-warning indicators", "SPACE framework", "AI-BOM & enlarged Definition of Done".

## [v13.8] 2026-07-11 Wave 2 EV-17/23/25

### Wave 2 of the gap-analysis roadmap — risk & responsible AI

New **🛡️ Risk & Compliance** tab (Decide group) closing four gaps (G-5.1-01, G-5.2-01, G-5.2-02, G-4.3-02). All contributions are toggle-gated and neutral by default, so the golden case is bit-identical.

- EV-17 — Agentic risk register. Eight risks with editable probability × impact and a mitigation each: prompt/indirect injection (~73% of deployments vulnerable), MCP/skills supply chain (492 exposed servers, 1184 malicious skills), secret theft, model/vendor dependency, hallucination/false-success, knowledge debt, ~88% pilot mortality and ~40% cancellation. The consolidated score can raise the Decide & Scale bar (CC-RISK-01). Closes G-5.2-02, G-4.3-02 and the economic hook of G-2.2-01.
- EV-25 — EU AI-Act tier classifier. Per-mission tier (unacceptable / high / limited / minimal) with the obligations surfaced and, when applied, a Decision Intelligence bar increase — complementary to NIST AI RMF and ISO/IEC 42001 (CC-AIACT-01). Closes G-5.2-01.
- EV-23 — AI code-quality risk premium. Severity anchors (correctness ×1.75, maintainability ×1.64, security ×1.57) with an SDD-maturity mitigation slider; when applied it multiplies the verification tax (Wave 1) and adds a stability term to the DI bar (CC-QUAL-01). Closes G-5.1-01.
- **Glossary updated (now 71 terms):** "Responsible AI" and "Quality gates" re-pointed to the new tab; three terms added — "EU AI-Act risk tiers", "Agentic risk register", "AI code-quality risk premium".

## [v13.7] 2026-07-11 Wave 1 EV-13/15/27

### Wave 1 of the gap-analysis roadmap — decision integrity

New **🎯 Eligibility & Abaques** tab (Build group) closing five gaps from the delivery-model gap analysis. All defaults are neutral, so the golden case is bit-identical.

- EV-15 — Eligibility gate. Six prerequisites (met/partial/unmet), a codebase-size input (\> 500k LoC forces NO-GO), and a delivery-nature flag (standard / embedded / critical / sovereign) that hardens the gate, producing a **go / conditional / no-go** verdict that annotates Decision Intelligence (CC-ELIG-01). Closes G-1.2-01.
- EV-13 — Pillar × SDLC potential matrix. A five-pillar selector (greenfield / feature add / modernisation / maintenance / critical) with the reference leverage matrix (Strong 1.0 / Medium 0.7 / Cautious 0.45 / n-a), showing where to deploy agents first and optionally feeding the Abaque reconciliation via an 11-phase → 7-activity crosswalk. Closes G-1.1-01 and G-1.2-02.
- EV-27 — Abaque A / B + verification tax. A per-phase reconciliation: Abaque A (addressable per phase) × Abaque B (maturity capture L1 0–15 % … L4 75–100 %) × pillar leverage − **verification tax** = net gain. The verification tax is computed (rate = editable base × average human supervision, capped 60 %) and, via a toggle, deducted from yearly savings so the ~10 % net productivity paradox is explicit (CC-ABQ-01/02). Closes G-6.1-01 and G-6.1-02.
- **Glossary updated (now 68 terms):** "Project eligibility", "Abaques A & B" and "verification tax" re-pointed to the new tab and re-tagged as implemented; a new term "Five use-case pillars (potential matrix)" added.

## [v13.6] 2026-07-11 EV-12

### Glossary definitions rewritten to align with the reference document

All 67 glossary terms now carry **long, explicit definitions** drawn directly from *Modèle de délivery software engineering 2026* (whose own glossary annex was still "à rédiger"). Average definition length rose from ~10 words to ~268 characters.

- **Canonical terminology adopted:** the L1–L4 labels now use the reference names — L1 Ad-hoc Assistance (AI assists individuals), L2 Targeted Automation, L3 Augmented Delivery (AI does, human monitors), L4 Autonomous Organization (AI orchestrates, human governs) — each with its indicative gain band and AgentCase ramp/authorization mapping.
- **Faithful corrections:** SDD is now defined as *Spec-Driven Development* (spec as primary executable artifact, EARS, ×3–×10 first-try, EDF −40% re-prompting), distinct from the detailed-design artifact A012; *T0/T1/T2* is now the commitment calendar (estimated → measured → engaged), disambiguated from Agentshore capacity tiers; gain sharing is tagged as emerging/out-of-v1-scope per the doctrine.
- **Reference specifics embedded** throughout: capacité de maîtrise per engagement context, the six eligibility prerequisites (\< 500k LoC…), the verification tax and ~10% net productivity paradox, Abaque A × Abaque B, FinOps ~13→~30 \$/dev-day with −90% token cache, the diamond team structure, tripartite governance (Design Authority / AI Office / Delivery Team), Human-in-the-Lead, the EU AI Act / NIST AI RMF / ISO 42001 trio, Living Memory/Metamodel 97% vs 31%, and the DORA + SPACE + AI-signals + human-indicators measurement socle.
- Longer text flows through every surface: the glossary tab, the inline-home view, the footer quick-search results and the Markdown export.

## [v13.5] 2026-07-11 UX

### Glossary quick-search in the page footer

- A persistent **glossary search field in the footer**, available from every tab. As the user types, matching terms render in the footer — each showing the delivery-model term, its AgentCase equivalent, the definition and a status badge — capped at 8 with a "+N more → open the full glossary" link.
- Progressive disclosure: an **empty query or a query with no match collapses the panel**, leaving only the search field. Results appear only when there is something to show.
- Independent of the tab/home filters; the "open the full glossary" link carries the query into the glossary page (or the inline home view when that mode is on).

## [v13.4] 2026-07-11 UX

### Glossary display toggle on the Welcome page

- New tickbox on 🏠 Welcome: **"Show the delivery-model glossary on this page"**. Unticked (default) keeps the glossary as its own in-app page with a compact pointer on Welcome; ticked pulls the full searchable glossary inline onto Welcome and hides the separate tab from the sidebar.
- Search and category filters operate on whichever surface is on screen; the glossary tab and the inline home view share one builder (no duplication).
- If the glossary page is open when the box is ticked, the app falls back to Welcome. The toggle is persisted in HTML snapshots and its nav visibility is restored on load.

## [v13.3] 2026-07-11 EV-12

### Full delivery-model glossary moved into AgentCase

The entire vocabulary of the *Software Engineering Delivery Model 2026* now lives inside the tool — no longer a 12-line side-note, but a first-class, searchable reference.

- New **📖 Delivery-model glossary** tab (Share group): **67 terms** across **9 dimensions** — Vision & Engagement, Process & SDLC, People & Operating Model, Platform & Knowledge, Economics, Commercial, Transformation & Change, Governance/Safety/Compliance, KPI & Performance.
- Each term is **mapped term-by-term** to its AgentCase equivalent, carries a one-line definition, and is tagged by convergence status: Aligned · Mapped in AgentCase · AgentCase strength.
- **Live search** (term + definition) and **category chips**; colour-coded by dimension; the Welcome tab now shows a compact pointer into the full glossary.
- New **Export glossary (.md)** button; the glossary is also appended to the Reference Model Annex as section I and persisted in HTML snapshots.
- Coverage includes the terms that were previously implicit: maturity L1–L4 labels, the three engagement contexts, pod/orchestrator/AI-reviewer/preceptor/AI-Office roles, Knowledge Hub / living memory / Knowledge Graph / KT Hub, Glass Ceiling, effort conservation, vFTE, Effort & Tools / AI-Augmented Humans / Agentshore T0-T2 / gain sharing, change management & preceptorship, human-in-the-lead / on-the-loop / over-the-loop, DO-178C / ISO 26262 / IEC 61508 / IEC 62304, responsible AI & sovereignty, and DORA / cycle-time / rework KPIs.

## [v13.2] EV-11

### Critical & Regulated delivery report

- EV-11 Standalone HTML export: active norms & regulatory artifacts, Glass Ceiling per phase, supervision floors & postures, AI-authority caps under the active engagement context, compliance economics and the gated Discover→Scale trajectory.
- Consolidated convergence check suite in 🔍 Logic verification: CC-CTX-01…04, CC-KH-01/02, CC-OM-01, CC-SUP-01, including the directional "STA degrades vs MSC" test.

## [v13.1] EV-10

### Knowledge hub — living memory (CC0–CC4)

- New 🧠 Knowledge hub tab. Three quantified channels: potential multiplier ×\[0.70…1.06\] (capped by the regulatory ceiling), Monte Carlo σ ×(1−0.08·CC), and avoided KT/onboarding cost. Setup & run flow into the economics; hub-attributable Δ shown honestly. Availability bounded by context (STA locked · MSI ≤ CC2 · MSC ≤ CC4).

## [v13.0] MAJOR EV-09

### Operating model — team topology & pods

- New 🧩 Operating model tab: pods of 2–4, transverse Preceptor/Agent Architect, AI Office. **V7 conservation enforced** (CC-OM-01) — roles are a re-labelling of the computed residual volume, nothing added. Human ↔ agentic role mapping; transverse ratios decrease Y1→Y3 to encode the L-trajectory.

## [v12.66] EV-08

### Human Readiness Index + change cost

- Second index in AI Readiness (6 human dimensions × 3 statements). When enabled: change cost added to Setup and adoption drag ramp × (0.6 + 0.4·HRI/100) applied to the S-curve. Off by default.

## [v12.63] EV-07

### Commercial model

- New 💼 Commercial model tab: Effort & Tools, AI-Augmented Humans (live break-even uplift), Agentshore (capacity points, T0/T1/T2 mix), Gain sharing (quarterly true-up). Client TCO vs Capgemini margin; context-gated availability; automatic recommendation rule.

## [v12.60–62] EV-06 · P1

### Engagement context — MSC / MSI / STA

- Global selector + editable coefficient table cascaded into the master formula, S-curve, setup billable split, Decision Intelligence bars and Monte Carlo spreads. MSC defaults strictly neutral → golden case unchanged.

## [v12.57–59] EV-01…05

### Quick wins

- EV-01 Shared vocabulary (superseded by the full glossary in v13.3) · EV-02 Maturity mapping L1–L4 · EV-03 Supervision matrix & postures · EV-04 Unified Discover→Scale roadmap · EV-05 Reference Model Annex export (.md).

### Delivery-model glossary — coverage by dimension (v13.3)

| Dimension                           | Terms | Examples                                                |
|-------------------------------------|-------|---------------------------------------------------------|
| 1 · Vision & Engagement             | 11    | Maturity L1–L4, MSC/MSI/STA, project eligibility        |
| 2 · Process & SDLC                  | 6     | SDLC, artifact, SDD, product-status lifecycle, roadmap  |
| 3 · People & Operating Model        | 10    | Pod, orchestrator, AI reviewer, preceptor, AI Office    |
| 4 · Platform & Knowledge            | 6     | Knowledge Hub, Knowledge Graph, KT Hub, agent stack     |
| 5 · Economics                       | 8     | Glass Ceiling, effort conservation, vFTE, adoption ramp |
| 6 · Commercial                      | 6     | Effort&Tools, AAH, Agentshore, T0/T1/T2, gain sharing   |
| 7 · Transformation & Change         | 6     | Change management, upskilling, champions, preceptorship |
| 8 · Governance, Safety & Compliance | 9     | Human-in-the-lead, DO-178C, responsible AI, sovereignty |
| 9 · KPI & Performance               | 5     | DORA, quality gates, cycle time, rework, value metrics  |

### Non-regression & QA (v13.3)

- Golden case identical: Input 15.0 / Target Y3 9.5 / −37% / +80% / €931K / €837K / 34%.
- Playwright pass: glossary tab renders 67 terms / 9 categories, search & category filters verified, Welcome pointer present, export function live, zero console errors.
