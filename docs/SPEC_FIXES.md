# AgentCase — Specification: the issues to fix after v21.6.0

> Status: **draft for the owner's review (2026-10-31)**. Base: `main` at v21.6.0 (BPMN migration B0–B9e, B10a–B10d merged).
> Related: [SPEC_BPMN.md](SPEC_BPMN.md) § 20 (open items after the migration) and § 21.5–21.8 (B10 notes), [DEVIATIONS.md](DEVIATIONS.md),
> [ARCHITECTURE.md](ARCHITECTURE.md), [GUIDE_BPMN.md](GUIDE_BPMN.md).
> Rules unchanged: files ≤ 150 lines, no `any`, layers `ui → controllers → store → domain`, every document change an undoable command,
> view state never undoable, one owner per figure in `src/domain`, single-product figures identical to the legacy file unless recorded in
> DEVIATIONS.md and `app/tests/helpers/deviations*.ts`, one PR per lot merged on green CI with the HTML shared.

> **Progress (2026-11-01, updated after lot X6 part 2):** every row is tagged — ✅ **Done** (merged, or on the branch for FX-05 / FX-22), ⏳ **Open**,
> ⏸ **Tracked** (waits on an upstream release). Lots: X0, X1, X2, X3 done; X5 done except FX-32 (needs a ProjectLibre / MS Project check);
> X8 done (FX-44 tracked); X9 done except the owner's items (FX-57, FX-59, FX-60, FX-63); X6 partly done (FX-05, FX-21, FX-22 done; FX-23 and
> the decisions FX-D4, FX-D6, FX-D7, FX-D11 open); X4 partly done (FX-15, FX-20 done); X7 open. Owner actions open: FX-O1, FX-O3, FX-O4, FX-O5.
> **On hold** at the owner's request after this update.

## 1. Purpose

One list of everything still open after the BPMN migration and the organisation × portfolio work: each issue with its impact, whether it
needs the owner's **decision** first or is plain **work**, whether it would move a figure, a proposed fix, a size and a priority. The
issues are then grouped into lots (§ 4) that can be delivered one PR at a time.

**Priorities.** **P1** — consistency or correctness (a figure, a stale state, a silent loss, a one-owner breach). **P2** — completeness of a
built feature (a screen, an export, an import path). **P3** — polish and tooling.

