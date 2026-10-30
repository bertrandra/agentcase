# AgentCase

**AgentCase — Agentic Transformation Business Case.** It builds the business case for moving software delivery teams to an
agentic model: from the AS-IS team, the rate card and the SDLC/regulatory scope to automation potential, the TO-BE team (human
FTE + agent vFTE), run cost, savings, NPV and payback. It then stress-tests the result (scenarios, Monte Carlo, strategy ranking)
and produces a decision verdict. Personas and guided sequences tailor the walkthrough.

**Since v20.0.0 a file is a multi-product portfolio.** One file describes several **products**, each with its **own entry team**;
the **scope and parameters are common by default and can be overridden per product** (stored as a sparse difference, with
"inherited / overridden" chips and "back to common"). Products are rolled out in **waves** (start month, per-product offset;
a product left out of every wave is "not scheduled" and excluded). The shared **Knowledge Hub** serves each product through its
own **knowledge-transfer subset** (domains, initial and target context level, curation and set-up cost, preparation before the wave,
infrastructure allocated per product or by headcount). The app **consolidates** the products on a calendar axis (the portfolio is
exactly the sum of the products, shifted), shows the top-bar figures for a chosen **display scope** (Portfolio, a wave or a product),
runs a **portfolio stress** (Monte Carlo per product with a correlation rho, diversification and a portfolio verdict) and exports the
portfolio to Excel, report, HTML and snapshots. A file with one product looks and computes exactly as before.
Start with the user guide [`docs/GUIDE_MULTI_PRODUIT.md`](docs/GUIDE_MULTI_PRODUIT.md) (French, with an English summary at the top) and the example
[`docs/examples/AgentCase_Portfolio_Example.json`](docs/examples/AgentCase_Portfolio_Example.json).

## Two deliverables

| | Where | Status |
|---|---|---|
| **TypeScript + React build (the product)** | [`app/`](app/) — version `<!-- fact:version -->20.28.0<!-- /fact -->` (`app/package.json`, the single version source) | <!-- fact:sections -->90<!-- /fact --> sections in <!-- fact:groups -->15<!-- /fact --> groups (the single-case sections plus the <!-- fact:portfolioSections -->6<!-- /fact --> of the *Portfolio* group), <!-- fact:commands -->286<!-- /fact --> commands (<!-- fact:undoable -->282<!-- /fact --> undoable). Builds to one offline HTML file, `app/dist/<!-- fact:releaseFile -->AgentCase_v20_28_EN.html<!-- /fact -->` with `npm run release`. Multi-product release; see [`CHANGELOG.md`](CHANGELOG.md) and [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) §15 |
| **Legacy single-file app (frozen reference)** | [`AgentCase_v18_13_EN.html`](AgentCase_v18_13_EN.html) | Kept in the repository until cut-over. It is the oracle the new build is proven against. Changes only for security fixes and deliberate calculation decisions (decision D7), see [`docs/BUMP_PROCEDURE.md`](docs/BUMP_PROCEDURE.md) §7 |

### Deliverables

| Deliverable | Where / how | Notes |
|---|---|---|
| Release file `<!-- fact:releaseFile -->AgentCase_v20_28_EN.html<!-- /fact -->` | `cd app && npm run release` -> `app/dist/` (one offline file, not committed) | file name derived from the version in `app/package.json` (`AgentCase_v<MAJOR>_<MINOR>[_<PATCH>]_EN.html`) |
| Portfolio file | `agentcase.portfolio.v1` JSON / HTML snapshot; a plain single case is still saved as `agentcase.snapshot.v1` | v18.x snapshots and workbooks, v19 case files open as "Product 1" in "Wave 1" |
| Example portfolio | [`docs/examples/AgentCase_Portfolio_Example.json`](docs/examples/AgentCase_Portfolio_Example.json) | 4 products, 2 waves, hub, rho 0.3; opened by a test |
| Workbooks and report | parameters (`AgentCase_vX_Y_Parameters_….xlsx`), results, due-diligence pack, critical-delivery report | portfolio sheets only for a real portfolio |
| User guide (French, with an English summary) | [`docs/GUIDE_MULTI_PRODUIT.md`](docs/GUIDE_MULTI_PRODUIT.md) | quick start, UI labels |
| Specification | [`docs/SPEC_MULTI_PRODUIT.md`](docs/SPEC_MULTI_PRODUIT.md) | status: implemented (v20.0.0), decisions D-M1..D-M12 |

