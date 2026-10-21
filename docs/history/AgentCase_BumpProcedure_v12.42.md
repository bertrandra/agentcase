# AgentCase — Version Bump Procedure

**Purpose.** Every functional change bumps the version number. This document codifies the ritual so no stamp is missed and no silent regression escapes the review.

**Current version at time of writing.** v12.42 (76 versions shipped since v10.8).

---

## 1 · What "a bump" covers

A bump touches **three artifacts** in `/mnt/user-data/outputs/`:

| Artifact | Filename pattern | Version stamps inside |
|---|---|---|
| App HTML | `AgentCase_vX.YY_EN.html` | 3 dynamic stamps (see §2) |
| Excel classification | `AgentCase_Classification_vX.YY_EN.xlsx` | Cell A1 (Summary) + cell C2 (amber italic note) |
| Release notes | `AgentCase_ReleaseNotes_v10.8-vX.YY.html` | 6 stamps (see §3) |

Companion docs (`AgentCase_FormulaBook_v12.28_EN.html`, `AgentCase_SectionGuide_v12.28_EN.html`, `AgentCase_Architecture_v12.25.html`) are **not** re-bumped every release — they carry the version at which their content was last materially updated. Re-bump them only when their content changes.

---

## 2 · App HTML — the 3 dynamic stamps

**These three MUST update on every bump.** No exception.

| # | Location | Pattern to match | What it looks like |
|---|---|---|---|
| 1 | Browser tab title | `<title>AgentCase vX.YY — Agentic Transformation Business Case</title>` | Tab title in the browser |
| 2 | Footer strong tag | `<strong>AgentCase vX.YY</strong>` | Bold version stamp at the bottom of the app |
| 3 | Excel reference line | `AgentCase_Classification_vX.YY_EN reference` | Same footer, downstream of the strong tag |

### Do NOT touch — historical badges

The Architecture tab contains version badges that mark **when a feature was introduced**. These are traceability markers, not dynamic stamps. They look like:

```html
<span class="v">v12.16+</span>   <!-- the seam (readInputs) was introduced in v12.16 -->
<span style="...background:#9b59b6...padding:1px 5px">v12.17</span>   <!-- Monte Carlo -->
```

Rule of thumb: if the version appears **inside a styled inline span/badge** describing a feature, it is historical. Leave it alone. If it appears as **the app's own identifier** (title, footer strong, xlsx reference), it must be bumped.

---

## 3 · Release notes — the 6 stamps

| # | Location | What to update |
|---|---|---|
| 1 | `<title>` | `AgentCase — Release Notes (vX.YY → v10.8)` |
| 2 | Subtitle | `· vX.YY down to v10.8` |
| 3 | Stat counter | `<div class="v">NNN</div><div class="l">Versions shipped</div>` — increment |
| 4 | Table row | Insert new `<tr>` at the top of `<tbody>`, above the previous version's row |
| 5 | Section block | Insert new `<h2>` + `<div class="rel">…</div>` at the top of the version-block sequence |
| 6 | Sticky sidebar | `<div class="current-version"><div class="v">vX.YY</div>` |
| — | Footer trailing text | `AgentCase — NNN versions · vX.YY → v10.8` |

Order in the release notes is always **newest first**.

---

## 4 · Excel classification — the 2 stamps

| # | Cell | What it holds |
|---|---|---|
| 1 | `Summary!A1` | `AgentCase vX.YY — Tab summary` |
| 2 | `Summary!C2` | Amber-italic release note describing what changed in this version (`Font(name='Calibri', size=10, italic=True, color='00BA7517')`) |

C2 is the human-readable summary the reader sees when they open the workbook — it should describe the version's material change in one paragraph, not just repeat the version number.

---

## 5 · The bump ritual (in order)

### 5.1 · Pre-flight check

Before touching anything, verify the **starting state** of the three HTML stamps. This catches the class of bug that shipped in v12.42 (title / footer / xlsx-ref had silently drifted to v12.34 because a previous bump had missed them, then subsequent `sed` operations looking for the "previous" version found nothing).

```bash
python3 -c "
import re
t=open('AgentCase_v<PREV>_EN.html').read()
body=re.sub(r'<script.*?</script>','',t,flags=re.S)
# All version tokens in the visible body
vals=sorted(set(re.findall(r'v(?:1[0-2]\.\d{1,2})', body)))
print('Body versions found:', vals)
# The 3 dynamic stamps must all show the PREVIOUS version
for pat in ['<title>AgentCase v', '<strong>AgentCase v', 'AgentCase_Classification_v']:
    m=re.search(pat + r'(\d+\.\d+)', body)
    print(f'  {pat}... → {m.group(1) if m else \"NOT FOUND\"}')
"
```

