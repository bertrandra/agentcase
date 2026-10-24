#!/usr/bin/env node
// Flake detection: runs `npm run check` (typecheck, lint, graph and docs checks, the FULL Vitest suite with its default timeouts) several times in a row
// in app/, keeps the JUnit report of each run (CI=true makes vite.config.ts write it) under app/test-results/check-runs/run-<n>.xml, and prints which
// test failed in which run: "flaky" when it failed in some runs only, "failing" when it failed in every run. Exit 1 when any run failed.
// Usage: node tools/check-repeat.mjs [--runs 3]
//        node tools/check-repeat.mjs --count-tests [--tolerance 2]   compare the documented test count (docs/ARCHITECTURE.md, fact:tests) with the
//            count of the last run's JUnit report (else runs the suite once); exit 1 when they differ by more than the tolerance (percent).
// Writes a Markdown summary to $GITHUB_STEP_SUMMARY when it is set (the nightly workflow).
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const app = resolve(new URL('..', import.meta.url).pathname, 'app'), runsDir = resolve(app, 'test-results/check-runs'), junit = resolve(app, 'test-results/vitest-junit.xml');
const args = process.argv.slice(2), opt = (n, d) => (args.indexOf(n) < 0 ? d : args[args.indexOf(n) + 1] ?? d);
const summary = (md) => { console.log(md); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); };
const unxml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The failed test cases of a JUnit file ("file > test name") and the total number of tests. */
function readJunit(file) {
  const xml = readFileSync(file, 'utf8'), failed = [];
  for (const m of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
    if (!/<(failure|error)\b/.test(m[3] ?? '')) continue;
    const at = (k) => unxml(new RegExp(`\\b${k}="([^"]*)"`).exec(m[1])?.[1] ?? '');
    failed.push(`${at('classname')} > ${at('name')}`);
  }
  return { failed, total: Number(/<testsuites\b[^>]*\btests="(\d+)"/.exec(xml)?.[1] ?? NaN) };
}

if (args.includes('--count-tests')) {
  const tolerance = Number(opt('--tolerance', '2')), last = existsSync(runsDir) ? readdirSync(runsDir).filter((f) => /^run-\d+\.xml$/.test(f)).sort().pop() : undefined;
  let file = last && resolve(runsDir, last);
  if (!file) { spawnSync('npx', ['vitest', 'run'], { cwd: app, stdio: 'inherit', env: { ...process.env, CI: 'true' } }); file = junit; }
  const { total } = readJunit(file), doc = readFileSync(resolve(app, '../docs/ARCHITECTURE.md'), 'utf8');
  const documented = Number((/<!-- fact:tests -->([\d,]+)<!-- \/fact -->/.exec(doc)?.[1] ?? '').replace(/,/g, '')), off = Math.abs(total - documented) / documented * 100;
  const ok = Number.isFinite(off) && off <= tolerance;
  summary(`### Documented test count\n\n${ok ? 'OK' : 'STALE'}: the suite has ${total.toLocaleString('en-US')} tests, the docs say about ${documented.toLocaleString('en-US')} (${off.toFixed(1)} % off, tolerance ${tolerance} %).` +
    (ok ? '' : ' Run `cd app && npm run docs:facts -- --count-tests` and commit the docs.') + '\n');
  process.exit(ok ? 0 : 1);
}

const runs = Number(opt('--runs', '3')), results = [];
rmSync(runsDir, { recursive: true, force: true }); mkdirSync(runsDir, { recursive: true });
for (let i = 1; i <= runs; i++) {
  rmSync(junit, { force: true });
  console.log(`\n=== npm run check, run ${i} of ${runs} ===`);
  const t0 = Date.now(), r = spawnSync('npm', ['run', 'check'], { cwd: app, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  const res = { run: i, code: r.status ?? 1, seconds: Math.round((Date.now() - t0) / 1000), failed: [], total: NaN, suite: existsSync(junit) };
  if (res.suite) { copyFileSync(junit, resolve(runsDir, `run-${i}.xml`)); Object.assign(res, readJunit(junit)); }
  results.push(res);
}
const byTest = new Map();
for (const r of results) for (const t of r.failed) byTest.set(t, [...(byTest.get(t) ?? []), r.run]);
const lines = ['### `npm run check` × ' + runs, '', '| Run | Result | Tests | Failed tests | Time |', '|---|---|---|---|---|'];
for (const r of results) lines.push(`| ${r.run} | ${r.code ? 'FAIL' : 'pass'} | ${Number.isFinite(r.total) ? r.total : '-'} | ${r.suite ? r.failed.length : (r.code ? 'failed before the suite (typecheck / lint / deps / docs check)' : '-')} | ${Math.floor(r.seconds / 60)} min ${r.seconds % 60} s |`);
if (byTest.size) {
  lines.push('', '| Test | Failed in run(s) | Kind |', '|---|---|---|');
  for (const [t, rs] of [...byTest].sort()) lines.push(`| ${t.replace(/\|/g, '\\|')} | ${rs.join(', ')} | ${rs.length === runs ? 'failing' : 'flaky'} |`);
}
summary(lines.join('\n') + '\n');
process.exit(results.some((r) => r.code) ? 1 : 0);
