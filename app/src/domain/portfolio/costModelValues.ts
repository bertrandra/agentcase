import { lay, type Picked } from './costModelAxis';
import { addRows, row } from './costModelRow';
import type { CostRow, CostTable } from './costModelTypes';
import type { ProductView } from './waves';

export const VALUE_HEADS = ['Portfolio', 'Wave', 'Product', 'Group', 'Skill', 'Grade', 'Location'];
export const G_DAYS = 'Human days', G_INFO = 'Information (agentic side, not in the human-days subtotal)', G_DRV = 'Drivers (non-cost)', G_SUB = 'Subtotal';

/** Where a product sits in the Values table: its human-days rows (inclusive) and its subtotal row. */
export interface ValuesIndex { table: CostTable; at: Map<string, { first: number; last: number; sub: number }> }

/** The human days a product carries each month, by AS-IS team line: the engine's human FTE spread over the entry lines in proportion to their FTE, x working days / 12. */
function productRows(v: ProductView, L: number, wave: string): CostRow[] {
  const s = v.run.ctx.s, K = v.run.engine.K, rows = v.run.rows, base = K.baseEtp, wd = K.wdMonth, k = (...x: string[]) => ['Portfolio', wave, v.name, ...x];
  const days = s.teamIn.map((r) => {
    const etp = +r.etp || 0, share = base > 0 ? etp / base : 0;
    return row('days', k(G_DAYS, r.skill, r.grade, r.loc), 'days', 'days', etp * wd, lay(v, L, (t) => rows[t - 1]!.humanFte * wd * share));
  });
  const info = [
    row('info', k(G_INFO, 'Agent (vFTE)', '', ''), 'agent vFTE-days', 'days', 0, lay(v, L, (t) => rows[t - 1]!.agentVfte * wd)),
    row('info', k(G_INFO, 'Agentic run team (AgentOps)', '', ''), 'days (costed in Other costs)', 'days', 0, lay(v, L, (t) => rows[t - 1]!.runTeamFte * wd)),
  ];
  const drv = (name: string, unit: string, fmt: 'pct' | 'fte', t0: number | null, f: (t: number) => number) => row('driver', k(G_DRV, name, '', ''), unit, fmt, t0, lay(v, L, f));
  return [...days, ...info,
    drv('Adoption', '%', 'pct', 0, (t) => rows[t - 1]!.adoptionRampPct), drv('Effective automation', '%', 'pct', null, (t) => rows[t - 1]!.effectiveAutomationPct),
    drv('Human FTE', 'FTE', 'fte', base, (t) => rows[t - 1]!.humanFte), drv('Agent vFTE', 'vFTE', 'fte', 0, (t) => rows[t - 1]!.agentVfte)];
}

/** TAB 1: days per month by Portfolio / Wave / Product / Skill / Grade / Location, with product, wave and portfolio subtotals (Excel formulas over the rows). */
export function buildValues(pk: Picked, L: number): ValuesIndex {
  const out: CostRow[] = [], at: ValuesIndex['at'] = new Map(), waveSubs: number[] = [];
  for (const w of pk.waves) {
    const subs: number[] = [];
    for (const v of pk.views.filter((x) => x.waveId === w.id)) {
      const rows = productRows(v, L, w.name), days = rows.filter((r) => r.role === 'days'), first = out.length, sum = addRows(days);
      const sub = row('sub', ['Portfolio', w.name, v.name, G_SUB, 'Product subtotal (human days)', '', ''], 'days', 'days', sum.t0, sum.months, { k: 'sum', rows: days.map((_, i) => first + i) }, true);
      out.push(...rows.slice(0, days.length), sub, ...rows.slice(days.length));
      at.set(v.id, { first, last: first + days.length - 1, sub: first + days.length }); subs.push(first + days.length);
    }
    const sum = addRows(subs.map((i) => out[i] as CostRow));
    out.push(row('sub', ['Portfolio', w.name, '(all products)', G_SUB, 'Wave subtotal (human days)', '', ''], 'days', 'days', sum.t0, sum.months, { k: 'sum', rows: subs }, true));
    waveSubs.push(out.length - 1);
  }
  const all = addRows(waveSubs.map((i) => out[i] as CostRow));
  out.push(row('sub', ['Portfolio', '(all waves)', '(all products)', G_SUB, 'Portfolio total (human days)', '', ''], 'days', 'days', all.t0, all.months, { k: 'sum', rows: waveSubs }, true));
  return { table: { keyHeads: VALUE_HEADS, rows: out }, at };
}