Golden case (default state, identical in both): Y3 savings €891,555 · Y3 run cost €885,709 · setup €225,000 · NPV (8 %) €1,359,010 ·
payback 9 months · 0 audit violations (`tools/golden.json`).

## Run, build, test the TypeScript build

Needs Node.js 22 (the CI version). All commands run in `app/`.

```bash
cd app
npm ci
npm run dev        # Vite dev server
npm run check      # tsc --noEmit + ESLint + Vitest (what CI runs)
npm run build      # tsc --noEmit + vite build  ->  app/dist/index.html (one offline file, about 2.7 MB)
npm run release    # build + copy to app/dist/AgentCase_vX_Y_EN.html (name from the version in package.json, the single source)
npm run docs:facts # regenerate the version and the counts quoted by the docs (checked by the tests)
npm test           # Vitest only
npm run e2e        # real Chromium on the built file: smoke of every section (incl. the portfolio fixtures) + performance budget
npm run a11y       # axe audit (needs Chromium); npm run ui-parity compares the shell and sections with the legacy file
npm run parallel-run   # same files in the legacy app and this build: identical headline figures
npm run gates      # every CI gate in the CI order (check, e2e, browser jobs) with a summary table; -- --nightly for the nightly ones
node scripts/sizes.mjs   # largest source files (the 150-line rule)
```

`npm run check` last measured: 202 test files, 15,339 tests, all passing (about 5 minutes on a small machine). The browser tools need Chromium
(`PW_MODULE` / `PLAYWRIGHT_BROWSERS_PATH` if Playwright is not resolvable; run them from `app/` as `node ../tools/<tool>.mjs` if an npm script fails). CI
([`.github/workflows/app.yml`](.github/workflows/app.yml)) runs on pull requests and on pushes to `main` that touch `app/`, `tools/` or the legacy file: job
`check` (audit, graph, duplication, `npm run check`, build), then in parallel job `e2e` (smoke, flows, performance, parallel run) and job `browser` (UI parity,
accessibility on golden, the portfolio fixture, dark and dark + high contrast). [`.github/workflows/nightly.yml`](.github/workflows/nightly.yml) runs
every night at 02:17 UTC: `npm run check` three times (flake detection), the parallel run on all 147 files, `npm run validate:affected`, the documented test
count and `npm audit --omit=dev`. **`npm run gates`** runs the same steps locally, in the same order (`-- --list` prints them, `-- --nightly` the nightly
ones); it fails when its step list and the workflows differ.

Open `app/dist/index.html` from disk in a modern browser (Chrome or Edge); no server or network is needed. In the app:
Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes any business edit; *Save HTML snapshot* downloads a copy of the page with
the case embedded; Excel workbooks (parameters, results, due-diligence pack) round-trip with the legacy formats; autosave keeps
per-tab sessions in IndexedDB and offers them back after a reload.

## Run the legacy file

Open `AgentCase_v18_13_EN.html` directly from disk (no build). Advanced persona: `?persona=advanced`, Ctrl/Cmd+Alt+A, or click the
title 5 times. These Advanced-unlock gestures are legacy-only and out of scope for the new build (removed from the spec).

## Repository layout

| Path | Content |
|---|---|
| [`app/`](app/) | the TypeScript + React build: `src/{domain,store,controllers,ui,content}`, `tests/`, `fixtures/`, `scripts/` ([`app/README.md`](app/README.md)) |
| `AgentCase_v18_13_EN.html` | the legacy application, frozen reference |
| [`tools/`](tools/) | Node/Playwright tooling that runs against the **legacy** file: the oracle generators (`oracle.mjs`, `oracle-recipes*`, `oracle-extras.d/`, `section-text.mjs`, `snapshot-fixtures.mjs`, `report-fixtures.mjs`, `excel-*.mjs`, `extract-catalog.mjs`) and the legacy release battery (`test-all.mjs` and the tools it runs) |
| [`CHANGELOG.md`](CHANGELOG.md) | release history from v12.57, newest first |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | architecture of the TypeScript build; appendix maps the legacy engines to their replacements |
| [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) | the migration plan (§1–§13), its progress log (§14) and the outcome and remaining gaps (§15) |
| [`docs/SECTION_PORTING.md`](docs/SECTION_PORTING.md) | the recipe used to port each section |
| [`docs/BUMP_PROCEDURE.md`](docs/BUMP_PROCEDURE.md) | release procedure (new build; legacy file in §7) |
| [`docs/SPEC_MULTI_PRODUIT.md`](docs/SPEC_MULTI_PRODUIT.md), [`docs/GUIDE_MULTI_PRODUIT.md`](docs/GUIDE_MULTI_PRODUIT.md), `docs/examples/` | the multi-product specification (English) with its phase notes, the user guide, the example portfolio |
| [`docs/CODE_REVIEW.md`](docs/CODE_REVIEW.md) | the v18.8 code review (52 findings), its v18.9 resolution, and its status after the migration |
| `docs/history/` | archived documents: legacy architecture and bump procedure (v18.x), the v12.42 bump procedure |
| `docs/release-notes/` | original HTML release notes, v12.57 → v18.1 (frozen) |

