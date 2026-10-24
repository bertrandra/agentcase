# AgentCase — Release procedure

> Applies to the repository after the migration: the TypeScript + React build in `app/` is the product (its version is the `version` of `app/package.json`);
> the legacy single-file app `AgentCase_v18_13_EN.html` is the frozen reference (§6). The previous procedure, written for the
> single file, is archived in [`history/BUMP_PROCEDURE_legacy_v18.md`](history/BUMP_PROCEDURE_legacy_v18.md) (and the v12.42 one in
> [`history/AgentCase_BumpProcedure_v12.42.md`](history/AgentCase_BumpProcedure_v12.42.md)).

**Rule:** every functional change of the product bumps the version. A release is one pull request that changes the version (one command,
§3), adds a changelog entry, regenerates the documentation facts and passes CI. Commands run from the repository root unless a `cd app` is shown.

## 1. What a release touches

| Artifact | Action |
|---|---|
| `app/package.json` and `app/package-lock.json` | `version`: **the single version source**. `cd app && npm version X.Y.Z --no-git-tag-version` edits both (lock file: two places) |
| `CHANGELOG.md` | new `## [vX.Y.Z] YYYY-MM-DD — title` section at the top: New / Changed / Fixed and a **Golden case** line |
| `docs/ARCHITECTURE.md`, `README.md`, `app/README.md` | the version, the release file name and the counts between `<!-- fact:… -->` markers are **generated**: `cd app && npm run docs:facts` |
| `docs/ARCHITECTURE.md` (prose) | only if the architecture changed |
| `docs/MIGRATION_PLAN.md` §15 | tick off or add remaining gaps when a release closes one |
| `docs/RELEASE_TAGS.md` | add the row of the release (merge commit) after the merge, with its tag command |

Nothing else carries the version. It reaches the code at build and test time: `app/vite.config.ts` reads `package.json` and injects it as
`__APP_VERSION__` (Vite `define`, also used by Vitest and vite-node), which `app/src/domain/version.ts` exports as `APP_VERSION` (brand in the
top bar, snapshot, Excel and report file names); the page title of `app/index.html` is the placeholder `%APP_VER_TAG%`, filled by the same
config (`AgentCase v20.12 — …`). `app/tests/version.test.ts` fails if a version literal or its tags (`v20.12`, `v20_12`) appear anywhere under
`app/src`, `app/tests` or in `app/index.html`, and `app/tests/docs-facts.test.ts` (and `npm run docs:check`, part of `npm run check`) fails with
"run `npm run docs:facts`" when a generated fact in the docs is stale.

### How the version becomes a tag

`versionTag()` / `versionFileTag()` (`app/src/domain/versionTag.ts`, used by `appVerTag()` / `appVerFileTag()`, the page title and
`npm run release`) turn the version into `vX.Y` by removing one trailing `.0` (legacy `appVerTag()` semantics), and dots into underscores for
file names: `20.0.0` → `v20.0` / `v20_0`, `20.12.0` → `v20.12` / `v20_12`, and a **patch release** keeps its patch: `20.12.1` → `v20.12.1` /
`v20_12_1` (release file `AgentCase_v20_12_1_EN.html`). A pre-release suffix is kept as is (`20.0.0-dev` → `v20.0.0-dev`), so remove
`-dev` in the release that cuts over.

### Do not touch

- Schema tags of stored data change only when the data shape changes, never in a routine release: the snapshot `_schema`
  (`agentcase.snapshot.v1` and `agentcase.portfolio.v1`, `app/src/store/persistence/snapshot.ts`), the autosave database name and version (`agentcase-v19`, version 1,
  `idb.ts`) and the BroadcastChannel name (`agentcase-v19`) keep their `v19` name in 20.x on purpose. Renaming them orphans users' autosaves or splits multi-tab sync.
- Historical tags in comments and the `calculationVersion` string of the Time Engine (`agentcase.timeengine.v1`,
  `app/src/domain/time/kernel.ts`).

## 2. Pre-flight

```bash
git switch -c release/vX.Y.Z
cd app && npm ci
npm run check        # tsc --noEmit + ESLint + generated-graph check + Vitest: must be green before you start
```

If it is red before your change, fix that first and say so in the changelog.

## 3. Apply the change and the stamps

1. Make the functional change. Calculation changes follow decision D7: they are **not** made in `app/` alone, see §6.
2. `cd app && npm version X.Y.Z --no-git-tag-version` (the only version edit), then `npm run docs:facts` (version and counts in the docs).
3. Add the changelog entry (§5) and update the prose of the docs of §1 if needed.

## 4. Checks