**Figure impact.** **None**; **Opt-in** (only when the user turns something on); **Deviation** (moves figures of existing cases: needs a
DEVIATIONS.md entry and the owner's approval of the before → after on the golden case).

## 2. Decisions needed before work (the owner chooses)

| ID | Issue | Options (recommended first) | Figure impact | Source |
|---|---|---|---|---|
| FX-D1 | ✅ Done — Changing a product's owning unit marks the Monte Carlo run stale although no figure moves | (a) take the organisation (units, owners) out of the run fingerprint; (b) keep it | None | § 21.8 |
| FX-D2 | ⏳ Open — One correlation ρ for the whole portfolio | (a) keep one ρ, show the unit's implied correlation; (b) a ρ per unit (inside a unit) plus a ρ between units | (b) Opt-in | § 21.8 |
| FX-D3 | ✅ Done — Service activities assigned by type or role split the service cost but are not routed to the service line inside each product's engine | (a) route them (the service row carries them in every product); (b) keep pins only | (a) Deviation | § 21.7 |
| FX-D4 | ⏳ Open — Per-product RACI without copying the process | (a) an `ac:raciOverride` element per product in the organisation part; (b) keep the RACI in the process part | None | § 21.5 |
| FX-D5 | ✅ Done — The tool catalogue (129 tools) is verified 2026-10-31; 43 entries partial or unverified | Sign off as is / sign off after a manual pass on Enterprise Architect, ServiceNow and the partial entries / add Google Antigravity and TeamCity | None | SPEC_BPMN item 8 |
| FX-D6 | ⏳ Open — The audit is per process document: products sharing the common process share one audit | (a) a per-product audit part like the organisation part; (b) keep | None | item 10 |
| FX-D7 | ⏳ Open — No figure reads the RACI (§ 16.5 figures not built) | (a) build the RACI-driven load and cost by unit, opt-in; (b) keep RACI informative | Opt-in | item 15 |
| FX-D8 | ⏳ Open — Hand-off cost, cadence, waits, change-failure rate, token profile are views, not engine figures | (a) feed the engine, opt-in per factor; (b) keep views | Opt-in | item 21 |
| FX-D9 | ⏳ Open — The default process does not link the SDLC chain with data inputs | (a) link it (traceability complete by default); (b) keep | None (document only) | item 22 |
| FX-D10 | ⏳ Open — CMMN read-back drops content it does not map | (a) keep it in an extension element (pass-through); (b) keep dropping | None | item 27 |
| FX-D11 | ⏳ Open — Programme lanes (operating-model roles) are not linked to the organisation's roles | (a) map each operating-model role to an organisation role with a team skill; (b) keep separate | None | item 30 |
| FX-D12 | ⏳ Open — The delivery diagram has no agents' lane | (a) add an agents' lane to the default DI (exports change, figures do not); (b) keep | None | item 31 |
| FX-D13 | ⏳ Open — `setupTraining` / `setupGov` are stored but no figure reads them | (a) retire them, with deviations for the DD register (119 → 117 rows), report and legacy sheet; (b) keep as legacy inputs | Deviation (legacy outputs) | item 33 |
| FX-D14 | ⏳ Open — Waves, setup capacity and knowledge subsets live outside the BPMN document | (a) a portfolio-level BPMN document (waves as sub-processes, capacity on lanes); (b) keep as portfolio data | None | item 34 |
| FX-D15 | ⏳ Open — Plan sheets and pages exist only in the Plan screen's exports | (a) add them to the Financial workbook and the report as optional sections; (b) keep | None | item 37 |

### 2.1 The owner's answers (recorded 2026-11-01, lot X1)

| ID | Answer | Consequence | Lot |
|---|---|---|---|
| FX-D1 | ✅ Done — **(a)** take the organisation out of the Monte Carlo run fingerprint | An org-only edit no longer marks the run stale; no figure moves. **Fixed (lot X2a)**: a unit's name, kind, tree, location, cost centre, sourcing and a product's owner left out; a service spec still counts (an owner edit never reached the fingerprint: the test saying so compared different ρ) | X2 |
| FX-D2 | ⏳ Open — **(a)** keep one ρ, show each unit's implied correlation | Nothing to build beyond the implied-correlation view (SPEC_HARNESS HX-D6 adds a correlation through shared harnesses) | X7 |
| FX-D3 | ✅ Done — **(a)** route type / role service activities to the service line in every product | **Fixed (lot X2b)**: routed as pins of the service's lines (by team skill); measured: **no headline figure moves** (the golden case has no service; `serviceThree` NPVs identical), only the spread over team lines — DEV-FXD3-SERVICE-ROUTING, so no before → after approval was needed | X2 |
| FX-D4 | ⏳ Open — **(a)** `ac:raciOverride` per product in the organisation part | No figure moves | X6 |
| FX-D5 | ✅ Done — **Sign off as is** (43 entries stay marked partial / unverified) | FX-O2 done; the catalogue's status reads "signed off 2026-11-01" | X1 |
| FX-D6 | ⏳ Open — **(a)** a per-product audit part | Consistent with SPEC_HARNESS (the audit on each product's baseline) | X6 |
| FX-D7 | ⏳ Open — **(a)** RACI-driven load and cost by unit, opt-in | The base of SPEC_HARNESS's cells (activity × team) | X6 |
| FX-D8 | ⏳ Open — **(a)** feed the engine, opt-in per factor | The token profile becomes SPEC_HARNESS § 11's token owner | X7 |
| FX-D9 | ⏳ Open — **(a)** link the SDLC chain with its data inputs in the default process | Document change only | X7 |
| FX-D10 | ⏳ Open — **(a)** CMMN pass-through in an extension element | No figure moves | X7 |
| FX-D11 | ⏳ Open — **(a)** map each operating-model role to an organisation role with a team skill | Needed for SPEC_HARNESS's build pods and run teams | X6 |
| FX-D12 | ⏳ Open — **(a)** an agents' lane in the default diagram | Exports change, figures do not | X7 |
| FX-D13 | ⏳ Open — **(a)** retire `setupTraining` / `setupGov` | **Deviation** of legacy outputs: DD register 119 → 117 rows, report and legacy sheet | X7 |
| FX-D14 | ⏳ Open — **(a)** a portfolio-level BPMN document: waves as sub-processes, capacity on lanes | Schema migration; also the home of SPEC_HARNESS's pilot and wave slices | X7 |
| FX-D15 | ⏳ Open — **(a)** Plan sheets and pages as optional sections of the Financial workbook and the report | No figure moves | X7 |

## 3. Issues (work)

### 3.1 Data model and calculation (P1)

| ID | Issue | Proposed fix | Figure impact | Size | Source |
|---|---|---|---|---|---|
| FX-01 | ✅ Done — A case-level opt-in activity switched on in the common values is counted by every product | Count a case-level programme activity once per portfolio (owned by the common case), per product only when the product turns it on; one owner in `programme/profile.ts`. **Fixed (lot X2b, unreleased).** Counted by one carrier product (first planned product of the earliest wave) so the sum of the products counts it once; another product only with its own switch (DEV-FX01-CASE-OPTIN) | Opt-in cases only | M | items 32, § 19.10 |
| FX-02 | ✅ Done — D-B9: the JSON catalogues still generate the default process | Build step that ships `defaultProcess.bpmn`'s node tree (DOM-free reader); move the reference-list readers (reset, pins, factory pickers, legacy sheets, per-phase tables) to the default-process views; retire the JSON. **Fixed (lot X3, unreleased).** A DOM-free reader of the trusted shipped XML (`process/xmlRead.ts`: the browser reader's very tree, same bytes back); `catalog/index.ts` reads every catalogue list from the shipped file (so every reference-list reader reads the default process); `artefacts.json`, `regCatalog.json`, `phases.json`, `loopPairs.json` deleted; `process:check` now proves the file regenerates byte-identically from the lists read from it; the order helpers moved to `process/order.ts` (no catalogue cycle). Bundle +0.27 MB raw (perf budget ok) | None | L | item 1 |
| FX-03 | ✅ Done — Pins of a custom activity are refused | `normalisedPins` validates against the case's process activities, not the catalogue ids. **Fixed (lot X2a, unreleased).** One owner `pinTargets(doc…)` (the case's activities, custom ones included, and the catalogue) read by both Excel imports; the dead `normalisedPins` removed | None | S | item 2 |
| FX-04 | ✅ Done — Per-phase tables do not list a custom phase | `phaseArtRows` and agent usage read the process phases. **Fixed (lot X2a, unreleased).** Both read `caseViews(s).phases` (catalogue fallback without a document); oracle parity kept | None | S | item 3 |
| FX-05 | ✅ Done — `withLibrary` is not applied to a portfolio product's effective case | Apply the common library entries to each product's process part (B10a split makes it possible). **Fixed (lot X6, unreleased).** `mergeCase` resolves a product's own process document with `withLibrary` against the common one: a call to a common global task now counts its effort; a product that calls none keeps its document object (no figure moves) | Opt-in (library users) | M | item 23 |
| FX-06 | ✅ Done — A new role's resource is inserted mid-list (large undo patch) | Insert at the end of the resource block allowed by the XSD order, or index roles separately. **Fixed (lot X2a, unreleased).** Appended at the end of the root elements (before the diagrams): undo step 1.35 MB → 0.29 MB, no process or collaboration copied | None | S | item 4 |
| FX-07 | ✅ Done — The default delivery unit is derived until first used | Write it at migration only when the case has units or owners (exports of untouched cases stay identical). **Fixed (lot X2b, unreleased).** Written when the organisation comes into use (the first unit added, first among the units, the tree unchanged), never at open: a saved file reopens as the same document; an untouched case keeps it derived | None | S | § 21.5 |
| FX-08 | ✅ Done — Products a unit owns directly are not shown as their own row in its sub-unit ranking | Add a "directly owned" row to `unitRanking`. **Fixed (lot X2a, unreleased).** Unit scope `direct: true`; the rows partition the unit; Show opens the unit | None | S | § 21.8 |

