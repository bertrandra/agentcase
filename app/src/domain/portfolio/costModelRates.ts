/** @calc-zone exports */
import { BANDS } from '../baseline/skills';
import { targetMix } from '../baseline/locStrat';
import { LOCATIONS } from '../catalog';
import { rateFor } from '../location';
import { lay, type Picked } from './costModelAxis';
import { addRows, dotRows, row, subRows } from './costModelRow';
import type { CostRow, CostTable, RateCardBlock } from './costModelTypes';
import type { ValuesIndex } from './costModelValues';

export const RATE_HEADS = ['Portfolio', 'Wave', 'Product', 'Group', 'Skill', 'Grade', 'Location'];
export const G_RATE = 'Applied day rate', G_CHECK = 'Team cost check';

/** Where a product's team-cost check sits in the Rate cards table. */
export interface RatesIndex { table: CostTable; check: Map<string, number>; card: RateCardBlock; mix: RateCardBlock }

const wave = (pk: Picked, id: string): string => pk.waves.find((w) => w.id === id)?.name ?? '';

/** Day-rate table by location x grade band (the case's RATE, as the engine reads it through `rateFor`). */
function rateCard(pk: Picked): RateCardBlock {
  const s = pk.views[0]!.run.ctx.s;
  return { heads: ['Location', 'Class', ...BANDS.map(([, label]) => `${label} (EUR/day)`)],
    rows: LOCATIONS.map((l) => [l.name, l.cls, ...BANDS.map(([b]) => rateFor(s, l.name, b))]) };
}

/**
 * TAB 2: the applied day rate of every AS-IS team line each month, the blending adjustment to the engine's single target rate, and the team-cost
 * check per product.
 */
export function buildRates(pk: Picked, L: number, vals: ValuesIndex): RatesIndex {
  const out: CostRow[] = [], check = new Map<string, number>(), mix: RateCardBlock = { heads: ['Portfolio', 'Wave', 'Product', 'AS-IS day rate (TJM)', 'Target day rate (TJM)', 'Delta (target - AS-IS)', ...LOCATIONS.map((l) => `Target mix ${l.name} (%)`)], rows: [] };
  for (const v of pk.views) {
    const s = v.run.ctx.s, K = v.run.engine.K, rows = v.run.rows, w = wave(pk, v.waveId), vi = vals.at.get(v.id)!, k = (...x: string[]) => ['Portfolio', w, v.name, ...x];
    const first = out.length, tm = targetMix(s);
    s.teamIn.forEach((r) => { const rate = rateFor(s, r.loc, r.grade); out.push(row('rate', k(G_RATE, r.skill, r.grade, r.loc), 'EUR/day', 'rate', rate, lay(v, L, () => rate))); });
    const last = out.length - 1, mixIdx = mix.rows.length;
    mix.rows.push(['Portfolio', w, v.name, K.dayRateAsIs, K.dayRateTarget, K.dayRateTarget - K.dayRateAsIs, ...LOCATIONS.map((l) => tm[l.name] ?? 0)]);
    const adj = row('adjust', k(G_CHECK, 'Blending adjustment (target location mix)', '', ''), 'EUR/month', 'eur', null,
      lay(v, L, (t) => rows[t - 1]!.humanFte * K.wdMonth * (K.dayRateTarget - K.dayRateAsIs)), { k: 'adj', days: vi.sub, mix: mixIdx });
    out.push(adj);
    const dot = dotRows(vals.table.rows.slice(vi.first, vi.last + 1), out.slice(first, last + 1)), tc = addRows([dot, adj]);
    out.push(row('teamcost', k(G_CHECK, 'Team cost = sum of days x applied rate + blending adjustment', '', ''), 'EUR/month', 'eur', tc.t0, tc.months,{ k: 'dot', values: [vi.first, vi.last], rates: [first, last], plus: out.length - 1 }, true));
    const eng = row('engine', k(G_CHECK, 'Engine team cost (human FTE x target day rate x working days / 12)', '', ''), 'EUR/month', 'eur', K.baselineRunMonth, lay(v, L, (t) => rows[t - 1]!.teamCost));
    out.push(eng);
    const d = subRows(out[out.length - 2] as CostRow, eng);
    out.push(row('diff', k(G_CHECK, 'Difference (must be 0)', '', ''), 'EUR/month', 'eur', d.t0, d.months, { k: 'diff', a: out.length - 2, b: out.length - 1 }));
    check.set(v.id, out.length - 3);
  }
  return { table: { keyHeads: RATE_HEADS, rows: out }, check, card: rateCard(pk), mix };
}
