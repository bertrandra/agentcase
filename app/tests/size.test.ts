import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// One test for the whole tree, not one per file (~1,400 generated cases inflated the documented test count); a failure lists every offender.
describe('G2 — no code file over 150 lines', () => {
  const files = [...walk('src'), ...walk('tests')].filter((f) => /\.(ts|tsx)$/.test(f));
  it('every .ts / .tsx file of src/ and tests/ has at most 150 lines', () => {
    expect(files.length).toBeGreaterThan(0);
    const lines = (f: string) => readFileSync(f, 'utf8').split('\n').length;   // a final newline adds one empty piece: 151 pieces = 150 lines
    expect(files.filter((f) => lines(f) > 151).map((f) => `${f}: ${lines(f) - 1} lines`)).toEqual([]);
  });
});
