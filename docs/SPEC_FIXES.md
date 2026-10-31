# AgentCase — Specification: the issues to fix after v21.6.0

> Status: **draft for the owner's review (2026-10-31)**. Base: `main` at v21.6.0 (BPMN migration B0–B9e, B10a–B10d merged).
> Related: [SPEC_BPMN.md](SPEC_BPMN.md) § 20 (open items after the migration) and § 21.5–21.8 (B10 notes), [DEVIATIONS.md](DEVIATIONS.md),
> [ARCHITECTURE.md](ARCHITECTURE.md), [GUIDE_BPMN.md](GUIDE_BPMN.md).
> Rules unchanged: files ≤ 150 lines, no `any`, layers `ui → controllers → store → domain`, every document change an undoable command,
> view state never undoable, one owner per figure in `src/domain`, single-product figures identical to the legacy file unless recorded in
> DEVIATIONS.md and `app/tests/helpers/deviations*.ts`, one PR per lot merged on green CI with the HTML shared.

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
| FX-D1 | Changing a product's owning unit marks the Monte Carlo run stale although no figure moves | (a) take the organisation (units, owners) out of the run fingerprint; (b) keep it | None | § 21.8 |
| FX-D2 | One correlation ρ for the whole portfolio | (a) keep one ρ, show the unit's implied correlation; (b) a ρ per unit (inside a unit) plus a ρ between units | (b) Opt-in | § 21.8 |
| FX-D3 | Service activities assigned by type or role split the service cost but are not routed to the service line inside each product's engine | (a) route them (the service row carries them in every product); (b) keep pins only | (a) Deviation | § 21.7 |
| FX-D4 | Per-product RACI without copying the process | (a) an `ac:raciOverride` element per product in the organisation part; (b) keep the RACI in the process part | None | § 21.5 |
| FX-D5 | The tool catalogue (129 tools) is verified 2026-10-31; 43 entries partial or unverified | Sign off as is / sign off after a manual pass on Enterprise Architect, ServiceNow and the partial entries / add Google Antigravity and TeamCity | None | SPEC_BPMN item 8 |
| FX-D6 | The audit is per process document: products sharing the common process share one audit | (a) a per-product audit part like the organisation part; (b) keep | None | item 10 |
| FX-D7 | No figure reads the RACI (§ 16.5 figures not built) | (a) build the RACI-driven load and cost by unit, opt-in; (b) keep RACI informative | Opt-in | item 15 |
| FX-D8 | Hand-off cost, cadence, waits, change-failure rate, token profile are views, not engine figures | (a) feed the engine, opt-in per factor; (b) keep views | Opt-in | item 21 |
| FX-D9 | The default process does not link the SDLC chain with data inputs | (a) link it (traceability complete by default); (b) keep | None (document only) | item 22 |
| FX-D10 | CMMN read-back drops content it does not map | (a) keep it in an extension element (pass-through); (b) keep dropping | None | item 27 |
| FX-D11 | Programme lanes (operating-model roles) are not linked to the organisation's roles | (a) map each operating-model role to an organisation role with a team skill; (b) keep separate | None | item 30 |
| FX-D12 | The delivery diagram has no agents' lane | (a) add an agents' lane to the default DI (exports change, figures do not); (b) keep | None | item 31 |
| FX-D13 | `setupTraining` / `setupGov` are stored but no figure reads them | (a) retire them, with deviations for the DD register (119 → 117 rows), report and legacy sheet; (b) keep as legacy inputs | Deviation (legacy outputs) | item 33 |
| FX-D14 | Waves, setup capacity and knowledge subsets live outside the BPMN document | (a) a portfolio-level BPMN document (waves as sub-processes, capacity on lanes); (b) keep as portfolio data | None | item 34 |
| FX-D15 | Plan sheets and pages exist only in the Plan screen's exports | (a) add them to the Financial workbook and the report as optional sections; (b) keep | None | item 37 |

## 3. Issues (work)

### 3.1 Data model and calculation (P1)

