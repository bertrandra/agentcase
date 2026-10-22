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
npm run validate:affected                       # mutation check of the rule (not part of CI), see section 5
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
already reaches the changed one. On the real graph the zones form one cycle (see the Build order tab), so "downstream of any zone" would be every test.
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
file (recall must be 100%). It prints the recall and the average saving per mode. It takes tens of minutes and is not part of CI; run it after changing the
generator, the tags or the rule. Results of the last run are in the changelog entry of the release that introduced the rule.

## 6. Limits

* Coupling that is not an import and not a string-literal path (a test that builds a path, or reads a directory) is invisible to the closure. The directory
  walkers (`size`, `english-only`) are contract tests; a test that reads a new kind of data file should name it in a literal.
* A mutation that throws while a module loads would fail every test that imports the barrel; the rule follows barrels by symbol, so use `--level related`
  when you change the module-level code of a file that a folder barrel re-exports.
