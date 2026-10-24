#!/usr/bin/env node
// Every quality gate of CI, run locally in the same order, with a summary table: a contributor reproduces CI before pushing.
//   npm run gates                      (from app/) the pull-request gates of .github/workflows/app.yml: job check, then jobs e2e and browser
//   npm run gates -- --nightly         the nightly gates of .github/workflows/nightly.yml (jobs suite and affected; validate:affected takes hours)
//   options: --only name,name  --from name  --keep-going (do not stop at the first failure)  --install (also run `npm ci` and the Playwright install,
//            which CI needs on a fresh runner)  --affected-only stress,rank (sample of validate:affected: `-- --only ...`)  --list (print the steps)
// The steps are written here once and checked against the workflows on every run (step `workflow-sync`): a `run:` line added to, removed from or
// reordered in a workflow without the same change here fails, and so does the reverse. A step already run with the same command in this invocation
// (the build of each CI job) is reused, not repeated. Artifacts go to test-results/ (git-ignored), as in CI. Writes the table to $GITHUB_STEP_SUMMARY when set.
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || ''), has = (n) => args.includes(n);
const nightly = has('--nightly');
const s = (job, name, cmd, extra = {}) => ({ job, name, cmd, cwd: 'app', ...extra }), r = (job, name, cmd, extra = {}) => s(job, name, cmd, { cwd: '.', ...extra });
const install = (job) => [s(job, 'npm ci', 'npm ci', { ci: true }), s(job, 'playwright install', 'npx playwright install --with-deps chromium', { ci: true })];

/** The pull-request / main gates: .github/workflows/app.yml, job by job, step by step (working directory app/ unless cwd '.'). */
const PR = [
  s('check', 'npm ci', 'npm ci', { ci: true }),
  s('check', 'audit', 'npm audit --omit=dev --audit-level=moderate'),
  s('check', 'deps:check', 'npm run deps:check'),
  s('check', 'dup', 'npm run dup'),
  s('check', 'check', 'npm run check'),
  s('check', 'build', 'npm run build'),
  ...install('e2e'), s('e2e', 'build', 'npm run build'),
  r('e2e', 'e2e-smoke', 'node tools/e2e-smoke.mjs'),
  r('e2e', 'e2e-flows', 'node tools/e2e-flows.mjs'),
  r('e2e', 'perf', 'node tools/perf.mjs'),
  r('e2e', 'parallel-run', 'node tools/parallel-run.mjs'),
  ...install('browser'), s('browser', 'build', 'npm run build'),
  r('browser', 'ui-parity', 'node tools/ui-parity.mjs --shots test-results/ui-parity'),
  r('browser', 'a11y golden', 'node tools/a11y.mjs --fixtures golden --report test-results/a11y/golden.json --shots test-results/a11y/golden'),
  r('browser', 'a11y pf-three-products', 'node tools/a11y.mjs --fixtures pf-three-products --report test-results/a11y/pf-three-products.json --shots test-results/a11y/pf-three-products'),
  r('browser', 'a11y golden dark', 'node tools/a11y.mjs --fixtures golden --mode dark --report test-results/a11y/golden-dark.json --shots test-results/a11y/golden-dark'),
  r('browser', 'a11y golden dark high', 'node tools/a11y.mjs --fixtures golden --mode dark --contrast high --report test-results/a11y/golden-dark-high.json --shots test-results/a11y/golden-dark-high'),
];
/** The nightly gates: .github/workflows/nightly.yml. */
const NIGHTLY = [
  ...install('suite'), s('suite', 'build', 'npm run build'),
  r('suite', 'check ×3', 'node tools/check-repeat.mjs --runs 3'),
  r('suite', 'test count', 'node tools/check-repeat.mjs --count-tests --tolerance 2'),
  r('suite', 'parallel-run full', 'node tools/parallel-run.mjs --corpus full'),
  s('suite', 'audit', 'npm audit --omit=dev'),
  s('affected', 'npm ci', 'npm ci', { ci: true }),
  s('affected', 'validate:affected', 'npm run validate:affected'),
];
const STEPS = nightly ? NIGHTLY : PR, workflow = nightly ? '.github/workflows/nightly.yml' : '.github/workflows/app.yml';