### 3.2 Screens (P2)

| ID | Issue | Proposed fix | Size | Source |
|---|---|---|---|---|
| FX-10 | ⏳ Open — The extended profile (B5b) has no screens | Panels in 🧩 Process: data stores and tools, states, volumes, timers, boundary events, library, conversations, colours; export dialog options (colours, organisation view, several diagrams) | L | item 20 |
| FX-11 | ⏳ Open — No screen edits or binds DMN decisions | A decisions panel: list, bind to a rule task (`process.bindDecision`), a read-only table view with hit policy; DMN DI optional (FX-26) | M | item 26 |
| FX-12 | ⏳ Open — Diagram editor: no properties panel | A properties panel in the editor writing the same commands as the parameter panel | M | item 5 |
| FX-13 | ⏳ Open — Diagram editor: its own undo history is lost on Save | Keep the editor open after save (re-import with the command stack preserved) or warn before | S | item 6 |
| FX-14 | ⏳ Open — Diagram editor shows the first diagram only | Diagram picker when the document holds several | S | item 7 |
| FX-15 | ✅ Done — The Process diagram is not coloured by audit status | Colour shapes by audit progress (B5b `colourBy`) with a legend. **Fixed (unreleased):** Colours → Audit progress (planned, in progress, audited, closed; not audited uncoloured) with its legend, `auditProgressOf` in `domain/audit` | S | item 11 |
| FX-16 | ⏳ Open — The resource histogram stacks by role only | Grouping by team, unit (B10) or location | S | item 35 |
| FX-17 | ⏳ Open — Unit picker indentation stops at level 6 | Indent through a CSS custom property per level (no inline style budget issue) | S | § 21.5 |
| FX-18 | ✅ Done — The wave link from the map opens 📅 Plan without focusing anything | Open the Waves screen on the wave, or the Plan Gantt on its band. **Fixed (lot X8, unreleased).** A wave opens 📅 Plan with the display scope set to that wave (its own bars) | S | v21.1.0 notes |
| FX-19 | ✅ Done — Link texts use the menu label "📅 Gantt / Timeline" while the screen reads "📅 Plan" | Use the section title in links (or rename the menu with a recorded deviation, DEV-B9D-PLAN-SCREEN). **Fixed (lot X8, unreleased).** `SECTION_TITLES` / `linkLabel` in the registry: links say 📅 Plan, the menu keeps its legacy label | S | v21.1.0 notes |
| FX-20 | ✅ Done — Plan Gantt / WBS / OBS rows link only to Process | Add "Open in Programme" on programme rows. **Fixed (lot X8, unreleased).** `PlanLink`: the name opens Process, 📋 opens 📋 Programme on the row (WBS, dictionary, RAM, schedule) | S | v21.1.0 notes |
| FX-21 | ✅ Done — No audit on programme activities | Allow observations on programme tasks (same `ac:audit`), calibration not applicable. **Fixed (lot X6, unreleased).** 🔎 Audit › Programme lists the programme activities with the same audit form; their audits live in the collaboration (`ac:programmeAudit`, one `ac:audit element="…"` each; XSD added) since the programme process is derived; one undoable step per edit; carried by save / open and an export with audit data | M | item 14 |
| FX-22 | ✅ Done — A role's split between teams follows FTE × share only | Per-activity share on a role's team assignment. **Fixed (lot X6, unreleased).** `ac:raci teams="team:% …"` (XSD added): the RACI editor sets the share of the activity's Responsible work each team does (at most 100 % in all); the team load (🧭 Who does what › By team) then takes that share of the effort instead of the FTE × share split. A view: no figure | M | item 16 |
| FX-23 | ✅ Done — Organisation lane view: no geometry, not in the export dialog, not imported | Layout the lanes, add the export option, map organisation lanes on import (F-B8 dialog). **Fixed (lot X6, unreleased).** One band per role lane inside the pool (teams and units span theirs, `orgLaneShapes`); the export dialog's "Add the organisation view" writes the second diagram; on import an organisation lane set names roles (its role lane's `partitionElementRef` resource), never units to map | M | item 17 |

