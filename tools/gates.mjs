#!/usr/bin/env node
// Every quality gate of CI, run locally in the same order, with a summary table: a contributor reproduces CI before pushing.
//   npm run gates                      (from app/) the pull-request gates of .github/workflows/app.yml: job check, then jobs e2e and browser
//   npm run gates -- --nightly         the nightly gates of .github/workflows/nightly.yml (jobs suite and affected; validate:affected takes hours)
//   options: --only name,name  --from name  --keep-going (do not stop at the first failure)  --install (also run `npm ci` and the Playwright install,
//            which CI needs on a fresh runner)  --affected-only stress,rank (sample of validate:affected: `-- --only ...`)  --list (print the steps)
// The steps are written here once and checked against the workflows on every run (step `workflow-sync`): a `run:` line added to, removed from or
// reordered in a workflow without the same change here fails, and so does the reverse; the step's `if:`, working directory and `timeout-minutes` are
// compared too (the timeout is CI's, not applied locally). A step already run with the same command in this invocation
// (the build of each CI job) is reused, not repeated. Artifacts go to test-results/ (git-ignored), as in CI. Writes the table to $GITHUB_STEP_SUMMARY when set.
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || ''), has = (n) => args.includes(n);
const nightly = has('--nightly');
const s = (job, name, cmd, extra = {}) => ({ job, name, cmd, cwd: 'app', ...extra }), r = (job, name, cmd, extra = {}) => s(job, name, cmd, { cwd: '.', ...extra });
const always = (timeout) => ({ if: 'success() || failure()', timeout: String(timeout) });
const XMLLINT = 'xmllint --version || (sudo apt-get update && sudo apt-get install -y --no-install-recommends libxml2-utils)';
const install = (job) => [s(job, 'npm ci', 'npm ci', { ci: true }), s(job, 'playwright install', 'npx playwright install --with-deps chromium', { ci: true })];

/** The pull-request / main gates: .github/workflows/app.yml, job by job, step by step (working directory app/ unless cwd '.'). */
const PR = [
  s('check', 'npm ci', 'npm ci', { ci: true }),
  s('check', 'xmllint', XMLLINT, { ci: true }),
  s('check', 'audit', 'npm audit --omit=dev --audit-level=moderate'),
  s('check', 'deps:check', 'npm run deps:check'),
  s('check', 'dup', 'npm run dup'),
  s('check', 'check', 'npm run check'),
  s('check', 'build', 'npm run build'),
  ...install('e2e'), s('e2e', 'build', 'npm run build'),
  r('e2e', 'e2e-smoke', 'node tools/e2e-smoke.mjs'),
  r('e2e', 'e2e-flows', 'node tools/e2e-flows.mjs'),
  r('e2e', 'e2e-bpmn-editor', 'node tools/e2e-bpmn-editor.mjs'),
  r('e2e', 'perf', 'node tools/perf.mjs'),
  r('e2e', 'parallel-run', 'node tools/parallel-run.mjs'),
  ...install('browser'), s('browser', 'build', 'npm run build'),
  r('browser', 'ui-parity', 'node tools/ui-parity.mjs --shots test-results/ui-parity', { timeout: '15' }),
  r('browser', 'a11y golden', 'node tools/a11y.mjs --fixtures golden --report test-results/a11y/golden.json --shots test-results/a11y/golden',
    always(10)),
  r('browser', 'a11y pf-three-products', 'node tools/a11y.mjs --fixtures pf-three-products --report test-results/a11y/pf-three-products.json --shots test-results/a11y/pf-three-products',
    always(15)),
  r('browser', 'a11y golden dark', 'node tools/a11y.mjs --fixtures golden --mode dark --report test-results/a11y/golden-dark.json --shots test-results/a11y/golden-dark',
    always(10)),
  r('browser', 'a11y golden dark high', 'node tools/a11y.mjs --fixtures golden --mode dark --contrast high --report test-results/a11y/golden-dark-high.json --shots test-results/a11y/golden-dark-high',
    always(10)),
];
/** The nightly gates: .github/workflows/nightly.yml. */
const NIGHTLY = [
  s('suite', 'npm ci', 'npm ci', { ci: true }), r('suite', 'xmllint', XMLLINT, { ci: true }),
  s('suite', 'playwright install', 'npx playwright install --with-deps chromium', { ci: true }), s('suite', 'build', 'npm run build'),
  r('suite', 'check ×3', 'node tools/check-repeat.mjs --runs 3', always(75)),
  r('suite', 'test count', 'node tools/check-repeat.mjs --count-tests --tolerance 2', always(15)),
  r('suite', 'parallel-run full', 'node tools/parallel-run.mjs --corpus full', always(30)),
  s('suite', 'audit', 'npm audit --omit=dev', { if: 'success() || failure()' }),
  s('affected', 'npm ci', 'npm ci', { ci: true }), s('affected', 'xmllint', XMLLINT, { ci: true }),
  s('affected', 'validate:affected', 'npm run validate:affected', { timeout: '225' }),
];
const STEPS = nightly ? NIGHTLY : PR, workflow = nightly ? '.github/workflows/nightly.yml' : '.github/workflows/app.yml';

