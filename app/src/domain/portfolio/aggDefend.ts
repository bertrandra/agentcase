/** @calc-zone aggregate-views */
import { assumptionRegister, type AssumptionBase, type Validated } from '../pdc/assumptions';
import { ceilingCoverage, ddRows, isDone, type DdDoc } from '../pdc/dd';
import { calcChain } from '../pdc/verifChain';
import { verifChecks } from '../pdc/verifChecks';
import { convergenceChecks } from '../pdc/verifConvergence';
import type { ConvRuntime } from '../pdc/verifConvTypes';
import { directionalSensitivity } from '../pdc/verifSensi';
import { overrideRefs } from './keys';
import { perProduct, type AggProduct } from './aggStress';
import { resolveProduct } from './resolve';
import type { Portfolio } from './types';

/**
 * Per-product defence of the case (assumptions register, logic verification, due diligence) for the aggregate view. Every count is read from the
 * section's own domain function on the product's effective case; the roll-up lines add the counts (never a rate) and the worst status.
 */
const validatedOf = (pf: Portfolio, id: string): Validated => ((resolveProduct(pf, id) as unknown as { assumptValidated?: Validated }).assumptValidated) ?? {};

/** Assumptions register: inputs at default, adjusted (and not validated), validated with the client; overrides held by the product. */
export type AssumptionRow = AggProduct & { inputs: number; atDefault: number; adjusted: number; validated: number; state: number; overrides: number };
export type AssumptionTotals = Omit<AssumptionRow, keyof AggProduct>;
export function assumptionsByProduct(pf: Portfolio, ids: string[], base: AssumptionBase): { rows: AssumptionRow[]; totals: AssumptionTotals } {
  const rows = perProduct(pf, ids, (c, p) => {
    const r = assumptionRegister(c, base, validatedOf(pf, p.id)), own = pf.products.find((x) => x.id === p.id);
    return { inputs: r.inputs.length, atDefault: r.nDefault, adjusted: r.nAdjusted, validated: r.nValidated, state: r.state.length, overrides: own ? overrideRefs(own.overrides).length : 0 };
  });
  const sum = (k: keyof AssumptionTotals): number => rows.reduce((a, r) => a + r[k], 0);
  return { rows, totals: { inputs: sum('inputs'), atDefault: sum('atDefault'), adjusted: sum('adjusted'), validated: sum('validated'), state: sum('state'), overrides: sum('overrides') } };
}

/** Logic verification: consistency checks (of 16), convergence rows (of 68), directional-sensitivity anomalies, ROI row of the calculation chain. */
export type VerifRow = AggProduct & { checks: number; checksFail: number; conv: number; convFail: number; failing: string[]; sensiAbnormal: number; roi: string; status: 'PASS' | 'FAIL' };
export type VerifTotals = { checks: number; checksFail: number; conv: number; convFail: number; sensiAbnormal: number; failingProducts: number; status: 'PASS' | 'FAIL' };
export function verifByProduct(pf: Portfolio, ids: string[], rt: ConvRuntime = {}): { rows: VerifRow[]; totals: VerifTotals } {
  const rows = perProduct(pf, ids, (c) => {
    const v = verifChecks(c), cv = convergenceChecks(c, rt), bad = cv.filter((k) => !k.pass), sensi = directionalSensitivity(c);
    const roi = calcChain(c).find((r) => (r[0] ?? '').startsWith('ROI'))?.[3] ?? 'n/a', fails = v.filter((k) => !k.ok).length;
    return { checks: v.length, checksFail: fails, conv: cv.length, convFail: bad.length, failing: bad.map((k) => k.id), sensiAbnormal: sensi.filter((s) => s.ok === false).length, roi, status: (fails + bad.length === 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' };
  });
  const sum = (k: 'checks' | 'checksFail' | 'conv' | 'convFail' | 'sensiAbnormal'): number => rows.reduce((a, r) => a + r[k], 0), failingProducts = rows.filter((r) => r.status === 'FAIL').length;
  return { rows, totals: { checks: sum('checks'), checksFail: sum('checksFail'), conv: sum('conv'), convFail: sum('convFail'), sensiAbnormal: sum('sensiAbnormal'), failingProducts, status: failingProducts ? 'FAIL' : 'PASS' } };
}

/** Due diligence: items to confirm, confirmed or waived, embedded coefficients editable nowhere (PC5), glass-ceiling coverage (null when no row carries a share). */
export interface DdGroup { group: string; items: number; confirmed: number }
export type DdProductRow = AggProduct & { items: number; confirmed: number; open: number; pct: number; invisible: number; ceilCover: number | null; groups: DdGroup[] };
export type DdTotals = { items: number; confirmed: number; open: number; pct: number; invisible: number };
export function dueDiligenceByProduct(pf: Portfolio, ids: string[], base: DdDoc & AssumptionBase): { rows: DdProductRow[]; totals: DdTotals } {
  const rows = perProduct(pf, ids, (c, p) => {
    const list = ddRows(c, base, validatedOf(pf, p.id)), done = list.filter((r) => isDone(c, r)).length;
    const by = new Map<string, DdGroup>();
    for (const r of list) { const g = by.get(r.g) ?? { group: r.g, items: 0, confirmed: 0 }; g.items++; if (isDone(c, r)) g.confirmed++; by.set(r.g, g); }
    return { items: list.length, confirmed: done, open: list.length - done, pct: list.length ? Math.round((done / list.length) * 100) : 0, invisible: list.filter((r) => r.id.startsWith('cf-') && r.edit === 'NONE').length, ceilCover: ceilingCoverage(c, list), groups: [...by.values()] };
  });
  const sum = (k: 'items' | 'confirmed' | 'open' | 'invisible'): number => rows.reduce((a, r) => a + r[k], 0), items = sum('items'), confirmed = sum('confirmed');
  return { rows, totals: { items, confirmed, open: sum('open'), pct: items ? Math.round((confirmed / items) * 100) : 0, invisible: sum('invisible') } };
}