/** The single-line `run:` commands of each job of a workflow (multi-line `run: |` blocks are reporting, not gates). */
function workflowRuns(file) {
  const out = []; let job = '';
  for (const line of readFileSync(resolve(root, file), 'utf8').split('\n')) {
    const j = /^ {2}([\w-]+):\s*$/.exec(line); if (j) { job = j[1]; continue; }
    const m = /^\s*(?:- )?run:\s*(.+?)\s*(?:#.*)?$/.exec(line);
    if (m && job && m[1] !== '|' && m[1] !== '>') out.push(`${job}: ${m[1]}`);
  }
  return out;
}
function workflowSync() {
  const want = STEPS.map((x) => `${x.job}: ${x.cmd}`), got = workflowRuns(workflow);
  if (want.join('\n') === got.join('\n')) return 0;
  console.log(`workflow-sync: the steps of tools/gates.mjs and the run: lines of ${workflow} differ (update both, in the same order)`);
  for (let i = 0; i < Math.max(want.length, got.length); i++) if (want[i] !== got[i]) console.log(`  #${i + 1}  gates: ${want[i] ?? '(none)'}\n       workflow: ${got[i] ?? '(none)'}`);
  return 1;
}

if (has('--list')) { for (const x of STEPS) console.log(`${x.job.padEnd(9)} ${x.name.padEnd(24)} (${x.cwd === '.' ? 'root' : 'app'}) ${x.cmd}${x.ci ? '   [CI only; --install]' : ''}`); process.exit(0); }
const only = opt('--only').split(',').filter(Boolean), from = opt('--from'), sample = opt('--affected-only');
const rows = [], done = new Set();
let failed = 0, started = !from;
const fmt = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s` : `${sec} s`);
const t0 = Date.now(), syncCode = workflowSync();
rows.push({ job: '-', name: 'workflow-sync', status: syncCode ? 'FAIL' : 'pass', sec: 0 }); if (syncCode) failed++;
for (const x of STEPS) {
  if (from && x.name === from) started = true;
  const key = `${x.cwd}|${x.cmd}`;
  let status = '';
  if (!started || (only.length && !only.includes(x.name))) status = 'skipped';
  else if (x.ci && !has('--install')) status = 'skipped (CI only)';
  else if (done.has(key)) status = 'reused';
  else if (failed && !has('--keep-going')) status = 'not run';
  if (status) { rows.push({ job: x.job, name: x.name, status, sec: 0 }); continue; }
  const cmd = x.name === 'validate:affected' && sample ? `${x.cmd} -- --only ${sample}` : x.cmd;
  console.log(`\n=== [${x.job}] ${x.name}: ${cmd} ===`);
  const t = Date.now(), res = spawnSync(cmd, { cwd: resolve(root, x.cwd), stdio: 'inherit', shell: true });
  const ok = res.status === 0; if (ok) done.add(key); else failed++;
  rows.push({ job: x.job, name: x.name, status: ok ? 'pass' : `FAIL (exit ${res.status ?? res.signal})`, sec: Math.round((Date.now() - t) / 1000) });
}
const table = ['| Job | Gate | Result | Time |', '|---|---|---|---|', ...rows.map((x) => `| ${x.job} | ${x.name} | ${x.status} | ${x.sec ? fmt(x.sec) : ''} |`)].join('\n');
console.log(`\n${nightly ? 'Nightly' : 'Pull-request'} gates (${workflow}), ${fmt(Math.round((Date.now() - t0) / 1000))}:\n${table}\n${failed ? `${failed} gate(s) failed` : 'all gates green'}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Gates\n\n${table}\n`);
process.exit(failed ? 1 : 0);
