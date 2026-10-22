import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import deps from '@/generated/dependencies.json';
import { buildDeps, DEPS_FILE, formatDeps, STALE_MESSAGE } from '../../scripts/lib/build';

describe('generated dependency graph', () => {
  it('is up to date with the code (the message tells what to run)', () => {
    const fresh = formatDeps(buildDeps(process.cwd()));
    if (readFileSync(DEPS_FILE, 'utf8') !== fresh) throw new Error(STALE_MESSAGE);
    expect(STALE_MESSAGE).toContain('npm run deps:gen');
  }, 90000);
  it('stays small (it ships in the single-file build)', () => {
    expect(readFileSync(DEPS_FILE, 'utf8').length).toBeLessThan(150 * 1024);
  });
  it('is self-consistent: edges name known nodes, every zone has modules, every figure has an owner', () => {
    const ids = new Set([...deps.zones.map((z) => z.id), ...deps.sections.map((s) => s.id)]);
    expect(ids.size).toBe(deps.zones.length + deps.sections.length);
    expect(deps.edges.filter((e) => !ids.has(e[0]) || !ids.has(e[1]))).toEqual([]);
    expect(deps.zones.filter((z) => z.modules === 0)).toEqual([]);
    expect(deps.figures.filter((f) => !f.owner)).toEqual([]);
    expect(deps.tests.length).toBe(deps.counts.tests);
  });
});
