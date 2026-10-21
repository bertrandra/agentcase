import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('G2 — no code file over 150 lines', () => {
  const files = [...walk('src'), ...walk('tests')].filter((f) => /\.(ts|tsx)$/.test(f));
  it('has files to check', () => expect(files.length).toBeGreaterThan(0));
  it.each(files)('%s', (f) => {
    expect(readFileSync(f, 'utf8').split('\n').length).toBeLessThanOrEqual(151);
  });
});
