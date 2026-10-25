/**
 * Runs only the tests a change can affect (docs/TEST_SELECTION.md). Usage, from app/:
 *   npm run test:affected                         changed files = working tree against the merge base with origin/main
 *   npm run test:affected -- --base origin/main   changed files = git diff against that ref (plus untracked files)
 *   npm run test:affected -- --files src/domain/stress/sensitivity.ts,../docs/VUE_AGREGEE.md
 * Options: --level precise|zone|related (default zone), --dry (print the selection, run nothing), --list (print the test files).
 * The full suite stays mandatory before a merge or a release.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import { affected, lines, normalize, type Level } from './lib/select';

const arg = (name: string): string | undefined => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const git = (...a: string[]): string => execFileSync('git', a, { encoding: 'utf8' }).trim();
const root = process.cwd();

function changedFiles(): string[] {
  const files = arg('--files');
  if (files) return files.split(',').map((f) => normalize(f.trim())).filter(Boolean);
  const base = arg('--base') ?? (() => { try { return git('merge-base', 'origin/main', 'HEAD'); } catch { return 'HEAD'; } })();
  const top = git('rev-parse', '--show-toplevel');
  const names = [...git('diff', '--name-only', '--no-renames', base).split('\n'),
    ...git('ls-files', '--others', '--exclude-standard', top).split('\n')].filter(Boolean);
  return [...new Set(names.map((n) => normalize(relative(root, `${top}/${n}`))))].sort();
}

const level = (arg('--level') ?? 'zone') as Level;
if (!['precise', 'zone', 'related'].includes(level)) throw new Error(`unknown --level ${level}`);
const changed = changedFiles();
if (!changed.length) { console.log('no changed file: nothing to run.'); process.exit(0); }
const r = affected(root, changed, level);
console.log(lines(r).join('\n'));
if (process.argv.includes('--list')) console.log(r.selected.join('\n'));
if (process.argv.includes('--dry')) process.exit(0);
const args = r.full ? ['run'] : ['run', ...r.selected];
const res = spawnSync('npx', ['vitest', ...args, '--maxWorkers=3', '--testTimeout=90000'], { stdio: 'inherit' });
process.exit(res.status ?? 1);
