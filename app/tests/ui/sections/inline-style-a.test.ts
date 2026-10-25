import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Decision D5 (lot 5b part A): the frame, baseline, scope, tune and verify sections style their markup with the classes of
 * src/ui/theme/sections-a.css. An inline `style` stays only for a value computed at render time (a place or a length on a calendar, a colour
 * resolved in JS), marked `dynamic:` on its line or within the three lines above. The ceiling is today's count:
 * a new inline style must be dynamic, and a removed one lowers it.
 */
const ROOT = join(process.cwd(), 'src/ui/sections');
const SCOPE = ['frame', 'baseline', 'scope', 'tune', 'tuneB', 'verify'];
const CEILING = 28;
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : [];
});

const styles = SCOPE.flatMap((g) => walk(join(ROOT, g))).flatMap((f) => {
  const lines = readFileSync(f, 'utf8').split('\n');
  const at = (i: number) => ({ at: `${f.slice(ROOT.length + 1)}:${i + 1}`, ctx: lines.slice(Math.max(0, i - 3), i + 1).join('\n') });
  return lines.flatMap((l, i) => (/style=\{/.test(l) ? [at(i)] : []));
});

describe('inline styles of the part A sections (decision D5)', () => {
  it('every inline style is a dynamic value and says so', () => {
    expect(styles.filter((s) => !/dynamic:/.test(s.ctx)).map((s) => s.at)).toEqual([]);
  });
  it(`at most ${CEILING} remain`, () => {
    expect(styles.length).toBeLessThanOrEqual(CEILING);
  });
});
