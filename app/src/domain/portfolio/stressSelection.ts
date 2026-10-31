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
}

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
function unitSelection(pf: Portfolio, run: PfStress, scope: GroupScope): SelectionStress | null {
  const m = scopeMembers(pf, scope);
  if (!m) return null;
  const ids = new Set(m.planned), mine = run.products.filter((p) => ids.has(p.id));
  if (!mine.length) return null;
  const sum = sumDraws(mine.map((p) => p.perDraw), run.draws), { sorted, stats } = statsOf(sum, run.seed);
  const products = mine.map((p) => ({ ...p, rSel: corr3(p.perDraw, sum) }));
  return { label: m.label, stats, products, waves: [], diversification: diversificationOf(mine, stats), outcomes: sorted };
}

function build(run: PfStress, group: GroupScope, pf?: Portfolio): SelectionStress | null {
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
