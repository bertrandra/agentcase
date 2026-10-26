/** @calc-zone stress */
import { engineNow, paybackMonthsCanonical } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';

export const fmtK = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;

export interface Trajectory { fte: number[]; cost: number[]; save: number[]; velo: number[] }
export interface CompareData {
  labels: string[]; asis: Trajectory; classic: Trajectory; agentic: Trajectory; rows: string[][]; classicSaving: number;
}

/** AS-IS / AS-IS + classic saving / Agentic trajectories and the key-figures table (legacy renderCompare). */
export function compareData(c: Ctx): CompareData {
  const m = model(c), cs = c.inp.p('classicSaving') / 100, yrs = m.horizon, ey = engineNow(c).years();
  const mk = (): Trajectory => ({ fte: [], cost: [], save: [], velo: [] });
  const asis = mk(), classic = mk(), agentic = mk();
  let cumC = 0;
  for (let y = 0; y < yrs; y++) {
    asis.fte.push(m.base.etp); asis.cost.push(m.baselineRun); asis.save.push(0); asis.velo.push(35);
    const f = Math.pow(1 - cs, y + 1), cCost = m.baselineRun * f;
    classic.fte.push(m.base.etp * f); classic.cost.push(cCost); cumC += m.baselineRun - cCost; classic.save.push(cumC);
    classic.velo.push(Math.round(35 * (1 + 0.03 * (y + 1))));
    const e = ey[Math.min(y, ey.length - 1)]!;   // the Time Engine's own year row: one value per horizon year, no Y3 repetition
    agentic.fte.push(e.humanFteEnd); agentic.cost.push(e.totalRunCost + e.setupCost);
    agentic.save.push(e.cumulativeCashFlowEnd);
    agentic.velo.push(Math.round(35 * (1 + (e.adoptionEndPct / 100) * 0.8)));
  }
  const last = yrs - 1, at = (t: Trajectory, k: keyof Trajectory) => t[k][last] as number;
  const be = paybackMonthsCanonical(c), vf = (ey[Math.min(last, ey.length - 1)]?.agentVfteEnd ?? 0);
  const aCost = ey[Math.min(last, ey.length - 1)]?.totalRunCost ?? 0;
  const rows = [
    ['Final headcount (FTE)', m.base.etp.toFixed(1), at(classic, 'fte').toFixed(1), at(agentic, 'fte').toFixed(1),
      `-${Math.round((1 - at(agentic, 'fte') / m.base.etp) * 100)}%`],
    [`Agent vFTE (Y${yrs})`, '0', '0', vf.toFixed(1), `+${vf.toFixed(1)}`],
    ['Final annual cost', fmtK(m.baselineRun), fmtK(at(classic, 'cost')), fmtK(aCost), `-${Math.round((1 - aCost / m.baselineRun) * 100)}%`],
    ['Cumulative saving', fmtK(at(asis, 'save')), fmtK(at(classic, 'save')), fmtK(at(agentic, 'save')),
      at(agentic, 'save') > at(classic, 'save') ? 'better' : '—'],
    ['Velocity increase', '0%', `+${Math.round((at(classic, 'velo') / 35 - 1) * 100)}%`, `+${Math.round((at(agentic, 'velo') / 35 - 1) * 100)}%`,
      `×${(at(agentic, 'velo') / Math.max(1, at(classic, 'velo'))).toFixed(1)} vs classic`],
    ['Temps ROI (break-even)', '—', '—', be ? `${be} mois` : `> ${yrs * 12} mois`, be ? 'atteint' : '—'],
    ['Cost / story point', '€650', `€${Math.round(650 * at(classic, 'cost') / m.baselineRun)}`, '€185', `-${Math.round((1 - 185 / 650) * 100)}%`],
    ['Quality (test cov.)', '60%', '63%', '90%', '+30pp'],
  ];
  return { labels: Array.from({ length: yrs }, (_, i) => `Y${i + 1}`), asis, classic, agentic, rows, classicSaving: c.inp.p('classicSaving') };
}