### 3.3 Import, export and workbooks (P2)

| ID | Issue | Proposed fix | Size | Source |
|---|---|---|---|---|
| FX-24 | ✅ Done — The import report does not show kept / dropped foreign content; content in an unmapped lane or crossing phases is dropped | Report kept / dropped counts per kind; keep crossing content in a pass-through container. **Fixed (lot X5, unreleased).** The import report lists the foreign content kept, kept as written, dropped, by kind; what crosses phases, sits in an unmapped unit or is a nested sub-process goes to `ac:passThrough` (its XML in base64, opaque to the model; XSD element added) | M | item 24 |
| FX-25 | ✅ Done — A Merge import does not merge audit data | Merge observations by activity id with a conflict rule (newer date wins, both kept in history) **Fixed (lot X5, unreleased).** `mergeImportedAudit`: observations (field + role) and tools (code) by element id, newer date wins (a tie keeps the case's); pain points and evidence added; shared roles merged; the file's own catalogue entries added; one undoable step, so the replaced values stay in the history; the report counts them | M | item 13 |
| FX-26 | ⏳ Open — DMN decisions are not drawn | Write DMN DI and show decisions as data on the diagram | M | item 29 |
| FX-27 | ✅ Done — Exported rule families do not apply until bound to a rule task | Bind them to the default rule tasks on export, or say so in the export dialog. **Fixed (lot X5, unreleased).** The export dialog says so when the DMN box is ticked: how many decisions (or reference rule families) are bound to no business-rule task (`dmnBindingState`) | S | item 28 |
| FX-28 | ✅ Done — The tool catalogue is not a sheet of the audit workbook | Add a Catalogue sheet (case entries editable, shipped read-only) **Fixed (lot X5, unreleased).** Catalogue sheet: every entry of the effective catalogue with its Origin; a changed shipped row is ignored with a note unless marked "case"; taken in the import's one step | S | item 9 |
| FX-29 | ✅ Done — The audit header and role-level audits are not in the audit workbook | Add Header and Roles sheets, round trip. **Fixed (lot X5, unreleased).** Header (one row per item, auditor, interview; lists replaced by the sheet's rows) and Roles (observations on a role as a whole) sheets; export → import into a fresh case gives the same header, role audits and case catalogue | S | item 12 |
| FX-30 | ✅ Done — The parameters workbook carries no units or owners | Units and Owners sheets, round trip, refused import names the unit. **Fixed (lot X5, unreleased).** "Units" (id, name, type, parent, location, cost centre, sourcing, shared service with its activity types and roles) and "Owners" (owner unit per product) in "Export all"; on import the Units sheet replaces the case's units (`withUnitList`, sheet order kept), an owner, parent or shared-line unit not in the sheet is refused by name; an older workbook keeps the case's | M | § 21.7 |
| FX-31 | ✅ Done — No per-service or per-unit sheet in the results workbook beyond the Unit scope's leading sheet | A Services sheet; per-unit sheets for the shown unit's children. **Fixed (lot X5, unreleased).** "Services" (delivery by product and lines, the Services view's figures) when the portfolio has a shared service; under a Unit scope one "Unit <name>" per sub-unit after the unit's | S | § 21.7, § 21.8 |
| FX-32 | ⏳ Open — MS Project XML not opened in MS Project / ProjectLibre | Open the export in ProjectLibre in CI (headless import) or a manual check recorded with screenshots | S | item 36 |
| FX-33 | ✅ Done — Tool proposals by data type (F-B43) and the interface audit feeds (F-B55) are not wired | Propose tools by data type; feed message-flow interfaces into the operational audit. **Fixed (lot X5, unreleased).** `audit/feeds.ts`: the deliverable kinds an activity reads or writes propose the tools of their capabilities (document → Documentation, code → Coding and Review, test suite → Test, model → Design, record → Compliance, dataset → Analysis) under its capability's list; the Flow block shows the modelled hand-offs and the pools at the other end. A view, no figure | M | item 25 |
| FX-34 | ✅ Done — The shipped portfolio example is still schema v3 | Regenerate it at schema v5 (the oracle fixtures are never regenerated). **Fixed (lot X5, unreleased).** Regenerated with `scripts/portfolio-example.ts` | S | § 21.5 |

### 3.4 Performance, tests and tooling (P3, P1 where marked)

| ID | Issue | Proposed fix | Prio | Size | Source |
|---|---|---|---|---|---|
| FX-40 | ✅ Done — The full test suite times out on a loaded machine (dozens of 5 s timeouts per agent run; CI green) | Set `testTimeout` per heavy file (fixtures, portfolio, ui) or shard the suite; move fixture sweeps to `beforeAll` like `theme-palette`. **Fixed (lot X2b, unreleased).** `tests/setup/timeouts.ts`: 30 s for the heavy areas (store, ui, bpmn, portfolio, whole-graph checks; measured 1.5–5 s idle), 5 s kept for plain domain tests; only ever raises a limit (`AC_TEST_TIMEOUT`, 90 s under `validate:affected`) | P1 | M | agent reports |
| FX-41 | ✅ Done — Process filters and the two diagram frames re-render on a process edit | Memoise `FilterSelect` options and the frames on their inputs. **Fixed (lot X8, unreleased).** Option lists memoised on the rows; the diagram frames were already memoised (pan and options redraw no shape) | P3 | S | selective-refresh notes |
| FX-42 | ✅ Done — Process views are cached on the whole document's identity | Memoise per phase / per activity node so one edit recomputes one branch. **Fixed (lot X8, unreleased).** `activitiesOf` memoised on its container element and a stable BPSim map: an edit re-reads its phase only (the other phases' activity objects are reused) | P3 | M | selective-refresh notes |
| FX-43 | ✅ Done — A DD sensitivity saved by a schema-3 file, and Monte Carlo runs saved before B10a's team order, show as stale once | Accept (documented) or migrate the stored fingerprints. **Fixed (lot X8, unreleased).** Accepted and documented: the fingerprint is not stored data worth migrating (a stale mark offers ⟳ Run again, which redraws in seconds); recorded in CHANGELOG | P3 | S | § 19.13, § 21.5 |
| FX-44 | ⏸ Tracked (upstream: exceljs) — `npm audit` depends on an override (`minimatch` ^11.0.3) for exceljs / archiver | Track upstream; drop the override when exceljs ships a fixed archiver. **Checked 2026-11-01 (lot X8):** exceljs 4.4.0 is still the latest and still depends on archiver 5.3.2, so the override stays; re-check at each dependency lot | P3 | S | v20.31.0 |
| FX-45 | ✅ Done — Shared scratchpad logs between parallel agent runs overwrite each other | Per-worktree log folder in the agent brief. **Fixed (lot X8, unreleased).** BUMP_PROCEDURE § 4: one folder per worktree, never a fixed shared path | agent reports |

### 3.5 Owner actions (no code)

| ID | Action | Where |
|---|---|---|
| FX-O1 | ⏳ Open — Create and push the release tags v19.0.0 … v21.6.0 (all commands now listed, FX-64) | docs/RELEASE_TAGS.md |
| FX-O2 | ✅ Done — Sign off the tool catalogue (FX-D5) — **done 2026-11-01: signed off as is** | 🔎 Audit, SPEC_BPMN § 15.7 |
| FX-O3 | ⏳ Open — Delete the 9 old local branches from the 22–24 Oct theme work (kept until you say yes) | local clone |
| FX-O4 | ⏳ Open — Supply real (anonymised) customer files for the differential run (FX-63) | `app/fixtures/customer/` |
| FX-O5 | ⏳ Open — Port or keep out: AME comparison / per-snapshot Excel (FX-57), "being ported" UI items (FX-59), `TE-10b` (FX-60) | this file |

### 3.6 Carried-over open items (recheck of 31 Oct 2026)

Found by a sweep of the code (TODO/FIXME, skipped tests: none skipped), MIGRATION_PLAN § 15, VUE_AGREGEE § 4–5, ARCHITECTURE § 12
and GitHub (no open issue, no open PR). Not covered by FX-01…FX-45 above.

| ID | Issue | Fix | Priority | Size | Source |
|---|---|---|---|---|---|
| FX-50 | ✅ Done — Two sections still use the generic aggregate fallback: `compliance` (R-rollup) and `risk` (I-input) | Register their own aggregate (coverage per product; risk register, AI Act tier and premium per product); set them DONE. **Fixed (lot X9, unreleased).** Both aggregates existed (`verify/compliance`, `tune/risk`); VUE_AGREGEE set to DONE; a test asserts every section following the View has its own aggregate | P2 | M | VUE_AGREGEE § 4 "TO DO"; `ui/zones/fallbacks.tsx` |
| FX-51 | ✅ Done — `ConsoFallback` carries a TODO ("consolidated view coming") with no tracked R-conso section left in VUE_AGREGEE § 5 | Check no R-conso section reaches it; keep it as a safety net, drop the TODO, add a test that every R-conso section has its own aggregate. **Fixed (lot X9, unreleased).** `tests/ui/aggregates-complete.test.ts` | P3 | S | `app/src/ui/zones/fallbacks.tsx:71` |
| FX-52 | ✅ Done — Legacy discrepancy: stale help figures and fixed "3-year" labels in some sections | Derive labels from the horizon; refresh help figures from the engine. **Fixed (lot X9, unreleased).** The ROI label reads the horizon, the two "beyond 3 years" messages are neutral, the run-sizing help prints this case's legacy run cost (DEV-HORIZON-LABELS) | P2 | S | MIGRATION_PLAN § 15.4 |
| FX-53 | ✅ Done — Legacy discrepancy: Location Target exported rounded to whole % | Export the full value (deviation recorded). **Fixed (lot X9, unreleased).** DEV-EXCEL-TARGET-LOC | P2 | S | MIGRATION_PLAN § 15.4 |
| FX-54 | ✅ Done — Legacy discrepancy: FM environment `isProd` dropped on import | Import it; round-trip test. **Fixed (lot X9, unreleased).** A Production column; older workbooks keep the case's flags (DEV-EXCEL-FM-PROD) | P2 | S | MIGRATION_PLAN § 15.4 |
| FX-55 | ✅ Done — Legacy discrepancy: `bass` curve family not restored by the legacy snapshot restore | Restore it when opening a legacy snapshot; fixture test. **Already fixed (checked in lot X9):** the new build keeps the bass and legacy families (DEV-SNAPSHOT-RESTORE; `snapshot-restore-parity.test.ts`); only the frozen legacy file drops them | P2 | S | MIGRATION_PLAN § 15.4 |
| FX-56 | ✅ Done — Legacy discrepancy: the critical-delivery report hard-codes 349 artefacts, the catalogue has 370 | Count from the catalogue (deviation recorded). **Fixed (already counted; recorded in lot X9):** DEV-REPORT-CATALOGUE-COUNT | P2 | S | MIGRATION_PLAN § 15.4 |
| FX-57 | ⏳ Open — Not ported: Golden-vs-AME comparison, AME reference capture, per-snapshot Excel export | Decide keep out (record in DEVIATIONS) or port | P3 | M | MIGRATION_PLAN § 15.2 |
| FX-58 | ✅ Done — Not ported: legacy `tools/xss-test.mjs` fuzz | Port as a property test over import/restore. **Fixed (lot X9, unreleased).** The app renders through React (no innerHTML in src/); the string-built HTML is the reports: `tests/store/report-xss-property.test.ts` (fast-check, hostile names → no element, handler or script URL; fails when escaping is removed). The legacy fuzz keeps running on the legacy file in the nightly battery (FX-62) | P3 | S | MIGRATION_PLAN § 15.2 |
| FX-59 | ⏳ Open — Still marked "being ported": collapsible sidebar groups, Fast Path filter, layout-board live preview, Gantt keyboard editing | Confirm state in `app/src`; finish or move to out of scope | P3 | M | MIGRATION_PLAN § 15.2, ARCHITECTURE § 12 |
| FX-60 | ⏳ Open — `TE-10b` legacy-mode monthly derivation reproduced only in the verification section | Decide keep as verification-only (record) or wire into the engine | P3 | S | MIGRATION_PLAN § 15.2 |
| FX-61 | ✅ Done — MIGRATION_PLAN § 15.5 is stale: it says the fixtures README reads v18.11 (it reads v18.13) and the versions read 20.0.0 (21.6.0) | Rewrite § 15.5 from the current tree; use doc-facts for versions. **Fixed (lot X9, unreleased).** Re-checked and rewritten; no hand-written version number left | P3 | S | MIGRATION_PLAN § 15.5 |
| FX-62 | ✅ Done — Legacy tools (`tools/test-all.mjs`) and the oracle generators are not run by CI | Add to the nightly job, or archive them with the legacy file (§ 15.3). **Fixed (lot X9, unreleased).** `tools/test-all.mjs` runs in the nightly `suite` job (mirrored in `gates.mjs`; its state test no longer writes to a fixed scratch path); the oracle generators stay out of CI on purpose (the fixtures are never regenerated) | P3 | S | MIGRATION_PLAN § 15.5 |
| FX-63 | ⏳ Open — Differential run on real customer files never done; 20.x/21.x portfolio files not exercised against 19.x readers beyond the notes | Needs files from the owner (FX-O4) | P2 | M | MIGRATION_PLAN § 15.3, ARCHITECTURE § 12 |
| FX-64 | ✅ Done — RELEASE_TAGS has no rows for v21.1.0 … v21.6.0 | Add rows and tag commands (merge SHAs). **Fixed (lot X9, unreleased).** Rows and commands for v21.1.0 … v21.6.0 (merges of #96 … #101) | P3 | S | docs/RELEASE_TAGS.md |

Added to § 3.5: **FX-O4** supply real customer files for FX-63; **FX-O5** decide FX-57 / FX-59 / FX-60 (port or out of scope).

### 3.7 Second recheck (31 Oct 2026): the nightly job is red

The scheduled `nightly` workflow has failed on every run since at least 27 Oct (runs 3–7; the PR gates stay green because they run
a smaller set). Its last run (41184666650, on v20.33.0) fails four gates for four separate reasons.

| ID | Issue | Fix | Priority | Size | Evidence |
|---|---|---|---|---|---|
| FX-70 | ✅ Done — `npm run check` x3 fails every time on 26 tests: every xmllint schema test (BPMN, DMN, CMMN, MSPDI, audit, org). `nightly.yml` does not install `libxml2-utils`; `app.yml` does | Add the same `xmllint --version \|\| apt-get install libxml2-utils` step to both nightly jobs. **Fixed in lot X0 (unreleased).** Both jobs (`suite`, `affected`), mirrored in `tools/gates.mjs` (workflow-sync green) | **P1** | S | nightly run 7, step "check-repeat --runs 3" |
| FX-71 | ✅ Done — Flaky: `tests/domain/portfolio/stress.test.ts > performance > 20 products x 1000 draws` failed in 2 of 3 runs | Measure the CI time; set the budget from it, or move the timing to `npm run perf`. **Fixed (lot X8, unreleased).** The budget is on the test process's CPU time (5 s; about 2.7 s idle), immune to a loaded runner's wall clock | P2 | S | same run, marked "flaky" |
| FX-72 | ✅ Done — Documented test count is stale: the suite has 19,523 tests, ARCHITECTURE says about 16,242 (20 % off, tolerance 2 %). `docs:check` does not catch it because the count is only refreshed with `--count-tests` | Run `npm run docs:facts -- --count-tests` in the release procedure (and `npm run release`). **Fixed in lot X0 (unreleased).** BUMP_PROCEDURE § 3 step 2 and the checklist; `npm run release` runs it first; the count refreshed | P2 | S | step "check-repeat --count-tests" |
| FX-73 | ✅ Done — Full-corpus parallel run: 107 of the 107 case files (`app/fixtures/cases/*.json`) differ from the legacy, unrecorded. `tools/parallel-run-known.json` recorded DEV-B9B-RESOURCES for the 40 workbooks only; the two DEV-SNAPSHOT-RESTORE entries (`curve-bass`, `curve-legacy`) now carry stale text (B9b moved their NPV and payback too) | Re-record the 107 cases under DEV-B9B-RESOURCES after triage (FX-74) and refresh the two DEV-SNAPSHOT-RESTORE texts. **Fixed in lot X0 (unreleased).** 105 case lines added, the two refreshed: 147 files, 0 identical, 147 known, 0 unexpected | **P1** | S | step "parallel-run --corpus full": 0 identical, 40 known, 107 unexpected |
| FX-74 | ✅ Done — Most case diffs follow the B9b pattern (NPV −€10k, payback −2 to −3 months), but five are much larger and must be explained before recording: `econ-roi-low` (−€2,417k → −€1,034k), `econ-roi-mid` (€514k → €853k), `econ-no-setup` (€1,762k → €1,686k), `setup-large` (€1,168k → €1,236k), `vb-gantt-alt` (€2,902k → €2,929k, the other way) | Trace each to a B9b rule (programme cost from resources, one timing) or open a defect; record the explanation in DEVIATIONS. **Fixed in lot X0 (unreleased).** No defect: on all 107 files the NPV move equals, to 1e-4 €, the sum over the programme lines of legacy less B9b discounted spend (`tests/domain/programme/parallel-run-b9b.test.ts`); the five are the typed training / governance amounts replaced by resources (`vb-gantt-alt`: a 6-month setup makes them cheaper), pinned line by line and written in DEVIATIONS DEV-B9B-RESOURCES. Note: `econ-no-setup` no longer means "no programme cost" (€79k of default resources) | **P1** | M | same step |
| FX-75 | ✅ Done — `validate:affected` stops on a stale mutation (`src/domain/economics/cashflow.ts`: the text it mutates no longer exists since the payback rewrite) | Update the mutation in `scripts/lib/mutations.ts` to the current payback loop. **Fixed in lot X0 (unreleased).** Two were stale: the payback loop (`>= 0` → `> 0`, kills `cashflow.test.ts`) and `tune/program.ts` (the pilot cost moved to the programme in B9b: now the pilot's month spreading, kills `costModel.test.ts`). The script checks every mutation before the first run; `tests/mutations.test.ts` fails a stale one in the PR gate | P2 | S | job "affected", exit 2 |
| FX-76 | ✅ Done — `validate:affected` shows the test selection misses 17–22 failing test files per mutation at the "precise" level (and up to 22 at "zone"): the affected-test selector is not safe to rely on | Fix the dependency map used by the selector (or drop the "precise" level); the job must report 0 missed. Cause confirmed in X8: the `affected` job had no xmllint (the 27 XSD test files failed under every mutation and counted as missed); with xmllint, a sampled mutation (`tune/readiness`) misses only `tests/mutations.test.ts`, which reads source text and failed while the mutation was applied — it now accepts the mutated text. **Fixed (lot X8, unreleased)**; the nightly confirms the full run | P2 | M | job "affected", every mutation |
| FX-77 | ✅ Done — Dependencies behind by a major version: eslint 10, @eslint/js 10, eslint-plugin-react-hooks 7, immer 11, fast-check 4, jsdom 29, jscpd 5, @types/react 19 (React stays 18); `axe-core` is locked at 4.10 while 4.14 is in range | One upgrade lot, each major in its own commit with the full gate; refresh the lockfile for in-range updates. **Fixed (unreleased).** In-range refresh (axe-core 4.14, Playwright kept at 1.56 for the installed browser); jscpd 5 (dup baseline re-measured, 88 / 720); fast-check 4; immer 11 (`currentOf`); eslint 10 + @eslint/js 10 + react-hooks 7 (the React Compiler rules left off: the app does not use it); jsdom 30; @types/react 19. axe 4.14's word-by-word name check fixed on the Section Dependencies nodes | P3 | M | `npm outdated` |

Checked and clean in this round: no `@ts-ignore` / `@ts-nocheck`, no `as any`, no `.skip` / `.only` / `.todo` tests, no stray
`console.log`; the 8 `eslint-disable` lines all carry a reason; the CODE_REVIEW modelling question 6 is resolved (v18.11); the SPEC_BPMN
B5 question on factory tags is answered in § 15; `npm audit` 0; no open GitHub issue or PR.

## 4. Lots (one PR each, in this order)

| Lot | Content | Gate | Figures | Size | Status |
|---|---|---|---|---|---|
| X0 Nightly green (first) | FX-70, FX-72, FX-73, FX-74, FX-75 | Nightly run green on main | None (records only) | 1 d | ✅ Done |
| X1 Decisions | Record the owner's answers to FX-D1…FX-D15 in this file and SPEC_BPMN — **done 2026-11-01** (§ 2.1) | — | None | 0.5 d | ✅ Done |
| X2 Consistency (P1) | FX-01, FX-03, FX-04, FX-06, FX-07, FX-08, FX-40, FX-D1 (a), FX-D3 (a, deviation) | 107 fixtures identical except the deviations approved; cross-surface tests | Opt-in / Deviation if FX-D3 a | 2 d | ✅ Done |
| X3 Catalogue retirement | FX-02 (D-B9) | Default process byte-identical; all reference lists unchanged | None | 1.5 d | ✅ Done |
| X4 Screens for built domain | FX-10, FX-11, FX-12…FX-14, FX-15, FX-16, FX-17, FX-20, FX-26 | axe clean; render budgets; ui-parity 0 | None | 3 d | 🟡 Partly done — open: FX-10, FX-11, FX-12, FX-13, FX-14, FX-16, FX-17, FX-26 |
| X5 Import / export / workbooks | FX-24, FX-25, FX-27…FX-34 | Round trips; workbook legacy sheets unchanged | None | 2 d | 🟡 Partly done — open: FX-32 |
| X6 Organisation depth | FX-05, FX-21, FX-22, FX-23, FX-D4 (a), FX-D6 (a), FX-D7 (a), FX-D11 (a) | Undo property tests; parity | Opt-in | 2.5 d | 🟡 Partly done — open: FX-23, FX-D11, FX-D4, FX-D6, FX-D7 |
| X7 Portfolio document | FX-D14 (a), FX-D2 (a: implied correlation view only), FX-D8 (a), FX-D9 (a), FX-D10 (a), FX-D12 (a), FX-D13 (a, deviation), FX-D15 (a) | Schema v6 migration round trips | Per decision | 3 d | ⏳ Open |
| X8 Polish | FX-18, FX-19, FX-41…FX-45, FX-71, FX-76, FX-77 | — | None | 1 d | ✅ Done (FX-44 tracked upstream) |
| X9 Carry-over | FX-50…FX-56, FX-58, FX-61, FX-62, FX-64; FX-57 / FX-59 / FX-60 per FX-O5; FX-63 when files arrive | Deviations recorded for FX-52, FX-53, FX-56 | Deviation (labels, export, report count) | 3 d | 🟡 Partly done — open: FX-57, FX-59, FX-60 (owner's call, FX-O5), FX-63 (customer files, FX-O4) |

Total about 20.5 days of agent work; X0 first (the nightly is the only gate on the full corpus), then X2 because it carries the only P1 items that can move a figure.

## 5. Acceptance

Each lot: all gates of the release procedure (lint, types, ≤ 150 lines, dup ≤ baseline, deps / docs / theme / process checks, full test
suite, ui-parity 0 unrecorded, e2e + perf budget, parallel-run and excel-compat with only recorded deviations, a11y on golden and
pf-three-products, `npm audit` 0), the HTML shared, this file updated (the issue marked **fixed in vX.Y.Z** with its PR), SPEC_BPMN § 20
kept in step.
