# AgentCase — Code review of v18.8 and its resolution in v18.9

> **Status:** every finding below was addressed in **v18.9** (`AgentCase_v18_9_EN.html`) — see
> [§7 Resolution in v18.9](#7-resolution-in-v189), including four findings that surfaced during the fixes.
> Sections 1–6 are kept as the original v18.8 review, with its line numbers; they do **not** match v18.9.
>
> Reviewed file: `AgentCase_v18_8_EN.html` (review date 2026-10-21).
> Scope: the whole application script (L6456–25400), the boot-restore and session-persistence
> scripts (L25401–25446), the HTML markup and CSS. Vendor bundles (Chart.js, ExcelJS) and the
> embedded fonts were not reviewed.
> Locations are `L<line>` in that file. Findings were checked against the code; the ones marked
> **[reproduced]** were also reproduced in Node or headless Chromium.
> Architecture context: [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Summary

| Severity | Count | Themes |
|---|---|---|
| High | 8 | stored XSS through imported/edited strings, golden-case corruption, unsaved S-curve, NaN cascade, autosave data loss |
| Medium | 17 | wrong figures in edge cases, self-checks that cannot fail, performance, persistence robustness |
| Low | 27 | dead code, edge-case formatting, stale text, accessibility |

**Clean checks:**

- No duplicate top-level functions or variables. The repeated names a scan finds are nested,
  closure-local helpers.
- All 384 function names called from inline handlers are defined.
- No duplicate `id` attributes in the static markup.
- ESLint `no-undef` finds a single real undefined identifier (see M-11).
- **Snapshot embedding is safe:** `<` is escaped as `<`, so a customer name containing
  `</script>` or `<!--` survives save and reopen without executing **[reproduced]**.
- Exactly one snapshot script remains after a save.
- Product version stamps are consistent (title, footer, `AgentCaseArch.VERSION = '18.8.0'`), except
  for one report (L-19).

### Recommended fix order

1. **Security:** introduce one escaping helper and apply it everywhere (H-1), and validate imported
   ids and names.
2. **Data integrity:** deep-copy in `applySnapshotState` (H-2), persist the S-curve (H-3), guard the
   spline (H-4), fix autosave Restore and triggers (H-5, H-6, H-7).
3. **Correctness:** regulatory double count in P2 (H-8), discount-rate and ROI/payback consistency
   (M-1 … M-4).
4. **Robustness and performance:** M-5 … M-17.
5. **Clean-up:** dead code and the Low items.

## 2. High

### H-1 · Stored XSS: user-editable and imported strings reach `innerHTML` and inline handlers unescaped

- **Sinks (non-exhaustive):**
  - Navigation and persona management: group, section and persona labels and ids, including inside
    `onclick="…('${id}')"` (`renderPersonaNav` L10499–10502, `pmRenderGroupTable` L10768, persona
    table L10709/L10716, membership preview L9583).
  - Wizard step labels (L9304, L9326).
  - Team-skill names and Skill Map values (L8950, L9003, L9052, L14468).
  - Dynamic-section titles, row labels and values (L18488, L18502, L20954, L21050, L21053).
  - Command palette labels (L22826, which re-injects already-decoded `textContent`).
  - Excel import status notes (L17510, L17714, L17737, written at L17956).
  - Session manager autosave label, which defaults to the customer name (L13552) **[reproduced]**.
  - Snapshot names (L14007).
- **Sources:**
  - In-app rename fields.
  - **Excel import, which does no validation:** Groups, Personas, Persona Sequence, Skill Map,
    Input Team, Dynamic Sections and Customer sheets.
  - Snapshot restore.
  - The IndexedDB autosave store, which every AgentCase file on the same origin reads.
- **Failure scenario:** a shared "client config" workbook carries
  `<img src=x onerror=…>` in a group label or location cell. The script runs on import in the app's
  origin and can read or alter the case and every autosave. Because the app re-saves itself as HTML,
  the payload is then embedded in every file shared afterwards.
- **Fix:**
  - Add one global `escHtml()` that escapes `& < > " '`, and one `escJsAttr()`.
  - Replace the five divergent local `esc` helpers (L9306, L9533, L10168, `pmlEsc` L11080,
    `dmEsc` L18610) with these.
  - Prefer `data-*` attributes and delegated listeners over `onclick="f('${x}')"`.
  - Validate imported ids against `/^[a-z0-9-]+$/` and skills, grades and locations against known
    lists.
  - The newer layout boards (`renderPmLayout`, `renderPmAssign`) already follow the right pattern.

### H-2 · Restoring a snapshot aliases globals to the snapshot's own objects; later edits rewrite the golden case

- **Location:** registry setters such as `RATE = v` (L12872), `QUALITY = v` (L12914),
  `DD_STATE = v` (L12831) and `PERSONAS = v` (L12890). The same pattern applies to `TOKEN_MODELS`,
  `GROUPS`, `SKILL_MAP`, `MC_PARAMS`, `STRATEGY_DEFS`, `DYNAMIC_SECTIONS`, the Factory arrays and
  `MODEL`. Getters also return live references.
  Callers: `snapActivate` (L13709), `snapResetToGolden` (L13769), `snapBaselineConfirm` (L13740).
- **Failure scenario:**
  1. Click "Reset to golden case".
  2. Edit a rate-card cell. `updateRate` mutates `RATE` in place, which mutates the protected golden
     snapshot **[reproduced]**.
  3. The next HTML save writes the corrupted golden case to disk.
- **Fix:** `s = structuredClone(s)` at the top of `applySnapshotState`, and clone in getters. The
  workaround already applied to `MODEL` (comment at L13809) shows the issue was known locally.

### H-3 · S-curve control points and curve family are never persisted

- **Location:** `SC_PTS` and `SC_FAMILY` (L15608), `TIME_ACTIVE_CURVE` (changed by `scSetFamily`,
  L15680). None of them is in `STATE_REGISTRY` or in the Excel export.
- **Failure scenario:** after dragging points or choosing Gompertz, a save, autosave or snapshot
  reopens on the default spline anchors. Payback, NPV and savings change. Because `inputHash`
  includes the spline points, the "figures no longer match" banner appears on every reopen. Points
  beyond M36 are lost for longer horizons.
- **Fix:** add a `scurve` registry entry `{pts, family, curve}` and an Excel sheet.

### H-4 · Shrinking the horizon creates duplicate spline knots; NaN spreads through every figure

- **Location:** `scEnsurePts` (L15628), `scSplineEval` (L15658), engine adapter (L21904).
- **Failure scenario:** with horizon 3 y, drag the first point to M6, switch to 1 or 2 y and open the
  S-curve tab. The points become `[6,12,12]`, `scSplineEval(9)` returns NaN **[reproduced]**, and
  monthly savings, payback, NPV and all headlines become NaN. The editor hides the problem because it
  clamps non-finite values to 0.
- **Fix:** reinitialise whenever any `t[i] <= t[i-1]`, skip `h <= 0` segments, and make the adapter
  return a finite fallback.

### H-5 · Autosave "Restore" restores the current state, not the session it offered

- **Location:** `AUTOSAVE.init` stores `bootRecord` but never uses it (L13462–13464). `restore()`
  re-reads the same key (L13362–13371), which the 2 s autosave has already overwritten.
- **Failure scenario [reproduced]:**
  1. Autosave session "SessionA", then reload.
  2. The banner offers a restore. The user types "EditB" and waits 3 s.
  3. Restore yields "EditB"; "SessionA" is lost.
- **Also:** the banner says "newer" but never compares timestamps.
- **Fix:** restore `bootRecord.state`, or suspend autosave while the banner is shown, and compare
  `savedAt` before offering.

### H-6 · Ordinary parameter edits never trigger autosave

- **Location:** autosave listens only to `state:changed` (L25408–25415). Sliders and number fields go
  through `readInputs()` / `refreshAll()`, which never emit it.
- **Failure scenario [reproduced]:** changing `autoCapPct`, `y1Ramp` or `setupTooling` writes no
  record. These edits are only saved when the tab is hidden, so a crash loses them, contrary to the
  "saves ~2 s after you make a change" promise.
- **Fix:** emit a debounced `state:changed` `{path:'dom'}` from `refreshAll()` when DOM values
  change, or add a delegated `input`/`change` listener.

### H-7 · Section-preview iframes boot a second copy of the app that shares this tab's autosave slot

- **Location:** `pmEnsurePreviewIframe` (L11057–11059) and `pmlEnsurePreview` (L11106) write
  `document.documentElement.outerHTML` into a same-origin iframe.
- **Failure scenario:**
  1. Open a section preview (Persona management or Menu layout).
  2. The iframe runs the whole app, including `AUTOSAVE.init`, with the parent's `sessionStorage`
     tab id.
  3. On every tab switch both documents save to the same IndexedDB key, and the iframe's state
     (file-open state without live edits) can win.
  4. Each preview also costs a full app boot.
- **Fix:** render previews without executing scripts (clone the section's DOM, or use a sandboxed
  `srcdoc` with scripts stripped). At minimum, skip autosave when `window.top !== window`.

### H-8 · The P2 verification-tax population counts regulatory artefacts twice

- **Location:** `evtScopeArtefacts()` (L11654–11660). `activeArtefacts()` already includes
  `regActive()`, and the function appends the regulatory artefacts again.
- **Failure scenario:** with P2 enabled and any norm selected, the regulated share is inflated (for
  example 30 % instead of 18 %). The verification-tax rate and ρmax rise, so `model()` savings and
  ROI are understated, and the P2 table shows doubled counts.
- **Fix:** return `activeArtefacts().slice()` and add the invariant
  `Σw(evtScopeArtefacts) == phaseScope().selW`.

## 3. Medium

| ID | Location | Defect | Fix |
|---|---|---|---|
| M-1 | L12212, L12495 | P4 Monte Carlo NPV discounts at the P5 flow rate instead of `MODEL.CASE.discountRate`, and `x \|\| 0.08` turns an explicit 0 % into 8 % | use the case rate; test `isFinite(x)` instead of truthiness |
| M-2 | L7042, L7280, L15827, L18226 | ROI divides by setup cost. With setup = 0 the Financial tab, Excel export and ROI view show `Infinity%`/`NaN%` and a GO verdict | one `roiCanonical()` with an explicit setup ≤ 0 policy |
| M-3 | L8240, L6915, L9753, L10098 | payback is defined four ways. Scenario month 0 is falsy and renders ">36 mo" **[reproduced]**; the 36-month cut-off ignores 5–10 y horizons | route all views through `paybackMonthsCanonical()`; compare with `horizon × 12` |
| M-4 | L9970–9972 | `applyStrategy` multiplies the current setup/infra by the strategy factor, so repeated clicks compound (0.6 → 0.36) and the comparison no longer matches the live case | apply factors to stored strategy-neutral base values |
| M-5 | L13069, L13822, L14033 | every restore forces the flagged default persona. The GCT compare does 3 restores on each Snapshot-manager render, which switches the user to Builder and scrolls to the top | `applySnapshotState(s, {silent, keepPersona})`; compute the GCT compare on demand |
| M-6 | L14033 → L13822 | three full state restores and recomputes on every Snapshot-manager redraw | cache the comparison by `(golden.id, ameRef.id, inputHash)` |
| M-7 | L9215–9231, L13040 | `mcFingerprint` builds a full snapshot, including a full `materialise()`, on every refresh once a Monte Carlo run exists. Reading the verdict Board variables silently runs an 800-draw Monte Carlo | hash only model inputs; skip the calculation package; cache per refresh |
| M-8 | L9108–9124, L9732–9764 | `runMonteCarlo` and `evaluateStrategies` mutate `INPUTS.v` and `targetLocPct` without `try/finally`; `mcAutoHook` swallows errors | restore in `finally` (as `mcsEvaluate` does) and log errors |
| M-9 | L10101 | `renderResults` overwrites the user's TO-BE year as a side effect | pass the year as a parameter |
| M-10 | L11478–11487 | when any P1 loop is clamped, calibration rebuilds the loops on every call and discards user `t_rev` edits | separate "built" from "fully calibrated" |
| M-11 | L13335 | `AUTOSAVE.save` posts `record.tabId` with `record` out of scope; the `ReferenceError` is swallowed, so other tabs never refresh | hoist `record` or post `tabId` |
| M-12 | L13340–13344 | no `tx.onabort`: a quota abort leaves `save()` pending forever while the status still says "Autosaved" | handle `onabort`, check `tx.error` |
| M-13 | L25328–25329 | industry `<select>` options are appended without clearing; HTML save bakes them, so each save/reopen adds a set (72 → 84 options) **[reproduced]** | clear before populating |
| M-14 | L13611 | `saveHtmlSnapshot` clones `class="boot-ready"` onto `<html>`, which re-introduces the boot flicker fixed in v18.8; banners and status text are baked too | remove `boot-ready`, `#autosaveBanner` and `#calcStaleBanner` from the clone |
| M-15 | L18233 | Verification "directional sensitivity" changes DOM values while the model reads `INPUTS`, so the check always reports "✓ Consistent" | perturb `INPUTS.v` and use strict inequalities |
| M-16 | L16272 | due-diligence sensitivity freshness compares JSON string *lengths*, so 75 → 80 counts as unchanged | hash the content |
| M-17 | L14225 | `model()` swallows every Time Engine overlay error, so Annual/Excel figures can silently diverge from Financial/Monthly | log the error, flag it, show it in Verification |

## 4. Low

| ID | Location | Issue |
|---|---|---|
| L-1 | L7081–7177, L8009–8168, L7454, L7688, L8230 | ≈400 lines of dead code (Sales build wizard, Sales discovery, Presales lab — whose tornado could never work —, Specialist editor, unused regulatory helpers, unreachable branch) |
| L-2 | L8936 | `setSkillMap` has an empty refresh stub, so other consumers stay stale |
| L-3 | L8572, L8577 | lifecycle slider runs a full `refreshAll()` on every `input` event |
| L-4 | L7181, L10563, L10570, L6516 | unguarded DOM lookups; "+Infinity%" rate gap with an empty team |
| L-5 | L10463, L14376 | Board `EUR_K` formatting uses the browser locale and "K"; other views use `en-US` and "k" |
| L-6 | L7329, L13630 | object URL revoked synchronously after `a.click()`, which can cancel a download |
| L-7 | L11880–11893 | P3 read-out hard-coded to Y1–Y3 for longer horizons |
| L-8 | L10544–10551 | persona landing ignores the Fast-Track filter and can land on a hidden section |
| L-9 | L10668 | group rename from the table does not call `syncState`, so no autosave or audit |
| L-10 | L15872, L15885 | KPI signs hard-coded (`--12%`); division by a zero AS-IS quality value |
| L-11 | L14272, L14278, L14488 | NaN on an empty team or all-zero ramps (raw path) |
| L-12 | L15754 | roadmap month labels one month early west of UTC (`new Date('2026-09-01')` is UTC) **[reproduced]**; `setMonth` overflow on the 31st |
| L-13 | L6461, L17507, L17529 | `rateFor` treats a rate of 0 as missing (€400 fallback); an imported `__proto__` header writes onto `Object.prototype` |
| L-14 | L16498 | DD pack import is quadratic and stringifies Date/rich-text cells badly |
| L-15 | L16313, L16331 | sensitivity labels misrepresent what is perturbed; HRI floor/slope get identical weights |
| L-16 | L14977 | Monthly Playback calls the full `model()` on every timer tick (up to 20 Hz) |
| L-17 | L14844, L14903, L14952 | stale Monthly explanation (step ramp); Monthly Playback labels in French in the EN build |
| L-18 | L16085, L22765–22781, L22831 | dead code: `ddNote`, unreachable Home summary, boot listener on discarded nav buttons |
| L-19 | L25114, L25121, L25129 | regulated-delivery report hard-codes "AgentCase v18.8" and still says "Generated by AgentCase v13.2"; use `appVerTag()` |
| L-20 | L13235–13245 | a duplicated browser tab copies `sessionStorage` and shares the autosave slot |
| L-21 | L13603, L25401, L13201–13204 | migrations bypassed: HTML snapshots use `collectSnapshotState`/`applySnapshotState` directly, and `PM.hydrate` runs every migration regardless of `from` |
| L-22 | L25401 | the shipped boot snapshot predates v18.5 (no `calculationPackage`, `COEF`, `GROUPS`, `PERSONA_SECTIONS` …) |
| L-23 | L13332–13336, L13582 | autosave status line wiped immediately by the panel re-render |
| L-24 | L13289–13305, L13433–13436 | IndexedDB cursors without `onerror`, so `list()` can hang |
| L-25 | L13262–13286 | `dbPromise` caches a failed open for the page lifetime |
| L-26 | L19880, L20452, L23087, L23743, L23825, L23838, L24084, L25032 | unused locals hinting at unfinished logic (e.g. "cached $/dev-day" tile shows a fixed ~$30) |
| L-27 | L21190–21199, L2, markup | AUDIT ring buffer stores full before/after copies (≈277 KB for one `namedSnapshots` change); `lang="fr"` on the EN build; 510 of 634 form controls without a programmatic label; 13 clickable `div`/`span`/`td` without role or tabindex |

## 5. Architecture and maintainability observations

1. **Global namespace and string-built DOM.** ≈1,140 global functions. Inline `onclick="f('"+x+"')"`
   needs both JS-string and HTML-attribute escaping, which is the root cause of H-1. Recommended:
   one escaping module, `data-*` attributes with delegated listeners, and a small tagged-template
   helper that escapes by default.
2. **`model()` is recomputed many times per refresh, with no memo.** Financial calls it twice,
   `flowModel` ≈6 times, a strategy evaluation 7 times. Memoise per refresh generation, invalidated
   on `state:changed` and `readInputs`.
3. **What-if evaluation by mutating and restoring globals** (`INPUTS.v`, `targetLocPct`,
   `MODEL.SUP.provision`, `_mcsRateScale`) is fragile (M-8) and not reentrant. Pass an overrides
   object into `modelRaw(overrides)`.
4. **Persistence depends on remembering `syncState` after each in-place mutation.** Missing calls
   silently skip autosave (H-6, L-9). A `mutate(key, fn)` wrapper would make this structural.
5. **Persistence boundary:** deep-copy on the way in and out (H-2), route every save and load path
   through PM so migrations apply (L-21), and persist all state that changes figures (H-3).
6. **ROI and payback** have several definitions. Centralise them next to `paybackMonthsCanonical()`
   and `npvCanonical()`.
7. **No automated tests in the repository.** The AUDIT checks and the Time Engine canaries are a
   good base; a headless test that loads the file and asserts `AUDIT.runChecks()` plus the
   golden-case figures would catch most regressions above. `tools/check.mjs` covers parsing and
   version stamps only.

## 6. Strengths

1. **`STATE_REGISTRY` is a single declarative persistence schema.** Each key is restored in its own
   `try`, and autosave is suspended for the whole restore in a `finally`.
2. **The `readInputs()` / `P()` / `V()` / `C()` seam keeps the calculation core DOM-free.**
3. **The Time Engine centralises payback and NPV.** Its canaries prove agreement with `modelRaw()`
   to 1e-9, and the calculation package (`inputHash`, `calculationVersion`) detects stale saved
   figures.
4. **Monte Carlo and the P4 layer are reproducible:** seeded `mulberry32`. `mcsEvaluate` already
   uses the correct `try/finally` restore pattern.
5. **The snapshot save works on a DOM clone, not string surgery.** It escapes the embedded JSON and
   strips previous restore scripts.
6. **IndexedDB edge cases are handled:** unavailable, blocked and version-change. Records are capped
   at 20.
7. **Destructive actions need two clicks.** The golden case is protected, and promotion keeps an
   audit trail.
8. **Chart instances are destroyed before re-creation.** Global listeners are bound once, so
   re-renders do not accumulate handlers.
9. **Degenerate cases are documented and guarded:** Σw = 0 ceiling, never-empty scope,
   deleted-persona fallback. `modelBoot()` clamps restored drivers.
10. **Comments record the reason behind each change** (reproduced bugs, invariants, spec
    references), which makes the code auditable.

## 7. Resolution in v18.9

Every fix has a regression test that **fails on v18.8 and passes on v18.9** (`tools/state-test.mjs`,
`tools/xss-test.mjs`), except where noted. The golden case did not move: Y3 savings €731,774, Y3 run cost €1,045,490,
NPV (8 %) €1,131,220, payback 9 months (asserted by `tools/smoke.mjs` against `tools/golden.json`).
Run everything with `node tools/test-all.mjs`.

### 7.1 High

| ID | Status | What changed | Test |
|---|---|---|---|
| H-1 | Fixed | `escHtml` / `escJs` / `safeId` / `cleanText` helpers; every user or imported string is escaped at output (≈200 inline-handler lines plus attribute and text sinks); group colours validated; imported ids / labels / tags / locations sanitised; the weaker local `esc` copies keep working | `xss-test` (restore, live, Excel fuzz ×2) |
| H-2 | Fixed | `snapClone()` deep-copies at `collectSnapshotState` and `applySnapshotState`; the golden case and captured snapshots no longer follow live edits | `golden_not_aliased`, `capture_not_aliased` |
| H-3 | Fixed | new registry key `scurve` (points, family, active curve) and an Excel `S-Curve` sheet | `scurve_persisted`, `scurve_excel_roundtrip` |
| H-4 | Fixed | `scEnsurePts` keeps knots strictly increasing when the horizon shrinks; `scSplineEval` ignores non-increasing / non-finite knots | `horizon_shrink_finite` |
| H-5 | Fixed | Restore applies the record offered at boot (`restoreBoot`), which is copied aside (`:prev`) before the first overwrite; the banner is shown only if the autosave is newer than the file's own state | `autosave_restore_offered`, `autosave_banner_only_if_newer` |
| H-6 | Fixed | delegated `input` / `change` listener schedules the autosave; also saved on `pagehide` | `autosave_on_param_edit` |
| H-7 | Fixed | a framed copy of the app (live previews) never persists: `AUTOSAVE.isFrame` | `autosave_frame_inert` |
| H-8 | Fixed | `evtScopeArtefacts()` returns `activeArtefacts()` once | `p2_scope_not_double_counted` |

### 7.2 Medium

| ID | Status | What changed | Test |
|---|---|---|---|
| M-1 | Fixed | P4 NPV uses `MODEL.CASE.discountRate`; `numOr()` keeps an explicit 0 % (also in P5) | `p4_npv_uses_case_rate`, `p5_zero_discount_kept` |
| M-2 | Fixed | `roiCanonical` / `fmtRoiPct`: `n/a` instead of `Infinity%` / `NaN%` everywhere ROI is shown | `roi_payback_labels` |
| M-3 | Fixed | `fmtPayback`: month 0 = "immediate"; the ">36 mo" cut-off follows the horizon | `roi_payback_labels` |
| M-4 | Fixed | strategy factors apply to a persisted strategy-neutral base (`STRAT_APPLIED`); a factor-1 strategy restores the base | `strategy_apply_idempotent` |
| M-5 | Fixed | `applySnapshotState(s, {background:true})` keeps the persona and the active tab | `snapshot_manager_redraw_quiet` |
| M-6 | Fixed | GCT comparison cached per (golden, AME reference, build) | `snapshot_manager_redraw_quiet` |
| M-7 | Fixed (one part by design) | `mcFingerprint` no longer clones the state or runs the engine, and ignores the snapshot library; **kept by design:** `decisionEngine()` still runs one 800-draw simulation the first time a verdict is requested and none exists, because a verdict must come from a distribution | `mc_fingerprint_stable_and_cheap` |
| M-8 | Fixed | `try/finally` in `runMonteCarlo` and `evaluateStrategies`; `mcAutoHook` logs errors | `whatif_restores_on_error` |
| M-9 | Fixed | `tobeComposition(yearIdx)`; Results no longer overwrites the selected year | `results_keeps_tobe_year` |
| M-10 | Fixed | `MODEL.LCE.built` separates "constructed" from "fully calibrated"; Recalibrate resets it | `p1_calibration_keeps_edits` |
| M-11 | Fixed | `record` hoisted; the cross-tab broadcast fires | covered by `autosave_*` |
| M-12 | Fixed | `tx.onabort` handled like `tx.onerror` | not testable without a quota failure |
| M-13 | Fixed | the industry list is rebuilt at boot and stripped from the saved file | `snapshot_file_clean`, `snapshot_reopen_round_trip` |
| M-14 | Fixed | `boot-ready`, banners, status lines and preview iframes removed from the saved file | `snapshot_file_clean` |
| M-15 | Fixed | the check perturbs `INPUTS` (restored in a `finally`, ceiling forced), requires strict change, reports `n/a` at a cap | `verif_sensitivity_can_fail` |
| M-16 | Fixed | `ddFingerprint` hashes the content (`hashStr`) | `dd_fingerprint_content` |
| M-17 | Fixed | overlay errors set `_overlayError`, log once, and fail the new audit check `CC-OV-01` | `model_overlay_error_reported` |

### 7.3 Low

| ID | Status | What changed |
|---|---|---|
| L-1 | Fixed | 30 unreachable functions and 6 constants removed (Sales build / discovery, Presales lab, Specialist, unused helpers), plus `toggleAllRegOfPhase`, `resetRegArtefacts` and the unreachable `'france'` branch. Reachability was computed from the syntax tree; `tools/handlers-test.mjs` proves every handler target still exists |
| L-2 | Fixed | `setSkillMap` calls `refreshAll()` |
| L-3 | Fixed | lifecycle slider: labels immediately, recompute coalesced (120 ms) |
| L-4 | Fixed | guards in `_initQmv`, `pmAddPersona`, `pmAddGroup`, `pmRenderAssignment`, `pinAllOfPhase`; rate gap shows `—` with an empty team |
| L-5 | Fixed | `fmtK` / `fmtE` use `en-US` |
| L-6 | Fixed | download URLs revoked after 1.5 s |
| L-7 | Fixed | P3 "supervisors to unlock" uses the horizon-end peak, like the seeding |
| L-8 | Fixed | persona landing honours Fast Path |
| L-9 | Fixed | group rename calls `syncState('GROUPS')` |
| L-10 | Fixed | `fmtChg` for KPI deltas; zero-baseline guards |
| L-11 | Fixed | empty team / zero ramps no longer give NaN (`blendedTJM`, `yearArtMonth`, day-rate tile, effort-reduction tile) — `degenerate_inputs_finite` |
| L-12 | Fixed | `parseLocalDate` / `addMonthsLocal` — `dates_local_new_york` |
| L-13 | Fixed — **upgraded:** a `__proto__` location in an imported workbook wrote onto `Object.prototype` (confirmed). `isKnownLoc()` now guards the Rate Card, Input Team and Location Target imports; a rate of 0 is honoured — `import_proto_and_zero_rate` |
| L-14 | Fixed | DD import builds the id set once, stringifies Date / rich text / hyperlink cells correctly, sanitises ids and text |
| L-15 | Fixed | DD sensitivity perturbs the named `COEF` values: HRI floor and slope now get different weights (79 k€ vs 29 k€ against an identical 97 k€ before) and the supervision-share pair is measured — `dd_sensitivity_distinct_coefficients` |
| L-16 | Fixed | `mpTick` reads the horizon input instead of running `model()` |
| L-17 | Fixed | Monthly insight note follows the live curve; Monthly Playback is fully English |
| L-18 | Fixed | dead Home summary block, dead `ddNote` and the boot listener on discarded buttons removed — `sidebar_click_navigates` |
| L-19 | Fixed | the Critical & Regulated report uses `appVerTag()` |
| L-20 | Fixed | a duplicated tab detects the clash over `BroadcastChannel` and takes a new id — `autosave_duplicate_tab` |
| L-21 | Fixed | `PM.hydrate` runs a migration only at its `from` version; HTML snapshots are written with `PM.serialize()` (schema + app version). The boot script still calls `applySnapshotState` directly, by design |
| L-22 | By design | the baked boot snapshot stays **partial** on purpose, so code-owned defaults (groups, coefficients, engine) keep flowing into every release; its `savedAt` is refreshed on each release (see BUMP_PROCEDURE) |
| L-23 | Fixed | the autosave status survives the panel re-render |
| L-24 | Fixed | cursor / transaction errors resolve `list()` |
| L-25 | Fixed | a late open after a blocked one closes its connection and lets the next save retry |
| L-26 | Fixed | 24 unused locals removed; the token-cost tile now shows the value it computes (`cached, same model`) |
| L-27 | Fixed | AUDIT log bounded (1.5 MB → 0.4 KB after two snapshot captures); `lang="en"`; accessible names for all 1,278 form controls and keyboard access for click-only elements (runtime pass) — `audit_log_bounded`, `a11y_labels_and_roles` |

### 7.4 Found while fixing

1. **Prototype pollution through an imported `__proto__` location** — see L-13 (more serious than first rated).
2. **The Human Readiness drag, the engagement ramp speed and the ramp cap changed nothing under the default spline
   curve** (found in v18.9, where the HRI screen was made to say so). **Resolved in v18.10:** the owner decided to apply
   them to the spline — `adoption = min(cap, drawn × speed × hriRampFactor)`; golden case unchanged, MSI / STA contexts
   and HRI now move the savings (CHANGELOG v18.10).
3. **The Critical & Regulated report had no entry point.** The function and its documentation survived, the button
   did not; it is back in the regulatory profile section.
4. **Stale regulatory counts in the industry list** (AERO showed 48 reg. artefacts, the catalogue has 69): the list
   baked into the markup was shown first; it is now rebuilt from the data.

5. **Excel import left the automation potential at a provisional fit** (found in v18.10 while checking a customer workbook:
   potential 72 % in the file, 69 % in the app, glass ceiling 28 %). Fixed — see CHANGELOG v18.10.
6. **Open modelling question — the human share is applied twice when the potential is fitted to the scope.** With "fit to
   scope" on, `autoPotential` = weighted mean of the artefacts' agent share and the glass ceiling = weighted mean of their
   human share, so potential + ceiling = 100 by construction (default case 75 + 25; customer case 72 + 28). The model then
   computes effective automation = potential × (1 − ceiling) (documented in the app): 75 % × 75 % = 56 %, 72 % × 72 % = 52 %.
   If "potential" means the agent share of the artefacts, the ceiling is already inside it and the effective depth would
   be the potential itself; if it means a technical potential before any supervision constraint, the formula is right but the
   fit-to-scope default (which takes it from the same artefact split as the ceiling) is not. **Not changed** (it would move
   the golden case: Y3 savings €731,774 and everything downstream). Decision for the model owner.

The golden-case discrepancy noted in ARCHITECTURE.md §11 is resolved: the reference figures live in
`tools/golden.json` and are asserted on every run.

