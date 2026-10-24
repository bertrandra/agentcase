import { expect } from 'vitest';
import type { CostModel, CostRow, CostTable } from '@/domain/portfolio';

export const TOL = 1e-6;
export const cells = (r: CostRow): (number | null)[] => [r.t0, ...r.months];
export const nz = (x: number | null | undefined): number => x ?? 0;
export const byProduct = (t: CostTable, product: string): CostRow[] => t.rows.filter((r) => r.keys[2] === product);
export const byLine = (t: CostTable, product: string, line: string): CostRow => {
  const r = t.rows.find((x) => x.keys[2] === product && x.keys[4] === line);
  if (!r) throw new Error(`no row ${product} / ${line}`);
  return r;
};

/**
 * Every "difference" row of the Rate cards and Other costs tabs is 0 (t0 and every month), and every formula's cached value equals its recomputation
 * from the rows it names.
 */
export function expectChecksZero(m: CostModel): number {
  let n = 0;
  for (const t of [m.rates, m.other]) for (const r of t.rows.filter((x) => x.role === 'diff')) { n++; for (const x of cells(r)) expect(Math.abs(nz(x))).toBeLessThanOrEqual(TOL); }
  return n;
}

/** Cached values of the sum / difference formulas equal what Excel would compute. */
export function expectFormulasConsistent(t: CostTable): void {
  for (const r of t.rows) {
    const f = r.f;
    if (!f) continue;
    const at = (row: CostRow, j: number): number => nz(j < 0 ? row.t0 : row.months[j]);
    for (let j = -1; j < r.months.length; j++) {
      const got = j < 0 ? r.t0 : r.months[j];
      if (f.k === 'sum') { const s = f.rows.reduce((a, i) => a + at(t.rows[i]!, j), 0); expect(Math.abs(nz(got) - s)).toBeLessThanOrEqual(TOL); }
      if (f.k === 'diff') expect(Math.abs(nz(got) - (at(t.rows[f.a]!, j) - at(t.rows[f.b]!, j)))).toBeLessThanOrEqual(TOL);
    }
  }
}
