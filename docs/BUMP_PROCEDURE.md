# AgentCase — Version bump procedure

> Current version: **v18.11**. Updated 2026-10-21 for the Git repository layout and the v18.9 test battery.
> Replaces the v12.42 procedure archived in
> [history/AgentCase_BumpProcedure_v12.42.md](history/AgentCase_BumpProcedure_v12.42.md).
> Main changes since then:
> - The Classification workbook is no longer part of a release. v18.8 has no reference to it.
> - The HTML release notes are frozen at v18.1. [CHANGELOG.md](../CHANGELOG.md) is now the
>   source of truth.
> - `window.AgentCaseArch.VERSION` is a third mandatory stamp.
> - Validation is scripted: `node tools/test-all.mjs` runs the whole battery (§3.4).

**Rule:** every functional change bumps the version number. A bump is one commit (or PR) that
renames the app file, updates its stamps and adds a changelog entry.

## 1. What a bump touches

| Artifact | Action |
|---|---|
| `AgentCase_vX_Y_EN.html` | `git mv` to the new name, apply the change, update the stamps (§2) |
| `CHANGELOG.md` | add a `## [vX.Y] YYYY-MM-DD — title` section at the top, with New / Changed / Fixed |
| `README.md` | update the file name and version |
| `docs/ARCHITECTURE.md` | update only if the architecture changed (new engine, new state key, new section family, boot order); bump its "Applies to" line |
| `docs/CODE_REVIEW.md` | mark findings fixed in this release (or note the new version in its header after a fresh review) |

Use `git mv`, never copy-and-delete, so the file history follows the renames.

## 2. Version stamps in the app HTML

### 2.1 Mandatory — update on every bump

| # | Location | Pattern |
|---|---|---|
| 1 | browser tab title (L5) | `<title>AgentCase vX.Y — Agentic Transformation Business Case</title>` |
| 2 | footer (≈L6455) | `<strong>AgentCase vX.Y</strong>` |
| 3 | QA namespace (≈L22516) | `VERSION: 'X.Y.0',` inside `Object.defineProperty(window, 'AgentCaseArch', …)` |

Stamp 3 is the single runtime source. `appVerTag()` and `appVerFileTag()` derive `vX.Y` and `vX_Y`
from it for snapshot file names, Excel file names and autosave records.

### 2.2 Derived automatically — nothing to edit

The exported "Critical & Regulated Software Delivery" report, snapshot / export file names and autosave records take
the version from `window.AgentCaseArch.VERSION` through `appVerTag()` (since v18.9). Do not hard-code a version
string in the app; if you find one, replace it with `appVerTag()`.

### 2.2b Baked boot snapshot

The `<script data-agentcase-snapshot="1">` block at the end of the file is deliberately **partial** (35 keys; see
ARCHITECTURE.md §8.2). On each release refresh only its `"savedAt"` to the release time (ISO, UTC). Do not
regenerate the whole block from a saved snapshot: a full snapshot would freeze code-owned defaults (groups,
coefficients, engine settings) and stop new defaults from reaching users.

### 2.3 Do not touch

- **Historical tags in comments** (`/* v18.5: … */`) and in data (for example
  `edit:{…, note:'v18.7'}` in `DD_COEFFICIENTS`). They record when something was introduced.
- **Feature badges in the markup** (for example the "v18.8" chips on Section Dependencies, Data
  Model and Calculation Engine). These are historical too.
- **Schema versions:** change these only when the corresponding data shape changes, never as part of
  a routine bump.
  - `personaSchemaVersion` / `schemaVersion` = `'15.0'` (persisted UI/persona state)
  - `calculationVersion` = `'agentcase.timeengine.v1'` (bump when Time Engine results change for the
    same inputs; it makes saved cases show as stale)
  - calculation package `schemaVersion` = `'agentcase.calculation.v1'`
  - IndexedDB `DB_VERSION` = `1`

Rule of thumb: if the version is the app's own identifier, bump it. If it marks when a feature
arrived, or the shape of stored data, leave it alone.

## 3. The ritual

Replace `<PREV>` and `<NEW>` with `X.Y` versions (for example `18.8` → `18.9`) and `<PREV_>` /
`<NEW_>` with the underscore form (`18_8` → `18_9`).

### 3.1 Pre-flight

```bash
git switch -c release/v<NEW>            # or your working branch
node tools/check.mjs                    # must pass on the current file, all stamps == <PREV>
```

If any stamp disagrees **before** you start, a previous bump drifted. Fix it in this release and
note it in the changelog.

### 3.2 Rename and apply the change

```bash
git mv AgentCase_v<PREV_>_EN.html AgentCase_v<NEW_>_EN.html
```

Apply the functional change. For scripted edits, use count-asserted replacements (§3.3), never a
bare `sed` or `str.replace`.

