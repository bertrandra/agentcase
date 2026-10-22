import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx, model, type CaseState } from '@/domain';
import { costReduction } from '@/domain/economics/costReduction';
import { headline } from '@/domain/economics/headline';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => makeCtx(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState);

describe('saving in % over the project time', () => {
  it.each(ids)('%s: net share of the baseline over the horizon, the legacy costReduction3y at horizon 3', (id) => {
    const c = load(id), m = model(c), cr = costReduction(c), h = headline(c);
    expect(cr.years).toBe(m.horizon);
    if (!cr.ok) return;
    expect(cr.net * cr.base).toBeCloseTo(h.net, 4);                       // same net as the one headline owner
    if (m.horizon === 3) expect(cr.net).toBeCloseTo((m.yearSav.reduce((a, b) => a + b, 0) - m.setupTotal) / (m.baselineRun * 3), 9);   // legacy formula
    expect(cr.gross).toBeGreaterThanOrEqual(cr.net - 1e-9 * Math.abs(cr.net));
  });
});
