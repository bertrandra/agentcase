# AgentCase — Test selection: the rule that avoids useless tests

> Applies to `app/`. The full suite is about 16,000 tests in about 240 files; most changes cannot affect most of them. `npm run test:affected` runs only
> the files a change can reach, derived from the generated dependency graph ([ARCHITECTURE.md §12](ARCHITECTURE.md)). It is a tool for the inner loop: **the full
> suite stays mandatory before a merge and before a release, and in CI on `main`.**

## 1. Commands

```bash
cd app
npm run test:affected                           # working tree against the merge base with origin/main
npm run test:affected -- --base origin/main     # changed files = git diff against that ref (+ untracked files)
npm run test:affected -- --files src/domain/stress/sensitivity.ts,../docs/VUE_AGREGEE.md
npm run test:affected -- --dry                  # print the selection, run nothing (--list prints the test files)
npm run test:affected -- --level precise        # only the tests whose import closure holds a changed file
npm run test:affected -- --level related        # also what `vitest related` would pick (barrels followed whole)
npm run validate:affected                       # mutation check of the rule (nightly CI job `affected`), see section 5
npm run validate:affected -- --only stress,rank # a sample: only the mutations of the modules whose path contains one of the words
```

The output is one reading line per step: `changed files (N) -> zones [...] -> sections [...]`, the downstream zones and sections, the reasons for a full run
if any, and `M of T test files selected (saved X%)` with the share contributed by each source.

## 2. The rule

1. **Map every changed file** (paths relative to `app/`; `../docs/x.md` for files outside it) to its calculation zone (the `@calc-zone` tag), to its section (the
   registries in `src/ui/sections/*.ts` and `aggregates/*.ts`), or to neither (a UI widget, a store core module, a JSON data file, a document).
2. **Full suite, and the reason printed**, when a changed file is outside the mapped graph: `package.json` and the lock file, `tsconfig.json`, the ESLint,
   Vite and Vitest configuration, `index.html`, `perf-budget.json`, `src/main.tsx`, `tests/helpers/**`, `fixtures/**`, `scripts/**`, `src/generated/**`,
   `src/domain/zones/catalog.json` and `graphConfig.json`, or any file the graph does not know. The same when the committed `dependencies.json` differs from
   the regenerated one (run `npm run deps:gen`).
3. **Select the tests** (`--level zone`, the default) that are the union of
   * the **contract tests**, always: size, lint rules, english-only, section scope, architecture facts, graph freshness, generator, zone tags, figure owners
     (`selection.contractTests` in `app/src/domain/zones/graphConfig.json`);
   * the tests whose **import closure holds a changed file** (what `vitest related` computes statically; barrels of `src/domain` are followed by symbol, and a
     data file a test names in a string literal counts as an import);
   * the tests whose **zone set** (the zones of every module in the closure, in `dependencies.json`) contains a touched zone, or whose section set contains a
     touched section.
4. **Full suite again** when a touched zone is `foundation` (types, context, inputs: imported everywhere) or when more than 60% of the test files are
   selected anyway (`selection.maxShare`): such a selection saves too little to be worth any risk.
5. **Never skip the full suite** before a merge or a release, in CI on `main`, or after touching anything in step 2.

Why the downstream zones and sections are printed but do not add tests: the import closure of a test is transitive, so a test that reaches a downstream module
already reaches the changed one. Since lot 4 the domain zone graph is acyclic (zone links per layer, re-exports and pure barrels are not uses), but a zone low in
the build order still feeds most of the others, so "downstream of the zone" would be most of the suite.
The downstream list is the reading aid ("what do I touch"), the closure is the guarantee.

`--level related` adds the tests `vitest related` selects. It follows every barrel file whole, so on this code base it selects about 90% of the files for any change
(measured: 217 of 244 for one stress module) and the 60% limit makes it the full suite. It is there for the case where a module-level side effect is suspected.

## 3. When to use it

| Moment | Command |
|---|---|
| Inner loop, a few edits | `npm run test:affected -- --level precise` |
| Before a commit | `npm run test:affected` |
| Pull request CI (optional, fast feedback) | `npm run test:affected -- --base origin/${GITHUB_BASE_REF}` plus the contract tests it always includes |
| Merge to `main`, release job, version bump | **the full suite** (`npm run check`) |

## 4. Where the numbers come from

`app/src/generated/dependencies.json` lists, for each test file, the zones and sections its import closure reaches. `app/scripts/gen-deps.ts` builds it
(TypeScript compiler API, syntax only, about 2 seconds); a test fails when the committed file is stale. The section *Dependencies* of the app shows the same
selection per zone and section (tab *Tests impacted*).

