// Duplicate-code check: jscpd over the app's TypeScript sources, failing only on NEW duplication (the baseline is the current level, app/dup-baseline.json).
// A copy of a block is a second source of a number. Usage (from app/): npm run dup             compare with the baseline
//                                                                     npm run dup -- --update  record the current level (after removing duplicates)
//                                                                     npm run dup -- --list    print every clone, even when green
//
// Deterministic by construction (docs/TEST_SELECTION.md §Duplication): jscpd's detection is incremental (the first file that holds a block owns it),
// so its result depends on the order in which it reads files. Left to its own glob, that order is the directory order of the file system, which
// differs between a laptop and a CI runner (measured: 25 to 27 clones and 174 to 211 lines for the same tree). We therefore hand jscpd an explicit,
// byte-sorted list of the git-tracked sources (plus untracked, non-ignored ones, so a new file is checked before it is committed), never generated
// code, with every option pinned, and run the installed jscpd binary.
//
// The baseline holds the totals AND one fingerprint per clone (`clonePrints`): the two files (sorted) and a hash of the duplicated fragment with its
// whitespace collapsed, no line numbers, so moving a block or editing elsewhere in the file keeps its fingerprint. Any clone whose fingerprint is not
// in the baseline fails (counted with multiplicity), even when the totals stay at or under the baseline (one clone removed, another added).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

const BASELINE = 'dup-baseline.json';
const SETTINGS = { minTokens: 50, minLines: 5, maxLines: 10000, maxSize: '1mb', mode: 'mild', format: 'typescript,tsx', roots: ['src', 'tests'] };
const SOURCE = /\.tsx?$/, EXCLUDED = /(^|\/)(generated|dist|node_modules)\//;
const byBytes = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Sources in scope, relative to app/, sorted. Git when available (tracked + untracked-not-ignored),
 * else a walk of the roots (an exported tree without .git).
 */
export function sourceFiles(roots = SETTINGS.roots) {
  const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...roots], { encoding: 'utf8' });
  let files;
  if (git.status === 0) files = git.stdout.split('\0').filter(Boolean);
  else {
    files = [];
    const walk = (d) => {
      for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else files.push(relative('.', p).split(sep).join('/')); }
    };
    roots.forEach(walk);
  }
  return [...new Set(files)].filter((f) => SOURCE.test(f) && !EXCLUDED.test(f) && existsSync(f)).sort(byBytes);
}

function detect(files) {
  const out = mkdtempSync(join(tmpdir(), 'jscpd-'));
  const bin = join('node_modules', '.bin', process.platform === 'win32' ? 'jscpd.cmd' : 'jscpd');
  if (!existsSync(bin)) { console.error('jscpd is not installed (run npm ci)'); process.exit(1); }
  const args = ['--min-tokens', String(SETTINGS.minTokens), '--min-lines', String(SETTINGS.minLines), '--max-lines', String(SETTINGS.maxLines),
    '--max-size', SETTINGS.maxSize, '--mode', SETTINGS.mode, '--format', SETTINGS.format, '--reporters', 'json', '--output', out, '--silent', ...files];
  const run = spawnSync(bin, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (run.status !== 0) { console.error('jscpd failed'); process.exit(run.status ?? 1); }
  const report = JSON.parse(readFileSync(join(out, 'jscpd-report.json'), 'utf8'));
  rmSync(out, { recursive: true, force: true });
  return report;
}

const files = sourceFiles();
const report = detect(files);
const version = JSON.parse(readFileSync('node_modules/jscpd/package.json', 'utf8')).version;
const clones = report.duplicates.map((d) =>
  `${d.firstFile.name}:${d.firstFile.start} <-> ${d.secondFile.name}:${d.secondFile.start} (${d.lines} lines)`).sort(byBytes);
/** The stable identity of a clone: its two files (sorted) and the hash of its fragment, whitespace collapsed (no line numbers). */
const printOf = (d) => {
  const hash = createHash('sha256').update(String(d.fragment ?? '').replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
  return `${[d.firstFile.name, d.secondFile.name].sort(byBytes).join(' <-> ')} #${hash}`;
};
const prints = report.duplicates.map(printOf).sort(byBytes);
const now = { clones: report.statistics.total.clones, duplicatedLines: report.statistics.total.duplicatedLines, files: files.length, jscpd: version,
  ...SETTINGS, clonePrints: prints };
/** The entries of `a` not matched by one of `b` (multisets: a fingerprint twice in `a` and once in `b` leaves one). */
const minus = (a, b) => { const left = [...b]; return a.filter((x) => { const i = left.indexOf(x); if (i < 0) return true; left.splice(i, 1); return false; }); };
const printClones = () => clones.forEach((c) => console.error(`  ${c}`));

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify(now, null, 1)}\n`);
  console.log(`dup baseline recorded: ${now.clones} clones, ${now.duplicatedLines} duplicated lines in ${now.files} files (jscpd ${version})`);
} else {
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  console.log(`duplicates: ${now.clones} clones / ${now.duplicatedLines} lines in ${now.files} files (baseline ${base.clones} / ${base.duplicatedLines}, jscpd ${version})`);
  if (!Array.isArray(base.clonePrints)) { console.error('The baseline has no clone fingerprints: record them with `npm run dup -- --update` (after checking the clones with --list).'); process.exit(1); }
  const drift = Object.keys(SETTINGS).filter((k) => JSON.stringify(base[k]) !== JSON.stringify(SETTINGS[k])).concat(base.jscpd === version ? [] : ['jscpd']);
  if (drift.length) {
    console.error(`The baseline was recorded with other settings (${drift.join(', ')}): the numbers are not comparable. Re-measure with \`npm run dup -- --update\` in the same change.`);
    process.exit(1);
  }
  const added = minus(prints, base.clonePrints), gone = minus(base.clonePrints, prints);
  if (now.clones > base.clones || now.duplicatedLines > base.duplicatedLines || added.length) {
    console.error('New duplicated code. Reuse the existing owner of the block (see the @owner tags and docs/ARCHITECTURE.md section 13), or, if the copy is intended, record it with `npm run dup -- --update`.');
    if (added.length) { console.error(`Clone(s) not in the baseline (${added.length}):`); added.forEach((c) => console.error(`  ${c}`)); }
    console.error('All clones:');
    printClones();
    process.exit(1);
  }
  if (gone.length) console.log(`${gone.length} baseline clone(s) no longer found: lower the baseline with \`npm run dup -- --update\`.`);
  if (process.argv.includes('--list')) printClones();
  if (now.clones < base.clones
    || now.duplicatedLines < base.duplicatedLines) console.log('Less duplication than the baseline: lower it with `npm run dup -- --update`.');
}