## The testing battery

| Layer | What it proves | Where | Runs in CI |
|---|---|---|---|
| Oracle | the domain engine reproduces the legacy `model()`, payback, NPV, headline, glass ceiling and audit result to 1e-6 on every fixture case | `app/tests/domain/oracle.test.ts`; fixtures `app/fixtures/{cases,expected}` (107 cases), generated by `tools/oracle.mjs` from the legacy file | yes |
| Oracle extras | derived read-outs (scenarios, Monte Carlo, tune, verify, factory ...) equal the legacy expressions | `app/fixtures/extras/` (97 named extras), `tools/oracle-extras.d/` | yes |
| Fixtures: persistence | legacy HTML snapshots, parameters/results/due-diligence workbooks and the critical-delivery report load or reproduce cell by cell | `app/fixtures/{snapshots,xlsx,xlsx-results,reports}`, `app/tests/store/` | yes |
| Parity | every figure the legacy section shows appears in the migrated section | `app/fixtures/sections/` (text dumps by `tools/section-text.mjs`), `app/tests/ui/sections/`, `app/tests/helpers/parity.ts` | yes |
| Commands and history | every command has a label and a sample and round-trips through undo/redo; random command sequences keep `undo∘apply = id` | `app/tests/store/registry.test.ts`, `undo-property.test.ts` (fast-check) | yes |
| Architecture | layer rules, no raw HTML, 150-line limit | ESLint, `app/tests/lint-rules.test.ts`, `app/tests/size.test.ts` | yes |
| Legacy browser battery | the legacy file boots, shows the golden figures, resists hostile strings; 44 regression tests | `node tools/test-all.mjs` (Playwright + Chromium) | no |
| Portfolio | one-product portfolios equal the single case on the 107 fixtures (A1/A9); consolidation = sum of the products (A2-A4); override semantics (A5); undo of every command on a 3-product portfolio (A6); the shipped example opens | `app/tests/store/portfolio-*.test.ts`, `app/tests/domain/portfolio/` | yes |
| Browser end-to-end (new build) | boot, every section on 6 case fixtures and 2 portfolio files (incl. the 6 Portfolio sections), no console error, no NaN | `npm run e2e` (`tools/e2e-smoke.mjs`) | yes (job `e2e`) |
| Performance | size, shell time, edit and undo latency, section switches (incl. the Portfolio group) against `app/perf-budget.json` | `tools/perf.mjs` | yes (job `e2e`) |
| Accessibility | axe-core on every section, keyboard and state audits; budget `app/a11y-budget.json` | `npm run a11y` (`tools/a11y.mjs`) | yes (job `browser`: golden, pf-three-products, golden dark, golden dark + high contrast) |
| UI parity / parallel run | shell areas and section content vs the legacy file; same headline figures on the same files | `tools/ui-parity.mjs`, `tools/parallel-run.mjs` | yes (UI parity: job `browser`; parallel run: job `e2e` on the 40 workbooks, nightly on the 107 case files too) |
| Flakes and test selection | `npm run check` three times in a row; the mutation check of `test:affected` (recall 100 %) | `tools/check-repeat.mjs`, `npm run validate:affected` | nightly |

Legacy battery prerequisites: Node.js 18+ and [Playwright](https://playwright.dev) with a Chromium (`PLAYWRIGHT_BROWSERS_PATH`;
`PW_MODULE` if `playwright` is not resolvable from `/opt/node-tools/node_modules`). Regenerating the oracle fixtures needs the same
(`node tools/oracle.mjs`, see [`docs/BUMP_PROCEDURE.md`](docs/BUMP_PROCEDURE.md) §7).