**Expected.** The three stamps must **all** print the same previous version (e.g. `v12.42`). If any of them shows an older version, that is a silent-drift bug from an earlier bump — flag it, fix it in the same operation, and audit the intervening versions to know how far back the drift goes.

### 5.2 · Copy + apply changes

```bash
cd /mnt/user-data/outputs
cp AgentCase_v<PREV>_EN.html                       AgentCase_v<NEW>_EN.html
cp AgentCase_Classification_v<PREV>_EN.xlsx        AgentCase_Classification_v<NEW>_EN.xlsx
cp AgentCase_ReleaseNotes_v10.8-v<PREV>.html       AgentCase_ReleaseNotes_v10.8-v<NEW>.html
```

Then apply the functional changes to the new HTML.

### 5.3 · Update the 3 HTML stamps (assertion-gated)

```python
t=open('AgentCase_v<NEW>_EN.html').read()
def rep(o,n,e=1):
    c=t.count(o)
    assert c==e, f"expected {e} occurrences, found {c}: {o!r}"
    return t.replace(o,n)
t=rep('<title>AgentCase v<PREV> —', '<title>AgentCase v<NEW> —')
t=rep('<strong>AgentCase v<PREV></strong>', '<strong>AgentCase v<NEW></strong>')
t=rep('AgentCase_Classification_v<PREV>_EN reference', 'AgentCase_Classification_v<NEW>_EN reference')
open('AgentCase_v<NEW>_EN.html','w').write(t)
```

The `assert c==1` on each rep is the primary guard against silent drift.

### 5.4 · Post-flight check

**This is the check that would have caught the v12.42 bug.**

```bash
python3 -c "
import re
t=open('AgentCase_v<NEW>_EN.html').read()
body=re.sub(r'<script.*?</script>','',t,flags=re.S)
stamps=[]
for pat in ['<title>AgentCase v', '<strong>AgentCase v', 'AgentCase_Classification_v']:
    m=re.search(pat + r'(\d+\.\d+)', body)
    stamps.append(m.group(1) if m else None)
print('Stamps after bump:', stamps)
assert all(s=='<NEW>' for s in stamps), f'DRIFT: {stamps}'
print('  OK — all 3 stamps == v<NEW>')
# Historical badges (visible in the body, styled as inline spans) — informational only
badges=sorted(set(re.findall(r'v(?:1[0-2]\.\d{1,2})', body)))
print('  All body version tokens (badges + stamps):', badges)
"
```

### 5.5 · Excel stamps

```python
from openpyxl import load_workbook
from openpyxl.styles import Font
wb=load_workbook('AgentCase_Classification_v<NEW>_EN.xlsx')
wb['Summary'].cell(1,1).value='AgentCase v<NEW> — Tab summary'
c=wb['Summary'].cell(2,3)
c.value='Version v<NEW> · <one-paragraph description of what changed>.'
c.font=Font(name='Calibri', size=10, italic=True, color='00BA7517')
wb.save('AgentCase_Classification_v<NEW>_EN.xlsx')
```

### 5.6 · Release notes — 6 stamps + insert new block

```python
p='AgentCase_ReleaseNotes_v10.8-v<NEW>.html'
t=open(p).read()
def rep(o,n,e=1):
    c=t.count(o); assert c==e,f'{e}!={c}: {o[:60]!r}'; return t.replace(o,n)
t=rep('<title>AgentCase — Release Notes (v<PREV> → v10.8)</title>',
      '<title>AgentCase — Release Notes (v<NEW> → v10.8)</title>')
t=rep('· v<PREV> down to v10.8</div>', '· v<NEW> down to v10.8</div>')
t=rep('<div class="stat"><div class="v"><PREV_COUNT></div><div class="l">Versions shipped</div></div>',
      '<div class="stat"><div class="v"><NEW_COUNT></div><div class="l">Versions shipped</div></div>')
# Insert new row at top of tbody (anchor: previous version's row)
t=rep('<tbody>\n<tr><td class="v">v<PREV></td>',
      '<tbody>\n<tr><td class="v">v<NEW></td><td><CATEGORY></td><td><ONE-LINE SUMMARY></td><td><span class="tag <feat|ui|fix>"><TAG></span></td></tr>\n<tr><td class="v">v<PREV></td>')
# Insert new h2 section (anchor: previous version's h2)
t=rep('<h2><PREV_TITLE> — v<PREV></h2>',
      '<h2><NEW_TITLE> — v<NEW></h2>\n<div class="rel">\n<div class="hd"><span class="vnum">v<NEW></span><span class="tags"><span class="tag <feat|ui|fix>"><TAG></span></span></div>\n<ul>\n<li>…bullets…</li>\n</ul>\n<div class="files">AgentCase_v<NEW>_EN.html · AgentCase_Classification_v<NEW>_EN.xlsx — current version</div>\n</div>\n\n<h2><PREV_TITLE> — v<PREV></h2>')
# Sticky sidebar
t=rep('<div class="current-version">\n<div class="v">v<PREV></div>\n<div class="l">Current version</div>\n</div>',
      '<div class="current-version">\n<div class="v">v<NEW></div>\n<div class="l">Current version</div>\n</div>')
# Footer trailing text
t=rep('AgentCase — <PREV_COUNT> versions · v<PREV> → v10.8',
      'AgentCase — <NEW_COUNT> versions · v<NEW> → v10.8')
open(p,'w').write(t)
```

