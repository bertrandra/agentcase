/**
 * Mutation check of the test-selection rule (docs/TEST_SELECTION.md section 5). Not part of CI: it runs the full suite once per mutation.
 * For each sampled module: compute the selection, apply a one-token mutation that changes an output, run the FULL suite, restore the file, and
 * check that every failing test file is in the selection (recall must be 100%). Usage, from app/:
 *   npm run validate:affected [-- --only stress,rank --force]     --force also runs the mutations whose selection is the full suite (recall is trivial)
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MUTATIONS } from './lib/mutations';
import { affected, type Level } from './lib/select';

const root = process.cwd(), tmp = join(process.env.TMPDIR ?? '/tmp', `validate-affected-${process.pid}.json`);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const only = arg('--only')?.split(','), force = process.argv.includes('--force');
const LEVELS: Level[] = ['precise', 'zone'];
let restore: (() => void) | null = null;
for (const sig of ['SIGINT', 'SIGTERM', 'exit'] as const) process.on(sig, () => { restore?.(); if (sig !== 'exit') process.exit(130); });

function failingFiles(): string[] {
  const r = JSON.parse(readFileSync(tmp, 'utf8')) as { testResults: { name: string; status: string }[] };
  return r.testResults.filter((t) => t.status !== 'passed').map((t) => relative(root, t.name).replace(/\\/g, '/')).sort();
}

const rows: { file: string; failing: number; sel: Record<Level, number>; missed: Record<Level, string[]>; ran: boolean }[] = [];
for (const m of MUTATIONS.filter((x) => !only || only.some((o) => x.file.includes(o)))) {
  const path = join(root, m.file), orig = readFileSync(path, 'utf8');
  if (orig.split(m.find).length !== 2) { console.error(`stale mutation (find must occur once): ${m.file}`); process.exit(2); }
  const sels = Object.fromEntries(LEVELS.map((l) => [l, affected(root, [m.file], l)])) as Record<Level, ReturnType<typeof affected>>;
  const trivial = LEVELS.every((l) => sels[l].full);
  const row = { file: m.file, failing: 0, sel: { precise: sels.precise.selected.length, zone: sels.zone.selected.length } as Record<Level, number>, missed: { precise: [], zone: [] } as Record<Level, string[]>, ran: false };
  rows.push(row);
  if (trivial && !force) { console.log(`${m.file}: selection is the full suite, nothing to check`); continue; }
  restore = () => writeFileSync(path, orig);
  writeFileSync(path, orig.replace(m.find, m.replace));
  try {
    spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${tmp}`, '--maxWorkers=3', '--testTimeout=90000'], { stdio: 'ignore' });
    const failing = failingFiles();
    row.ran = true; row.failing = failing.length;
    for (const l of LEVELS) row.missed[l] = failing.filter((f) => !sels[l].selected.includes(f));
    console.log(`${m.file} (${m.why}): ${failing.length} failing files; precise ${row.sel.precise}/${sels.precise.total} missed ${row.missed.precise.length}; zone ${row.sel.zone}/${sels.zone.total} missed ${row.missed.zone.length}`);
  } finally { restore(); restore = null; }
  if (readFileSync(path, 'utf8') !== orig) throw new Error(`${m.file} was not restored`);
}
const ran = rows.filter((r) => r.ran), total = rows[0] ? affected(root, [], 'zone').total : 0;
for (const l of LEVELS) {
  const fail = ran.reduce((n, r) => n + r.failing, 0), miss = ran.reduce((n, r) => n + r.missed[l].length, 0);
  const saving = rows.reduce((n, r) => n + (total - r.sel[l]) / total, 0) / Math.max(1, rows.length);
  const line = `level ${l}: recall ${fail ? Math.round(((fail - miss) / fail) * 1000) / 10 : 100}% (${fail - miss}/${fail} failing files selected, ${ran.length} mutations run), average saving ${Math.round(saving * 100)}% over ${rows.length} modules`;
  console.log(line);
  ran.forEach((r) => r.missed[l].forEach((f) => console.log(`  MISSED ${f} (mutation of ${r.file})`)));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- validate:affected ${line}${ran.flatMap((r) => r.missed[l].map((f) => `\n  - MISSED ${f} (mutation of ${r.file})`)).join('')}\n`);   // the nightly job summary
}
process.exit(ran.some((r) => LEVELS.some((l) => r.missed[l].length)) ? 1 : 0);