### 3.3 Update the stamps (count-asserted)

```bash
python3 - <<'PY'
p = 'AgentCase_v<NEW_>_EN.html'
t = open(p, encoding='utf-8').read()
def rep(old, new, expected=1):
    global t
    n = t.count(old)
    assert n == expected, f"expected {expected} x {old!r}, found {n}"
    t = t.replace(old, new)
rep('<title>AgentCase v<PREV> —', '<title>AgentCase v<NEW> —')
rep('<strong>AgentCase v<PREV></strong>', '<strong>AgentCase v<NEW></strong>')
rep("VERSION: '<PREV>.0',", "VERSION: '<NEW>.0',")
open(p, 'w', encoding='utf-8').write(t)
PY
```

The `assert` on each `rep` guards against silent drift: a pattern that is not found is an error,
not a no-op. Update the hard-coded report strings (§2.2) by hand.

### 3.4 Validate

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers      # or wherever your Chromium lives; see README
node tools/test-all.mjs --baseline <previous AgentCase_vX_Y_EN.html>
```

`test-all` runs, in order:

1. `check.mjs` — every inline script parses (catches the v18.1 quote-breaking edit), the three stamps agree, `<div>` balance;
2. `smoke.mjs` — boots without errors and reproduces **the golden-case figures** of `tools/golden.json`;
3. `handlers-test.mjs` — every inline-handler target exists (catches dead-code removal that went too far);
4. `xss-test.mjs` — injection passes; any new `innerHTML` / inline-handler interpolation of a user string must be escaped;
5. `state-test.mjs` — the regression suite (add a test for every bug you fix: it must fail before the fix);
6. `render-diff.mjs` against the previous build — the visible text of all sections. Expect **no** difference for a
   pure refactor; for a feature, the differences must be exactly the ones you intended.

If a change is *meant* to move the golden case, update `tools/golden.json` and state the old → new figures in the
changelog entry. Then do a short manual pass in a real browser (Chrome or Edge, from `file://`): console clean,
🔍 Logic verification shows no blocking violation, save an HTML snapshot and reopen it.

### 3.5 Changelog and docs

- Add the `CHANGELOG.md` entry at the top: `## [v<NEW>] YYYY-MM-DD — <title>`, then
  **New / Changed / Fixed**, and a **Golden case** line (unchanged, or old → new).
- Update `README.md` (file name, version) and, if relevant, `docs/ARCHITECTURE.md` and
  `docs/CODE_REVIEW.md`.

### 3.6 Commit and ship

```bash
git add -A
git commit -m "Release v<NEW>: <one-line summary>"
git push -u origin <branch>
```

Open a pull request. Merge once `node tools/check.mjs` passes and the browser checks above are done.

## 4. Common pitfalls (lessons from real bugs)

- **Silent drift on stamps** (v12.42): a `sed` that finds nothing does not fail. Always use the
  count-asserted `rep()`, and always run `tools/check.mjs`.
- **Historical-badge collateral:** a blanket `s/v18\.[0-9]+/vNEW/g` corrupts historical comments,
  coefficient notes and feature badges. Only touch the anchored stamp patterns in §2.1.
- **Quotes inside JS strings** (v18.1): CSS or HTML living inside single-quoted JS strings breaks
  the script if an edit introduces a `'`. The page still looks populated, because the last state is
  baked into the markup, but nothing works. `tools/check.mjs` catches it; a visual check does not.
- **Release from the source file, not from a re-saved snapshot.** "Save HTML snapshot" now strips transient UI
  (`boot-ready`, banners, preview frames, the industry list — v18.9), but it still serialises the rendered DOM and the
  whole state, which would freeze code-owned defaults into the release (§2.2b).
- **A fix without a test** is a fix that comes back. Reproduce the failure on the previous build first
  (`node tools/state-test.mjs <old.html> --only <test>` must FAIL), then fix, then it must PASS.

## 5. Checklist

- [ ] `node tools/test-all.mjs` passes on the current file (pre-flight)
- [ ] `git mv` to `AgentCase_v<NEW_>_EN.html`
- [ ] functional change applied with count-asserted edits
- [ ] 3 stamps updated (title, footer, `AgentCaseArch.VERSION`)
- [ ] baked boot snapshot: `"savedAt"` refreshed (§2.2b)
- [ ] `node tools/check.mjs --expect <NEW>` then `node tools/test-all.mjs --baseline <previous>` pass
- [ ] golden figures unchanged, or `tools/golden.json` + changelog updated together
- [ ] browser check: console clean, Logic verification, snapshot save → reopen
- [ ] `CHANGELOG.md` entry with golden-case line; README updated; docs updated if relevant
- [ ] commit, push, pull request
