// Duplicate-code check: jscpd over app/src, failing only on NEW duplication (the baseline is the current level, app/dup-baseline.json).
// A copy of a block is a second source of a number. Usage (from app/): npm run dup        compare with the baseline
//                                                                     npm run dup -- --update    record the current level (after removing duplicates)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASELINE = 'dup-baseline.json', SETTINGS = { minTokens: 50, minLines: 5 };
const out = mkdtempSync(join(tmpdir(), 'jscpd-'));
const run = spawnSync('npx', ['jscpd', 'src', '--min-tokens', String(SETTINGS.minTokens), '--min-lines', String(SETTINGS.minLines), '--format', 'typescript,tsx',
  '--ignore', '**/generated/**,**/*.json', '--reporters', 'json', '--output', out, '--silent'], { stdio: 'inherit' });
if (run.status !== 0) { console.error('jscpd failed'); process.exit(run.status ?? 1); }
const report = JSON.parse(readFileSync(join(out, 'jscpd-report.json'), 'utf8'));
const now = { clones: report.statistics.total.clones, duplicatedLines: report.statistics.total.duplicatedLines, ...SETTINGS };
if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify(now, null, 1)}\n`);
  console.log(`dup baseline recorded: ${now.clones} clones, ${now.duplicatedLines} duplicated lines`);
} else {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  console.log(`duplicates: ${now.clones} clones / ${now.duplicatedLines} lines (baseline ${base.clones} / ${base.duplicatedLines})`);
  if (now.clones > base.clones || now.duplicatedLines > base.duplicatedLines) {
    console.error('New duplicated code. Reuse the existing owner of the block (see the @owner tags and docs/ARCHITECTURE.md section 13), or, if the copy is intended, record it with `npm run dup -- --update`. Clones:');
    for (const d of report.duplicates) console.error(`  ${d.lines} lines: ${d.firstFile.name}:${d.firstFile.start} <-> ${d.secondFile.name}:${d.secondFile.start}`);
    rmSync(out, { recursive: true, force: true });
    process.exit(1);
  }
}
rmSync(out, { recursive: true, force: true });