```bash
cd app
npm run check        # typecheck, lint (150-line rule, layer rules, no raw HTML), all tests
npm run build        # tsc --noEmit + vite build -> app/dist/index.html
```

`npm run check` includes: the generated dependency graph check (`npm run deps:check`: when the code's imports or `@calc-zone` tags changed, run `npm run deps:gen` and commit `app/src/generated/dependencies.json`), the oracle test on every fixture case, controller and persistence tests, section parity tests, the command
registry test (every command has a label, a sample and round-trips through undo/redo), the property-based undo test, the lint-rule and
file-size tests. It is the same sequence CI runs. The browser gates are not part of `npm run check`, so
after `npm run build`, run the browser gates on the built file from `app/` (Chromium needed): `npm run e2e` (smoke of every section on 6 case fixtures and 2 portfolio
files, then the performance budget), `node ../tools/ui-parity.mjs`, `npm run a11y`, `node ../tools/parallel-run.mjs`. Then finish with a short manual pass on the built file, opened from disk in Chrome or Edge:

- console clean; the KPI bar shows the golden figures (Y3 savings €891,555, NPV €1,359,010, payback 9 months) on the default case;
- Ctrl+Z / Ctrl+Y after an edit; Logic verification shows no failing check;
- *Save HTML snapshot*, reopen the saved file, the case is back; export and re-import the parameters workbook;
- after a calculation or persistence change, also open one legacy v18.x snapshot and one legacy workbook.

If a change is meant to move the golden case, see §6 (it starts in the legacy file) and state old → new figures in the changelog.

### 4.1 Duplication and test selection

* `npm run dup` (`app/scripts/dup.mjs`) fails when the share of duplicated code grows beyond the recorded baseline (`app/dup-baseline.json`): a new copy of an existing
  block is a second source of a number. It lowers its own threshold when the code gets better: after removing duplicates, run `npm run dup -- --update` and commit.
* `npm run test:affected` runs only the tests a change can reach ([TEST_SELECTION.md](TEST_SELECTION.md)). It is for the inner loop and optional PR feedback; **the
  release always runs the full suite** (`npm run check`), as CI does on `main`. After changing the generator, the tags or the rule, run `npm run validate:affected` (recall must be 100%).

## 5. Changelog and commit

`CHANGELOG.md`: newest first, header `## [vX.Y.Z] YYYY-MM-DD — title`; sections **New / Changed / Fixed**; a **Golden case** line
(unchanged, or old → new). Then:

```bash
git add -A
git commit -m "Release vX.Y.Z: <one-line summary>"
git push -u origin release/vX.Y.Z   # then open a pull request
```

## 6. Continuous integration and the artefact

`.github/workflows/app.yml` (job `check`, working directory `app`, Node 22) runs `npm ci`, `npm run deps:check`, `npm run dup`, `npm run check` and `npm run build` on pull
requests and on pushes to `main` that touch `app/**` or the workflow. It does not run the legacy tools, does not upload the build and
does not tag.

**The single-file artefact.** `npm run build` writes `app/dist/index.html` (`dist/` is git-ignored): one offline HTML file with
script and styles inlined by `vite-plugin-singlefile`, about 2.6 MB. `npm run build` does not put a version in its name; `npm run release` (`app/scripts/release.mjs`) does: it builds, reads the version
tag from the built page title (itself derived from `package.json`), fails if it is missing or does not match `package.json`, and copies the file to
`app/dist/AgentCase_<tag>_EN.html` (the legacy naming, and what the in-app file names use), for example `app/dist/AgentCase_v20_12_EN.html`, or
`AgentCase_v20_12_1_EN.html` for a patch release (attach it to the release; not committed). No tool or workflow hard-codes the name. Tag the
merge commit `vX.Y.Z` after merging; the commands for the releases before this rule are in [RELEASE_TAGS.md](RELEASE_TAGS.md).

## 7. The legacy file

`AgentCase_v18_13_EN.html` is the oracle of the migration and is **frozen** until cut-over. It may change in two cases only:

1. **Security fixes** (decision D6), for example an injection sink or an import-hardening hole.
2. **Deliberate calculation decisions** (decision D7): a change in the numbers is shipped in the legacy file first so that the oracle
   moves with it, then ported to `app/`. Examples: v18.11 (human share applied once), v18.12 (re-fit on regulatory changes, Monte Carlo
   above 3 years), v18.13 (strategies, Results and scenarios beyond or below 3 years).

Everything else (features, cosmetics) goes to `app/` only.

### 7.1 Changing the legacy file

Follow the archived procedure ([`history/BUMP_PROCEDURE_legacy_v18.md`](history/BUMP_PROCEDURE_legacy_v18.md)); in short:

1. `git mv AgentCase_v18_<N>_EN.html AgentCase_v18_<N+1>_EN.html`; apply the change with count-asserted edits.
2. Update the three stamps: `<title>`, footer `<strong>AgentCase vX.Y</strong>`, `VERSION: 'X.Y.0'` in `window.AgentCaseArch`; refresh
   `"savedAt"` in the baked boot snapshot; do not touch schema versions or historical tags.
3. `node tools/check.mjs --expect <X.Y>` (parse, stamps, markup balance; Node only).
4. `node tools/test-all.mjs --baseline <previous AgentCase_vX_Y_EN.html>` (needs Playwright + Chromium: `PLAYWRIGHT_BROWSERS_PATH`,
   `PW_MODULE` if needed). It runs check, smoke (golden figures against `tools/golden.json`), handlers, xss, state and render-diff.
   Add a regression test to `tools/state-test.mjs` for every fix; it must fail on the previous build.
5. If the golden case moves, update `tools/golden.json` (its `version` field too) and say so in `CHANGELOG.md`.
6. The `tools/` scripts pick the highest-numbered `AgentCase_v*_EN.html` at the repository root, so exactly one legacy file should be there.

### 7.2 Regenerating the oracle after a legacy change

Only after a deliberate calculation change (§7 case 2). Playwright + Chromium needed for all of them; run from the repository root.

| Step | Command | Writes |
|---|---|---|
| 1. Cases and expected results | `node tools/oracle.mjs [legacy.html]` (optionally `--only id,id`) | `app/fixtures/cases`, `expected`, `extras` |
| 2. Section text for parity | `node tools/section-text.mjs --sections all` (`--fixtures` to restrict) | `app/fixtures/sections` |
| 3. Snapshot fixtures | `node tools/snapshot-fixtures.mjs` | `app/fixtures/snapshots` |
| 4. Report fixtures | `node tools/report-fixtures.mjs` | `app/fixtures/reports` |
| 5. Workbook fixtures | `node tools/excel-oracle.mjs` and `node tools/excel-results-oracle.mjs` | `app/fixtures/xlsx`, `xlsx-results` |
| 6. Cross-check of the Excel import | `node tools/excel-compat.mjs` (needs `cd app && npm ci`) | report only |
| 7. Default case, when the golden fixture changed | `cd app && node scripts/make-default-doc.mjs` | `app/src/store/defaults/defaultDoc.json` |
| 8. Catalogues, only if a code-owned catalogue changed | `node tools/extract-catalog.mjs` | `app/src/domain/catalog/*.json` |

Then update `tools/golden.json` if the golden figures moved, port the change to `app/src/domain` (and controllers if inputs changed),
run `cd app && npm run check`, and review the fixture diff in git: the changed fixtures must be exactly the cases the decision
affects (v18.12 changed the regulated fixtures). Fixture files are generated; never edit them by hand.

### 7.3 Cut-over

At the cut-over release: remove `-dev` from the version stamps, tag `v19.0.0`, archive the legacy file under `docs/history/`
(`git mv`), and update README, the tools' default file lookup and this document, because the tools in §7.1 and §7.2 read the legacy
file from the repository root.

## 8. Checklist

- [ ] `npm ci && npm run check` green on the branch before the change
- [ ] `npm run deps:check` green (else `npm run deps:gen` and commit `app/src/generated/dependencies.json`); `npm run dup` green; new domain modules carry `@calc-zone` (and `@owner` for a figure they own)
- [ ] the **full** suite ran before the merge (`test:affected` is a development aid, never the release gate); `npm run validate:affected` after a change of the generator, tags or rule
- [ ] version: `npm version X.Y.Z --no-git-tag-version` (package.json and lock only), then `npm run docs:facts`
- [ ] calculation change? shipped in the legacy file first and the oracle regenerated (§7), golden line in the changelog
- [ ] `npm run check` and `npm run build` green; manual browser pass on `app/dist/index.html` (§4)
- [ ] `CHANGELOG.md` entry with a Golden case line; README and docs updated if relevant
- [ ] pull request merged with CI green; release copy made by `npm run release` (`AgentCase_vX_Y_EN.html`, or `AgentCase_vX_Y_Z_EN.html` for a patch); tag `vX.Y.Z` (and a row in RELEASE_TAGS.md)
- [ ] **All user-facing text is in English** (new labels, toasts, diagnostics, exports; vocabulary in [GLOSSARY_EN.md](GLOSSARY_EN.md)); `tests/ui/english-only.test.ts` is green
