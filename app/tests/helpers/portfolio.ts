import { readdirSync, readFileSync } from 'node:fs';
import type { CaseState } from '@/domain';
import { envelopeCase, type KnowledgeSubset, type Overrides, type Portfolio, type Product } from '@/domain/portfolio';

export const FIXTURE_IDS = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
export const loadCase = (id: string): CaseState => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;
/** Relative closeness (the 1e-9 acceptance tolerance). */
export const close = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
export const expectClose = (a: number, b: number, tol = 1e-9): void => {
  if (!close(a, b, tol)) throw new Error(`${a} !~ ${b} (tol ${tol})`);
};
export const expectSeriesClose = (a: number[], b: number[], tol = 1e-9): void => {
  if (a.length !== b.length) throw new Error(`length ${a.length} != ${b.length}`);
  a.forEach((x, i) => { if (!close(x, b[i] as number, tol)) throw new Error(`index ${i}: ${x} !~ ${b[i]}`); });
};

export interface ProductSpec { id: string; waveId?: string | null; offset?: number; teamIn?: Product['teamIn']; overrides?: Overrides; knowledge?: KnowledgeSubset; name?: string }

/** Add a product (default: the case's team, wave w1) and list it in its wave. Pure. */
export function withProduct(pf: Portfolio, spec: ProductSpec): Portfolio {
  const base = pf.products[0] as Product, waveId = spec.waveId === undefined ? 'w1' : spec.waveId;
  const p: Product = { id: spec.id, name: spec.name ?? spec.id, teamIn: spec.teamIn ?? base.teamIn, knowledge: spec.knowledge ?? {}, overrides: spec.overrides ?? {}, waveId, offsetMonths: spec.offset ?? 0 };
  return { ...pf, products: [...pf.products, p], waves: pf.waves.map((w) => (w.id === waveId ? { ...w, productIds: [...w.productIds, p.id] } : w)) };
}

export const withWave = (pf: Portfolio, id: string, startMonth: number): Portfolio => ({ ...pf, waves: [...pf.waves, { id, name: id, startMonth, productIds: [] }] });

export const shiftWaves = (pf: Portfolio, k: number): Portfolio => ({ ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: w.startMonth + k })), horizonMonths: pf.horizonMonths + k });

/** N identical products (the case's team) in wave w1, starting at `start`. */
export function identical(c: CaseState, n: number, start = 0): Portfolio {
  let pf = envelopeCase(c);
  pf = { ...pf, waves: pf.waves.map((w) => ({ ...w, startMonth: start })), horizonMonths: pf.horizonMonths + start };
  for (let i = 2; i <= n; i++) pf = withProduct(pf, { id: 'p' + i });
  return pf;
}

/** Same case, scaled team so that each product has its own engine run (perf and isolation tests). */
export const scaledTeam = (c: CaseState, f: number): Product['teamIn'] => c.teamIn.map((r) => ({ ...r, etp: r.etp * f }));

/** The performance portfolio of spec 8: 20 distinct products (own team each) over 60 months in 4 waves. */
export function bigPortfolio(): Portfolio {
  const c = loadCase('horizon-5');
  let pf = envelopeCase(c);
  for (const [i, s] of [[2, 6], [3, 12], [4, 18]] as const) pf = withWave(pf, 'w' + i, s);
  pf = { ...pf, products: [{ ...pf.products[0]!, teamIn: scaledTeam(c, 0.5) }] };
  for (let i = 2; i <= 20; i++) pf = withProduct(pf, { id: 'p' + i, waveId: 'w' + (1 + (i % 4)), offset: i % 3, teamIn: scaledTeam(c, 0.5 + i / 10) });
  return { ...pf, waves: pf.waves.map((w) => ({ ...w, productIds: pf.products.filter((p) => p.waveId === w.id).map((p) => p.id) })) };
}

/** Best of `n` timings of `f` (ms): a budget on the best run does not fail on a loaded machine. */
export const bestOf = (n: number, f: () => void): number => {
  let m = Infinity;
  for (let i = 0; i < n; i++) { const t = performance.now(); f(); m = Math.min(m, performance.now() - t); }
  return m;
};