| ID | Issue | Proposed fix | Figure impact | Size | Source |
|---|---|---|---|---|---|
| FX-01 | A case-level opt-in activity switched on in the common values is counted by every product | Count a case-level programme activity once per portfolio (owned by the common case), per product only when the product turns it on; one owner in `programme/profile.ts` | Opt-in cases only | M | items 32, § 19.10 |
| FX-02 | D-B9: the JSON catalogues still generate the default process | Build step that ships `defaultProcess.bpmn`'s node tree (DOM-free reader); move the reference-list readers (reset, pins, factory pickers, legacy sheets, per-phase tables) to the default-process views; retire the JSON | None | L | item 1 |
| FX-03 | Pins of a custom activity are refused | `normalisedPins` validates against the case's process activities, not the catalogue ids | None | S | item 2 |
| FX-04 | Per-phase tables do not list a custom phase | `phaseArtRows` and agent usage read the process phases | None | S | item 3 |
| FX-05 | `withLibrary` is not applied to a portfolio product's effective case | Apply the common library entries to each product's process part (B10a split makes it possible) | Opt-in (library users) | M | item 23 |
| FX-06 | A new role's resource is inserted mid-list (large undo patch) | Insert at the end of the resource block allowed by the XSD order, or index roles separately | None | S | item 4 |
| FX-07 | The default delivery unit is derived until first used | Write it at migration only when the case has units or owners (exports of untouched cases stay identical) | None | S | § 21.5 |
| FX-08 | Products a unit owns directly are not shown as their own row in its sub-unit ranking | Add a "directly owned" row to `unitRanking` | None | S | § 21.8 |

### 3.2 Screens (P2)

| ID | Issue | Proposed fix | Size | Source |
|---|---|---|---|---|
| FX-10 | The extended profile (B5b) has no screens | Panels in 🧩 Process: data stores and tools, states, volumes, timers, boundary events, library, conversations, colours; export dialog options (colours, organisation view, several diagrams) | L | item 20 |
| FX-11 | No screen edits or binds DMN decisions | A decisions panel: list, bind to a rule task (`process.bindDecision`), a read-only table view with hit policy; DMN DI optional (FX-26) | M | item 26 |
| FX-12 | Diagram editor: no properties panel | A properties panel in the editor writing the same commands as the parameter panel | M | item 5 |
| FX-13 | Diagram editor: its own undo history is lost on Save | Keep the editor open after save (re-import with the command stack preserved) or warn before | S | item 6 |
| FX-14 | Diagram editor shows the first diagram only | Diagram picker when the document holds several | S | item 7 |
| FX-15 | The Process diagram is not coloured by audit status | Colour shapes by audit progress (B5b `colourBy`) with a legend | S | item 11 |
| FX-16 | The resource histogram stacks by role only | Grouping by team, unit (B10) or location | S | item 35 |
| FX-17 | Unit picker indentation stops at level 6 | Indent through a CSS custom property per level (no inline style budget issue) | S | § 21.5 |
| FX-18 | The wave link from the map opens 📅 Plan without focusing anything | Open the Waves screen on the wave, or the Plan Gantt on its band | S | v21.1.0 notes |
| FX-19 | Link texts use the menu label "📅 Gantt / Timeline" while the screen reads "📅 Plan" | Use the section title in links (or rename the menu with a recorded deviation, DEV-B9D-PLAN-SCREEN) | S | v21.1.0 notes |
| FX-20 | Plan Gantt / WBS / OBS rows link only to Process | Add "Open in Programme" on programme rows | S | v21.1.0 notes |
| FX-21 | No audit on programme activities | Allow observations on programme tasks (same `ac:audit`), calibration not applicable | M | item 14 |
| FX-22 | A role's split between teams follows FTE × share only | Per-activity share on a role's team assignment | M | item 16 |
| FX-23 | Organisation lane view: no geometry, not in the export dialog, not imported | Layout the lanes, add the export option, map organisation lanes on import (F-B8 dialog) | M | item 17 |

### 3.3 Import, export and workbooks (P2)

| ID | Issue | Proposed fix | Size | Source |
|---|---|---|---|---|
| FX-24 | The import report does not show kept / dropped foreign content; content in an unmapped lane or crossing phases is dropped | Report kept / dropped counts per kind; keep crossing content in a pass-through container | M | item 24 |
| FX-25 | A Merge import does not merge audit data | Merge observations by activity id with a conflict rule (newer date wins, both kept in history) | M | item 13 |
| FX-26 | DMN decisions are not drawn | Write DMN DI and show decisions as data on the diagram | M | item 29 |
| FX-27 | Exported rule families do not apply until bound to a rule task | Bind them to the default rule tasks on export, or say so in the export dialog | S | item 28 |
| FX-28 | The tool catalogue is not a sheet of the audit workbook | Add a Catalogue sheet (case entries editable, shipped read-only) | S | item 9 |
| FX-29 | The audit header and role-level audits are not in the audit workbook | Add Header and Roles sheets, round trip | S | item 12 |
| FX-30 | The parameters workbook carries no units or owners | Units and Owners sheets, round trip, refused import names the unit | M | § 21.7 |
| FX-31 | No per-service or per-unit sheet in the results workbook beyond the Unit scope's leading sheet | A Services sheet; per-unit sheets for the shown unit's children | S | § 21.7, § 21.8 |
| FX-32 | MS Project XML not opened in MS Project / ProjectLibre | Open the export in ProjectLibre in CI (headless import) or a manual check recorded with screenshots | S | item 36 |
| FX-33 | Tool proposals by data type (F-B43) and the interface audit feeds (F-B55) are not wired | Propose tools by data type; feed message-flow interfaces into the operational audit | M | item 25 |
| FX-34 | The shipped portfolio example is still schema v3 | Regenerate it at schema v5 (the oracle fixtures are never regenerated) | S | § 21.5 |