/** The single-line `run:` steps of each job of a workflow (multi-line `run: |` blocks are reporting, not gates), with the step attributes that change
 *  what runs or where: `if:`, the effective working directory (the step's, else the job's `defaults.run.working-directory`, else the root) and
 *  `timeout-minutes`. */
function workflowRuns(file) {
  const out = []; let job = '', jobDir = '.', step = null;
  const flush = () => {
    const keep = step?.run && step.run !== '|' && step.run !== '>';
    if (keep) out.push({ job, cmd: step.run, cwd: step.wd ?? jobDir, if: step.if ?? '', timeout: step.timeout ?? '' });
    step = null;
  };
  for (const line of readFileSync(resolve(root, file), 'utf8').split('\n')) {
    const j = /^ {2}([\w-]+):\s*$/.exec(line); if (j) { flush(); job = j[1]; jobDir = '.'; continue; }
    const d = /^ {4}defaults:.*working-directory:\s*([\w./-]+)/.exec(line); if (d) { jobDir = d[1]; continue; }
    const m = /^ {6}(- )? {0,2}([\w-]+):\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (!m) continue;
    if (m[1]) { flush(); step = {}; }
    if (!step) continue;
    const [, , key, val] = m;
    if (key === 'run') step.run = val; else if (key === 'if') step.if = val;
    else if (key === 'working-directory') step.wd = val; else if (key === 'timeout-minutes') step.timeout = val;
  }
  flush();
  return out.map((x) => describe(x));
}
/** One comparable line per step: the gates.mjs side and the workflow side are both printed through it. */
const describe = (x) => `${x.job}: ${x.cmd}  [cwd ${x.cwd}${x.if ? `; if ${x.if}` : ''}${x.timeout ? `; timeout ${x.timeout} min` : ''}]`;
function workflowSync() {
  const want = STEPS.map((x) => describe({ ...x, timeout: x.timeout ?? '', if: x.if ?? '' })), got = workflowRuns(workflow);
  if (want.join('\n') === got.join('\n')) return 0;
  console.log(`workflow-sync: the steps of tools/gates.mjs and the run: steps of ${workflow} differ`
    + ' (command, if:, working directory or timeout-minutes; update both, in the same order)');
  for (let i = 0; i < Math.max(want.length, got.length); i++) if (want[i] !== got[i]) console.log(`  #${i + 1}  gates: ${want[i] ?? '(none)'}\n       workflow: ${got[i] ?? '(none)'}`);
  return 1;
}

if (has('--list')) { for (const x of STEPS) console.log(`${x.job.padEnd(9)} ${x.name.padEnd(24)} (${x.cwd === '.' ? 'root' : 'app'}) ${x.cmd}${x.ci ? '   [CI only; --install]' : ''}`); process.exit(0); }
const only = opt('--only').split(',').filter(Boolean), from = opt('--from'), sample = opt('--affected-only');
const rows = [], done = new Set();
let failed = 0, started = !from;
const fmt = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s` : `${sec} s`);
const t0 = Date.now(), syncCode = workflowSync();
// The BPMN XSD tests (app/tests/bpmn) skip locally without xmllint and fail in CI without it (decision D-B7): say so before the run.
if (spawnSync('xmllint', ['--version']).status !== 0) console.log('warning: xmllint is not installed (apt-get install libxml2-utils): the BPMN schema tests will be skipped locally');
rows.push({ job: '-', name: 'workflow-sync', status: syncCode ? 'FAIL' : 'pass', sec: 0 }); if (syncCode) failed++;
for (const x of STEPS) {
  if (from && x.name === from) started = true;
  const key = `${x.cwd}|${x.cmd}`;
  let status = '';
  if (!started || (only.length && !only.includes(x.name))) status = 'skipped';
  else if (x.ci && !has('--install')) status = 'skipped (CI only)';
  else if (done.has(key)) status = 'reused';
  // an `if: success() || failure()` step runs after a failure too, as in CI
  else if (failed && !has('--keep-going') && !/failure\(\)|always\(\)/.test(x.if ?? '')) status = 'not run';
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
