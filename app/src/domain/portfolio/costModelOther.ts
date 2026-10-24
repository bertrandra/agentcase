/** @calc-zone exports */
import { lay, layWide, sumOf, type Picked } from './costModelAxis';
import { COST, SAVE, costLines, pilotCells, plus } from './costModelLines';
import { addRows, row, subRows, type Cells } from './costModelRow';
import type { RatesIndex } from './costModelRates';
import type { CostRow, CostTable } from './costModelTypes';
import { keptMonths } from './timeline';
import { aggregate, type ProductView } from './waves';

export const OTHER_HEADS = ['Portfolio', 'Wave', 'Product', 'Group', 'Cost line', 'Basis', 'Sign'];
const EUR = 'EUR/month';

/** Is calendar index i inside the months the product runs (its month 1 .. its last kept month)? */
const running = (v: ProductView, L: number, i: number): boolean => i >= v.month0 && i < v.month0 + keptMonths(L, v.month0, v.run.rows.length);

const memo = (keys: string[], unit: string, t0: number | null, months: (number | null)[], total: number | null): CostRow => ({ ...row('memo', keys, unit, 'eur', t0, months), total });

/**
 * total / engine / difference rows of a set of products, the engine total read independently from the consolidated series (AS-IS cost less net
 * savings) plus the pilot.
 */
function totals(out: CostRow[], w: string, label: string, subs: number[], views: ProductView[], L: number, rate: number): number {
  const key = (n: string) => ['Portfolio', w, '(all products)', 'Total', `${label} ${n}`, '', ''], tot = addRows(subs.map((i) => out[i] as CostRow)), net = aggregate(views, L, rate).series.net;
  const base = addRows(views.map((v) => ({ t0: 0, months: layWide(v, L, (i) => (running(v, L, i) ? v.run.engine.K.baselineRunMonth : 0)) })));
  const pilot = addRows(views.map((v) => ({ t0: null, months: pilotCells(v, L) }))).months;
  const eng: Cells = { t0: sumOf(views.map((v) => v.run.engine.K.baselineRunMonth)), months: plus(base.months.map((b, i) => (b === null ? null : b - (net[i] ?? 0))), pilot) };
  out.push(row('total', key('TOTAL TO-BE COST (pilot included)'), EUR, 'eur', tot.t0, tot.months, { k: 'sum', rows: subs }, true));
  out.push(row('engine', key('engine total (AS-IS cost less net savings, consolidated series) + pilot'), EUR, 'eur', eng.t0, eng.months));
  const d = subRows(out[out.length - 2] as CostRow, eng);
  out.push(row('diff', key('difference (must be 0)'), EUR, 'eur', d.t0, d.months, { k: 'diff', a: out.length - 2, b: out.length - 1 }));
  return out.length - 3;
}

/**
 * One product's block: the team line (linked to the Rate cards check), the other lines, the pilot (included in the totals, decision D4), TOTAL TO-BE COST,
 * the engine total plus the pilot (the engine does not count the pilot), the Difference and memo lines. Returns the index of the total.
 */
function productBlock(out: CostRow[], v: ProductView, wave: string, L: number, rates: RatesIndex): number {
  const k = (g: string, line: string, basis: string, sign: string) => ['Portfolio', wave, v.name, g, line, basis, sign], K = v.run.engine.K, first = out.length;
  out.push(row('team', k('Team', 'Team cost (human days x applied rate)', 'Rate cards: sum of days x applied rate + blending adjustment', COST), EUR, 'eur', K.baselineRunMonth,
    lay(v, L, (t) => v.run.rows[t - 1]!.teamCost), { k: 'link', row: rates.check.get(v.id)! }));
  out.push(...costLines(v, L, k));
  const pilot = pilotCells(v, L);
  out.push(row('line', k('Pilot', 'Pilot (included in totals)', 'tune/program pilotSizing, spread from product month 1; not in the engine cost', COST), EUR, 'eur', null, pilot));
  const ids = out.slice(first).map((_, i) => first + i), sum = addRows(out.slice(first));
  out.push(row('total', k('Total', 'TOTAL TO-BE COST (days x rate + other costs + pilot)', 'sum of the lines above', COST), EUR, 'eur', sum.t0, sum.months, { k: 'sum', rows: ids }, true));
  const eng = row('engine', k('Check', 'Engine total + pilot (AS-IS cost less net savings, plus the pilot)', 'baselineRunMonth - netSavings + pilot', COST), EUR, 'eur', K.baselineRunMonth,
    plus(layWide(v, L, (i) => (running(v, L, i) ? K.baselineRunMonth : 0) - v.series.net[i]!), pilot));
  out.push(eng);
  const d = subRows(out[out.length - 2] as CostRow, eng), total = out.length - 2, M = 'Memo (not in the total)';
  out.push(row('diff', k('Check', 'Difference (must be 0)', 'TOTAL TO-BE COST - engine total', COST), EUR, 'eur', d.t0, d.months, { k: 'diff', a: total, b: total + 1 }));
  out.push(memo(k(M, 'AS-IS cost of the same months', 'baselineRunMonth', COST), EUR, K.baselineRunMonth, lay(v, L, () => K.baselineRunMonth), null));
  out.push(memo(k(M, 'Net savings (engine)', 'AS-IS cost - (TOTAL TO-BE COST - pilot)', SAVE), EUR, null, layWide(v, L, (i) => v.series.net[i]!), null));
  return total;
}

/** TAB 3: every cost line other than the team's days x rate, per product, then wave and portfolio totals, each against the engine's own total. */
export function buildOther(pk: Picked, L: number, rates: RatesIndex, rate: number): CostTable {
  const out: CostRow[] = [], waveTotals: number[] = [];
  for (const w of pk.waves) {
    const views = pk.views.filter((x) => x.waveId === w.id);
    waveTotals.push(totals(out, w.name, 'WAVE', views.map((v) => productBlock(out, v, w.name, L, rates)), views, L, rate));
  }
  totals(out, '(all waves)', 'PORTFOLIO', waveTotals, pk.views, L, rate);
  return { keyHeads: OTHER_HEADS, rows: out };
}
