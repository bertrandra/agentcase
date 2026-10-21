# Changelog

All notable changes to AgentCase, newest first. Product version = the `vX.Y` in the app file name
(`AgentCase_vX_Y_EN.html`) and in `window.AgentCaseArch.VERSION`.

- **v18.2 → v18.8** were reconstructed on 2026-10-21 from the `v18.x` tags in the code comments, help
  text and section markup of `AgentCase_v18_8_EN.html`; no release notes existed for them. No release
  dates are recorded in the code. `(L1234)` references point into `AgentCase_v18_8_EN.html`.
  *(inferred)* marks an attribution that is a reasonable inference rather than an explicit statement.
- **v12.57 → v18.1** are converted from the original release notes,
  [`docs/release-notes/AgentCase_ReleaseNotes_v12_57-18_1.html`](docs/release-notes/AgentCase_ReleaseNotes_v12_57-18_1.html)
  (dates are build dates). Golden-case figures quoted there predate the v18.5 Time Engine and the
  v18.6 spline default, which deliberately moved them (see docs/ARCHITECTURE.md §11).

When releasing, follow [docs/BUMP_PROCEDURE.md](docs/BUMP_PROCEDURE.md) and add the new version at the top.

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