### 3.4 Performance, tests and tooling (P3, P1 where marked)

| ID | Issue | Proposed fix | Prio | Size | Source |
|---|---|---|---|---|---|
| FX-40 | The full test suite times out on a loaded machine (dozens of 5 s timeouts per agent run; CI green) | Set `testTimeout` per heavy file (fixtures, portfolio, ui) or shard the suite; move fixture sweeps to `beforeAll` like `theme-palette` | P1 | M | agent reports |
| FX-41 | Process filters and the two diagram frames re-render on a process edit | Memoise `FilterSelect` options and the frames on their inputs | P3 | S | selective-refresh notes |
| FX-42 | Process views are cached on the whole document's identity | Memoise per phase / per activity node so one edit recomputes one branch | P3 | M | selective-refresh notes |
| FX-43 | A DD sensitivity saved by a schema-3 file, and Monte Carlo runs saved before B10a's team order, show as stale once | Accept (documented) or migrate the stored fingerprints | P3 | S | § 19.13, § 21.5 |
| FX-44 | `npm audit` depends on an override (`minimatch` ^11.0.3) for exceljs / archiver | Track upstream; drop the override when exceljs ships a fixed archiver | P3 | S | v20.31.0 |
| FX-45 | Shared scratchpad logs between parallel agent runs overwrite each other | Per-worktree log folder in the agent brief | P3 | S | agent reports |

### 3.5 Owner actions (no code)

| ID | Action | Where |
|---|---|---|
| FX-O1 | Create and push the release tags v19.0.0 … v21.6.0 (commands listed; v21.1.0 → v21.6.0 rows to add) | docs/RELEASE_TAGS.md |
| FX-O2 | Sign off the tool catalogue (FX-D5) | 🔎 Audit, SPEC_BPMN § 15.7 |
| FX-O3 | Delete the 9 old local branches from the 22–24 Oct theme work (kept until you say yes) | local clone |

## 4. Lots (one PR each, in this order)

| Lot | Content | Gate | Figures | Size |
|---|---|---|---|---|
| X1 Decisions | Record the owner's answers to FX-D1…FX-D15 in this file and SPEC_BPMN | — | None | 0.5 d |
| X2 Consistency (P1) | FX-01, FX-03, FX-04, FX-06, FX-07, FX-08, FX-40, FX-D1 (if a), FX-D3 (if a) | 107 fixtures identical except the deviations approved; cross-surface tests | Opt-in / Deviation if FX-D3 a | 2 d |
| X3 Catalogue retirement | FX-02 (D-B9) | Default process byte-identical; all reference lists unchanged | None | 1.5 d |
| X4 Screens for built domain | FX-10, FX-11, FX-12…FX-14, FX-15, FX-16, FX-17, FX-20, FX-26 | axe clean; render budgets; ui-parity 0 | None | 3 d |
| X5 Import / export / workbooks | FX-24, FX-25, FX-27…FX-34 | Round trips; workbook legacy sheets unchanged | None | 2 d |
| X6 Organisation depth | FX-05, FX-21, FX-22, FX-23, FX-D4 / FX-D6 / FX-D7 / FX-D11 as decided | Undo property tests; parity | Opt-in | 2.5 d |
| X7 Portfolio document | FX-D14 (if a), FX-D2 (if b), FX-D8 / FX-D9 / FX-D10 / FX-D12 / FX-D13 / FX-D15 as decided | Schema v6 migration round trips | Per decision | 3 d |
| X8 Polish | FX-18, FX-19, FX-41…FX-45 | — | None | 1 d |

Total about 15.5 days of agent work; X2 first because it carries the only P1 items that can move a figure.

## 5. Acceptance

Each lot: all gates of the release procedure (lint, types, ≤ 150 lines, dup ≤ baseline, deps / docs / theme / process checks, full test
suite, ui-parity 0 unrecorded, e2e + perf budget, parallel-run and excel-compat with only recorded deviations, a11y on golden and
pf-three-products, `npm audit` 0), the HTML shared, this file updated (the issue marked **fixed in vX.Y.Z** with its PR), SPEC_BPMN § 20
kept in step.
