#!/usr/bin/env node
// Runs the whole verification battery and prints one summary line per tool.
//   node tools/test-all.mjs [--baseline <older.html>]      (baseline: also run the render-equivalence diff)
// Needs Playwright + Chromium (see README). Exit code 1 if any step fails.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const argv = process.argv.slice(2);
const bi = argv.indexOf('--baseline'); const baseline = bi >= 0 ? argv[bi + 1] : null;
const file = readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort().pop();
const steps = [
  ['check (parse, stamps, markup)', ['tools/check.mjs']],
  ['smoke (boot, golden figures, AUDIT)', ['tools/smoke.mjs']],
  ['handlers (inline handler targets exist)', ['tools/handlers-test.mjs']],
  ['xss (4 injection passes)', ['tools/xss-test.mjs']],
  ['state (persistence, calculations, UI regressions)', ['tools/state-test.mjs']],
];
if (baseline) steps.push([`render-diff vs ${baseline}`, ['tools/render-diff.mjs', baseline, file]]);
let failed = 0;
for (const [name, args] of steps) {
  const t0 = Date.now();
  const r = spawnSync('node', args, { encoding: 'utf8', timeout: 900000, env: process.env });
  const ok = r.status === 0; if (!ok) failed++;
  const last = (r.stdout + r.stderr).trim().split('\n').filter(Boolean).slice(-1)[0] || '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} ${((Date.now() - t0) / 1000).toFixed(0)}s  ${ok ? '' : last.slice(0, 120)}`);
}
console.log(failed ? `\n${failed} step(s) failed` : `\nall ${steps.length} steps passed for ${file}`);
process.exit(failed ? 1 : 0);
