# AgentCase

**AgentCase v18.8 — Agentic Transformation Business Case.**

AgentCase builds the business case for moving a software delivery team to an agentic model. It goes
from the AS-IS team, the rate card and the SDLC/regulatory scope to automation potential, the
TO-BE team (human FTE + agent vFTE), run cost, savings, NPV and payback. It then stress-tests the
result with scenarios, Monte Carlo and strategy ranking, and produces a decision verdict. Personas
(Builder, Client case, Admin, Advanced) and a guided sequence tailor the walkthrough.

## Running it

The app is a single, self-contained HTML file. Open `AgentCase_v18_8_EN.html` in a modern browser
(Chrome or Edge recommended), directly from disk.

- No server, build step or network is needed. Chart.js 4.4.1, ExcelJS 4.4.0 and the Ubuntu font are
  inlined.
- **Advanced persona:** add `?persona=advanced` to the URL, press Ctrl/Cmd+Alt+A, or click the title
  5 times.
- **Saving a case:** *Save HTML snapshot* downloads a copy of the file with the case embedded. Excel
  export/import round-trips the parameters. Autosave keeps per-tab sessions in the browser
  (IndexedDB).

## Repository layout

| Path | Content |
|---|---|
| `AgentCase_v18_8_EN.html` | the application (current version) |
| [`CHANGELOG.md`](CHANGELOG.md) | release history v12.57 → v18.8, newest first |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | architecture: file layout, engines (BUS, APP_STATE, PM, DEP, AUDIT, TIME), boot sequence, subsystems, state model |
| [`docs/CODE_REVIEW.md`](docs/CODE_REVIEW.md) | v18.8 code review: findings by severity, fix order, strengths |
| [`docs/BUMP_PROCEDURE.md`](docs/BUMP_PROCEDURE.md) | how to release a new version |
| [`tools/check.mjs`](tools/check.mjs) | release check: script parse, version stamps, markup balance |
| `docs/release-notes/` | original HTML release notes, v12.57 → v18.1 (frozen) |
| `docs/history/` | archived process documents |

## Checking a change

```bash
node tools/check.mjs                 # auto-detects AgentCase_vX_Y_EN.html
node tools/check.mjs --expect 18.9   # after a version bump
```

This requires Node.js 18 or later. The check only covers parsing, version stamps and markup
balance. Functional checks are manual (see [BUMP_PROCEDURE.md](docs/BUMP_PROCEDURE.md) §3.4) and use
the in-app 🔍 Logic verification section.

## Known issues

The v18.8 review found 8 high-severity issues, notably:

- unescaped user and imported strings (XSS through Excel import);
- edits after "Reset to golden case" that rewrite the golden snapshot;
- S-curve points that are not saved;
- autosave gaps.

See [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md).
