/** @calc-zone delivery-views @owner kpi-scorecard */
import type { Ctx } from '../ctx';
import { fmtK } from '../format';
import { model } from '../model/overlay';
import { anchorClamp, daFmt, daGet, daVal, qualityRows, throughputAnchors } from './anchors';
import { INDUSTRIES } from '../frame/profile';
import { perfFrame } from './perf';

export const fmtChg = (now: number,
  was: number): string => (!(was > 0) || !isFinite(now) ? '—' : `${Math.round((now / was - 1) * 100) > 0 ? '+' : ''}${Math.round((now / was - 1) * 100)}%`);
const nf = (x: number): string => (Math.abs(x) < 10 ? x.toFixed(1) : String(Math.round(x)));

export type KpiCard = [label: string, value: string, sub: string];

/** KPI scorecard: AS-IS vs the horizon end — cards, three tables of [metric, AS-IS, TO-BE, change] and the index chart. */
export function kpiView(c: Ctx) {
  const { m, end, endL, r3 } = perfFrame(c), s = c.s;
  const humanEnd = end.totalHumanFteEnd, etp = m.base.etp, run0 = m.baselineRun, runEnd = end.totalRunCost;
  const qual = (id: string) => qualityRows(s).find((q) => q[0] === id) ?? [id, 0, 0, ''] as const;
  const qv = (id: string) => anchorClamp(qual(id)[1], qual(id)[2], r3);
  const leadPct = Math.round((daVal(s, 'leadTime', r3) / daGet(s, 'leadTime').asis - 1) * 100),
    velPct = Math.round((daVal(s, 'velocitySp', r3) / daGet(s, 'velocitySp').asis - 1) * 100);
  const thA = throughputAnchors(s).reduce((t, a) => t + a.asis, 0),
    thY = throughputAnchors(s).reduce((t, a) => t + Math.max(0, Math.round(anchorClamp(a.asis, a.target, r3))), 0);
  const cards: KpiCard[] = [
    ['Headcount (FTE)', `${etp.toFixed(1)} → ${humanEnd.toFixed(1)}`, fmtChg(humanEnd, etp)],
    ['Run cost/yr', `${fmtK(run0)} → ${fmtK(runEnd)}`, fmtChg(runEnd, run0)],
    ['Lead time', `${daFmt(s, 'leadTime', daGet(s, 'leadTime').asis)} → ${daFmt(s, 'leadTime', daVal(s, 'leadTime', r3))}`, `${leadPct}%`],
    [`Savings ${endL}`, fmtK(end.savings), `${fmtChg(run0 - end.savings, run0)} of baseline run`],
  ];
  const freed = etp - humanEnd, autoEnd = Math.round(m.eff * end.adoptionEndPct / 100);
  const eco: string[][] = [
    ['Headcount (FTE)', etp.toFixed(1), humanEnd.toFixed(1), fmtChg(humanEnd, etp)], ['Run cost/yr', fmtK(run0), fmtK(runEnd), fmtChg(runEnd, run0)],
    ['Freed capacity', '0', `${freed.toFixed(1)} FTE`, `+${freed.toFixed(1)}`], ['Effective automation', '0%', `${autoEnd}%`, `+${autoEnd}pp`],
    ['Throughput/eng/mo', String(thA), String(thY), thA > 0 ? `+${Math.round((thY / thA - 1) * 100)}%` : '—'],
  ];
  const q = (n: string, suf: string, pp: boolean, plus: boolean): string[] => {
    const r = qual(n), v = anchorClamp(r[1], r[2], r3), pre = plus ? '+' : '';
    return [n, pre + nf(r[1]) + suf, pre + nf(v) + suf,
      pp ? `${v - r[1] >= 0 ? '+' : ''}${Math.round(v - r[1])}pp` : r[1] > 0 ? `${v >= r[1] ? '+' : ''}${Math.round((v / r[1] - 1) * 100)}%` : '—'];
  };
  const vq: string[][] = [
    ['Velocity (SP/sprint)', String(daGet(s, 'velocitySp').asis), String(Math.round(daVal(s, 'velocitySp', r3))), `+${velPct}%`],
    ['Lead time', daFmt(s, 'leadTime', daGet(s, 'leadTime').asis), daFmt(s, 'leadTime', daVal(s, 'leadTime', r3)), `${leadPct}%`],
    q('Bugs/1000 LOC', '', false, false), q('Test coverage', '%', true, false), q('Defect leakage %', '%', false, false), q('eNPS', '', true, true),
  ];
  const ind = INDUSTRIES.find((i) => i.code === c.inp.v('industry')), reg = ind ? ind.regArtifacts : 0, ceil = model(c).ceiling;
  const comp: string[][] = [
    ['Glass ceiling', '100% manual', `${ceil}%`, `-${100 - ceil}pp auto`],
    ['Reg. artifacts assisted', `0/${reg}`, `${Math.round(reg * (1 - ceil / 100))}/${reg}`, `+${Math.round((1 - ceil / 100) * 100)}%`],
    ['Traceability', 'Manual', 'Auto 95%', '+50pp'], ['Audit trail', 'Partial', 'Complete', 'Reinforced'],
  ];
  const idx = (v: number, a: number) => Math.round(v / a * 100);
  const chart = [etp > 0 ? Math.round(end.humanFteEnd / etp * 100) : 0, run0 > 0 ? Math.round(runEnd / run0 * 100) : 0,
    idx(daVal(s, 'leadTime', r3), daGet(s, 'leadTime').asis), idx(runEnd, run0),
    idx(qv('Bugs/1000 LOC'), qual('Bugs/1000 LOC')[1]), idx(qv('Test coverage'), qual('Test coverage')[1]),
      idx(daVal(s, 'velocitySp', r3), daGet(s, 'velocitySp').asis)];
  return { endL, cards, eco, vq, comp, chart };
}
