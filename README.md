# AgentCase

**AgentCase v18.10 — Agentic Transformation Business Case.**

AgentCase builds the business case for moving a software delivery team to an agentic model. It goes
from the AS-IS team, the rate card and the SDLC/regulatory scope to automation potential, the
TO-BE team (human FTE + agent vFTE), run cost, savings, NPV and payback. It then stress-tests the
result with scenarios, Monte Carlo and strategy ranking, and produces a decision verdict. Personas
(Builder, Client case, Admin, Advanced) and a guided sequence tailor the walkthrough.

## Running it

The app is a single, self-contained HTML file. Open `AgentCase_v18_10_EN.html` in a modern browser
(Chrome or Edge recommended), directly from disk.

- No server, build step or network is needed. Chart.js 4.4.1, ExcelJS 4.4.0 and the Ubuntu font are
  inlined.
- **Advanced persona:** add `?persona=advanced` to the URL, press Ctrl/Cmd+Alt+A, or click the title
  5 times.
- **Saving a case:** *Save HTML snapshot* downloads a copy of the file with the case embedded. Excel
  export/import round-trips the parameters, personas, dependencies and the S-curve. Autosave keeps
  per-tab sessions in the browser (IndexedDB) and offers them back after a reload.

## Repository layout

| Path | Content |
|---|---|
| `AgentCase_v18_10_EN.html` | the application (current version) |
| [`CHANGELOG.md`](CHANGELOG.md) | release history v12.57 → v18.10, newest first |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | architecture: file layout, engines (BUS, APP_STATE, PM, DEP, AUDIT, TIME), boot sequence, subsystems, state model, shared helpers |
| [`docs/CODE_REVIEW.md`](docs/CODE_REVIEW.md) | the v18.8 code review (52 findings) and how each was resolved in v18.9 |
| [`docs/BUMP_PROCEDURE.md`](docs/BUMP_PROCEDURE.md) | how to release a new version |
| `tools/` | the test battery and release checks (below) |
| `docs/release-notes/` | original HTML release notes, v12.57 → v18.1 (frozen) |
| `docs/history/` | archived process documents |

## Checking a change

The battery needs Node.js 18+ and [Playwright](https://playwright.dev) with a Chromium
(`PLAYWRIGHT_BROWSERS_PATH` pointing at it; set `PW_MODULE` if `playwright` is not resolvable from
`/opt/node-tools/node_modules`).

```bash
node tools/test-all.mjs --baseline <previous AgentCase_vX_Y_EN.html>   # everything below, in order
```

| Tool | Checks |
|---|---|
| `tools/check.mjs` | scripts parse, version stamps agree, markup balance (needs only Node) |
| `tools/smoke.mjs` | boots cleanly; the golden-case figures equal `tools/golden.json` |
| `tools/handlers-test.mjs` | every inline-handler target exists |
| `tools/xss-test.mjs` | hostile strings never execute (restore, live state, Excel fuzz) |
| `tools/state-test.mjs` | 38 regression tests: persistence, autosave, calculations, import safety, accessibility |
| `tools/render-diff.mjs` | the visible text of all sections is identical between two builds |

Golden case (default state): Y3 savings €731,774 · Y3 run cost €1,045,490 · NPV (8 %) €1,131,220 ·
payback 9 months.

## Open decisions

See [ARCHITECTURE.md §11](docs/ARCHITECTURE.md).