Then delete the previous release notes file:

```bash
rm AgentCase_ReleaseNotes_v10.8-v<PREV>.html
```

### 5.7 · Validate

```bash
# HTML parse + div balance
python3 -c "
import re
t=open('/mnt/user-data/outputs/AgentCase_v<NEW>_EN.html').read()
app=re.sub(r'<script>/\* (Chart\.js|ExcelJS).*?</script>','',t,flags=re.S)
code=[b for b in re.findall(r'<script>(.*?)</script>',app,re.S) if 'function model(' in b][0]
open('/tmp/vNEW.js','w').write(code)
print('div balance:', app.count('<div'), '==', app.count('</div>'))
"
node -e "const vm=require('vm');new vm.Script(require('fs').readFileSync('/tmp/vNEW.js','utf8'));console.log('parse OK');"

# QC 20/20 non-regression
sed -i 's/AgentCase_v<PREV>_EN.html/AgentCase_v<NEW>_EN.html/' /home/claude/qc_full.js
node /home/claude/qc_full.js 2>&1 | grep -E 'RESULT|FAIL' | tail -5
```

Expected: `div balance: N == N`, `parse OK`, `RESULT: 20 passed, 0 failed`.

### 5.8 · Present the three files

```python
present_files([
    '/mnt/user-data/outputs/AgentCase_v<NEW>_EN.html',
    '/mnt/user-data/outputs/AgentCase_Classification_v<NEW>_EN.xlsx',
    '/mnt/user-data/outputs/AgentCase_ReleaseNotes_v10.8-v<NEW>.html',
])
```

Order matters: HTML first (the primary deliverable), classification second, release notes third.

---

## 6 · Companion docs — when to re-bump

These are shipped at a fixed version and re-bumped only when their content changes materially:

| File | Content covered | Re-bump trigger |
|---|---|---|
| `AgentCase_FormulaBook_v12.28_EN.html` | 22 formulas across 3 sections | Any formula added / removed / substantially changed |
| `AgentCase_SectionGuide_v12.28_EN.html` | 49 sections × persona menus | Any section added / removed / renamed, or persona menu change |
| `AgentCase_Architecture_v12.25.html` | Two-layer architecture, seam, MC engine | Architecture reshape (new layer, new engine, seam refactor) |

When re-bumping a companion doc, apply the same title + footer + release-notes update ritual as the app HTML.

---

## 7 · Common pitfalls (lessons from actual bugs)

**Silent drift on stamps.** If `sed 's/vPREV/vNEW/'` on a stamp finds nothing, it does not error — it silently no-ops. The `rep(exp=1)` pattern catches this by asserting the count. Always use `rep()`, never bare `str.replace`.

**Historical-badge collateral.** A blanket `sed 's/v12\.[0-9]\+/vNEW/g'` will corrupt the Architecture tab's historical badges. Only ever bump the three specific stamp patterns listed in §2, using their full context strings as anchors.

**Post-flight check skipped.** The v12.42 bug shipped because the jsdom test suite (20/20 QC) validates the app's runtime behaviour but does not verify the visible version stamps. The §5.4 grep is the only line of defence — never skip it.

**Excel Font object re-application.** `openpyxl` requires the `Font(...)` object to be re-applied after setting `.value`. Setting `.value` on a cell resets its inline formatting to defaults.

**Release notes counter drift.** The "versions shipped" counter (`<div class="v">NNN</div>`) is easy to forget. Track it: v12.42 = 76.

---

## 8 · Quick reference — bump checklist

- [ ] Pre-flight grep of the 3 HTML stamps on the current file — all show the previous version
- [ ] Copy HTML + xlsx + release notes to new version names
- [ ] Apply functional changes to the new HTML with `rep(exp=N)` assertions
- [ ] Update HTML stamps (§5.3) — 3 `rep(exp=1)` calls
- [ ] Post-flight grep — assert all 3 stamps == new version
- [ ] Update Excel A1 + C2 with new `Font()` object
- [ ] Update release notes — 6 stamps + new `<tr>` + new `<h2>` block + delete old release notes file
- [ ] Div-balance + Node vm.Script parse — both OK
- [ ] QC 20/20 non-regression
- [ ] `present_files` in canonical order (HTML, xlsx, release notes)
- [ ] Conversational reply summarising what changed + validation counts

If any check fails, do not present the files. Fix, re-verify, then present.
