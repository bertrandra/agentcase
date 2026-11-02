/** @calc-zone stress */
import { scopeKey, scopeMembers, type GroupScope } from './scopeGroup';
import { corr3, statsOf, sumDraws } from './stress';
import type { Diversification, PfStress, ProductStress, StressStats, WaveStress } from './stressTypes';
import type { Portfolio } from './types';

/** A product of a selection with the correlation of its draws with the selection's draws (`rSel`: the portfolio's `r`, a wave's `rWave`). */
export type SelectionProduct = ProductStress & { rSel: number };

/** The last portfolio run read for a selection: the Portfolio, one Wave or one Unit of the organisation tree (B10d, D-B40). */
export interface SelectionStress {
  label: string;
  stats: StressStats;
  products: SelectionProduct[];
  /** the waves of the selection: every wave for the portfolio, the wave itself for a wave, none for a unit (a wave can span units) */
  waves: WaveStress[];
  /** risk reduction on the downside (P10) of the selection: its P10 minus the sum of its products' stand-alone P10 */
  diversification: Diversification;
  /** sorted net-benefit draws of the selection (its products added draw by draw) */
  outcomes: number[];
  /** the run's one correlation ρ (the common shock of every product's drivers) */
  rho: number;
  /**
   * the selection's implied average pairwise correlation of its products' net benefits (FX-D2): (Var(sum) − Σ Var_i) / (2 Σ_{i<j} sd_i sd_j), read
   * from the run's draws; null with fewer than two products or no spread. A view only: it differs from ρ because ρ acts on the drivers, not on the net
   * benefits; nothing reads it back.
   */
  impliedRho: number | null;
}

const variance = (xs: readonly number[]): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, x) => a + x, 0) / xs.length;
  return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1);
};

/** The implied average pairwise correlation of `cols` given their draw-by-draw sum (`sum`, any order: the variance does not read the order). */
export function impliedCorrelation(cols: readonly (readonly number[])[], sum: readonly number[]): number | null {
  if (cols.length < 2) return null;
  const vars = cols.map(variance), sumVar = vars.reduce((a, v) => a + v, 0), sumSd = vars.reduce((a, v) => a + Math.sqrt(v), 0);
  const den = sumSd * sumSd - sumVar;
  if (!(den > 1e-9)) return null;
  const r = (variance(sum) - sumVar) / den;
  return Math.round(Math.max(-1, Math.min(1, r)) * 1000) / 1000;
}

const withImplied = (run: PfStress, sel: Omit<SelectionStress, 'rho' | 'impliedRho'>): SelectionStress =>
  ({ ...sel, rho: run.rho, impliedRho: impliedCorrelation(sel.products.map((p) => p.perDraw), sel.outcomes) });

const diversificationOf = (products: ProductStress[], stats: StressStats): Diversification => {
  const sumP10 = products.reduce((a, p) => a + p.stats.p10, 0);
  return { sumP10, p10: stats.p10, reduction: stats.p10 - sumP10 };
};

/**
 * A unit's distribution: the draws of its planned products (members by `scopeMembers`, the one owner of "a set of products") added draw by draw in
 * the run's (portfolio) order with the same `sumDraws` and statistics (`statsOf`, i.e. `mcStats`) as the portfolio and the waves. So a unit owning
 * every product gives the portfolio's distribution exactly, and a unit with the products of a wave gives that wave's. Nothing is drawn again: the
 * products' draws come from their own streams (`productSeed`), whatever group they are added in.
 */
function unitSelection(pf: Portfolio, run: PfStress, scope: GroupScope): Omit<SelectionStress, 'rho' | 'impliedRho'> | null {
  const m = scopeMembers(pf, scope);
  if (!m) return null;
  const ids = new Set(m.planned), mine = run.products.filter((p) => ids.has(p.id));
  if (!mine.length) return null;
  const sum = sumDraws(mine.map((p) => p.perDraw), run.draws), { sorted, stats } = statsOf(sum, run.seed);
  const products = mine.map((p) => ({ ...p, rSel: corr3(p.perDraw, sum) }));
  return { label: m.label, stats, products, waves: [], diversification: diversificationOf(mine, stats), outcomes: sorted };
}

function build(run: PfStress, group: GroupScope, pf?: Portfolio): SelectionStress | null {
  const sel = buildSel(run, group, pf);
  return sel && withImplied(run, sel);
}

function buildSel(run: PfStress, group: GroupScope, pf?: Portfolio): Omit<SelectionStress, 'rho' | 'impliedRho'> | null {
  if (group.kind === 'portfolio') return { label: 'Portfolio', stats: run.stats, products: run.products.map((p) => ({ ...p, rSel: p.r })), waves: run.waves,
    diversification: run.diversification, outcomes: run.outcomes };
  if (group.kind === 'unit') return pf ? unitSelection(pf, run, group) : null;
  const wave = run.waves.find((w) => w.id === group.id), products = run.products.filter((p) => p.waveId === group.id);
  if (!wave || !products.length) return null;
  return { label: wave.name, stats: wave.stats, products: products.map((p) => ({ ...p, rSel: p.rWave })), waves: [wave],
    diversification: diversificationOf(products, wave.stats), outcomes: wave.outcomes };
}

const memo = new WeakMap<PfStress, WeakMap<object, Map<string, SelectionStress | null>>>();
const NO_PF = {};

/**
 * THE OWNER of the Monte Carlo figures of a selection (Portfolio, Wave or Unit; B10d): read from the last portfolio run, never drawn again — switching
 * the display scope recomputes nothing but this sum. A unit needs the portfolio (its members); null for a wave or a unit without a product in the run,
 * or unknown. Memoised on the run and the portfolio.
 */
export function selectionStress(run: PfStress, group: GroupScope, pf?: Portfolio): SelectionStress | null {
  let byPf = memo.get(run);
  if (!byPf) { byPf = new WeakMap(); memo.set(run, byPf); }
  const k = group.kind === 'unit' && pf ? pf : NO_PF;
  let m = byPf.get(k);
  if (!m) { m = new Map(); byPf.set(k, m); }
  const key = scopeKey(group);
  if (!m.has(key)) m.set(key, build(run, group, pf));
  return m.get(key) ?? null;
}