## 5. Validating the rule (recall)

`npm run validate:affected` (`app/scripts/validate-affected.ts`) mutates one module at a time in the working tree (a one-token change that moves numbers
or output, restored afterwards, even on error), runs the full suite, and checks that **every failing test file is in the selection** the rule computes for that
file (recall must be 100%). It prints the recall and the average saving per mode, and exits 1 on any miss (and 2 on a stale mutation, whose `find` text no
longer occurs once). It takes about 2 hours, so it is not a pull-request gate: the **nightly** workflow runs it in full (`.github/workflows/nightly.yml`, job
`affected`, time limit 3 h 45 min, recall lines in the job summary), and so does `npm run gates -- --nightly` locally (`--affected-only stress,rank` passes
`--only` for a sample). Run it yourself after changing the generator, the tags or the rule. Results of the last run are in the changelog entry of the release that introduced the rule.

**Last run (2026-10-24, lot 4, after the per-layer generator, the retagging and the split of verification / verdict): 19 mutations, 13 run, 6 select the full
suite anyway** (`velocityUplift.ts`, `costReduction.ts`, `knowledge.ts`, `store/history.ts`, `time/years.ts`, `economics/cashflow.ts`, so their recall is trivial):
**precise 100% recall (20/20 failing files), zone 100% (20/20)**, average saving 44% / 24% over the 19 modules. Four mutations were added for lot 4: the payback
rule of the cash-flow kernel, the pilot months of the cost model (`tune/program.ts`), the retagged `model/flow.ts` and `pdc/verifTeam.ts`; all were caught by
the selection. Run on a copy of the committed tree (`git archive`), `--maxWorkers=3`, about 2 h 10 min. No miss, so the selector is unchanged.

**Previous run (2026-10-23, 15 mutations, 10 checked, 5 select the full suite anyway):** precise 89.5% recall (17/19 failing files), zone 94.7% (18/19),
average saving 47% / 29%. Both misses were `tests/store/portfolio-controllers.test.ts`:
* `domain/portfolio/waveOps.ts`: a real miss. `controllers/wave.ts` imports the `domain/portfolio` barrel as a namespace (`import * as ops`), and the
  generator dropped the barrel's re-export edges, so the closure stopped at the barrel. Fixed: a barrel now keeps edges to what it re-exports (named
  imports still skip the barrel). The test is now selected at both levels.
* `domain/portfolio/aggVerifyKpi.ts`: not a miss. The test passes alone with that mutation; it failed in the run under load (flaky timing).

Do not use `test:affected` instead of the full suite before a merge or a release; it is a development aid.

## 6. Limits

* Coupling that is not an import and not a string-literal path (a test that builds a path, or reads a directory) is invisible to the closure. The directory
  walkers (`size`, `english-only`) are contract tests; a test that reads a new kind of data file should name it in a literal.
* A mutation that throws while a module loads would fail every test that imports the barrel; the rule follows barrels by symbol, so use `--level related`
  when you change the module-level code of a file that a folder barrel re-exports.

## 7. Duplication check: same numbers everywhere

`npm run dup` (`app/scripts/dup.mjs`, jscpd) is a gate of CI, so it must not depend on the machine. jscpd's detection is incremental — the first file that
holds a block owns it, the later ones are reported against it — so the clone count and the duplicated lines depend on the order in which files are read. Left to
its own glob, that order is the directory order of the file system: on the same tree, reading the files in other orders gave 25 to 27 clones and 174 to 211
lines, which is how a check could pass on a laptop and fail on a CI runner. The script therefore:

* lists the files itself — `git ls-files --cached --others --exclude-standard -- src tests`, `.ts` / `.tsx` only, never `generated/`, `dist/` or
  `node_modules/` — and sorts them by bytes; without git (an exported tree) it walks the same roots and sorts the same way;
* passes them to the installed jscpd (pinned to 4.0.5 in `package.json`) with every option explicit, including `maxLines` / `maxSize` large enough that no file
  is skipped silently;
* records the settings and the jscpd version in `app/dup-baseline.json` and refuses to compare against a baseline measured with other ones.

Untracked, non-ignored files are scanned too, so a new file is checked before it is committed; the CI checkout is a clean clone, where the two lists are the
same. A fresh clone + `npm ci` reports exactly the numbers of the working tree (checked when the script changed: 70 clones / 515 lines in 1,324 files).
