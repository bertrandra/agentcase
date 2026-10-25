/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { activePhaseIds } from './phases';
import { phaseScope } from '../scope';
import { anchorClamp, daFmt, daGet, doraAnchors, QUALITY_DEFAULT, qualityRows, throughputAnchors } from './anchors';
import { perfFrame } from './perf';

/** Exec timeline: sprint velocity by year and the phase durations (days) AS-IS → Y1 → Y2 → horizon end. */
export function execView(c: Ctx) {
  const { m, end, endL } = perfFrame(c), f = m.eff / 38, r = m.ramps as number[];
  const sp = (g: number, k: number) => Math.round(35 * (1 + g * k * f));
  const phases: [string, number, number][] = [['L0/Spec', 14, 6], ['V1-V2 Design', 21, 10], ['V3 Code', 28, 11], ['V4-V5 Test', 21, 7],
    ['V6-V7 Release', 10, 3]];
  return {
    endL,
    sprints: [['AS-IS', 35], ['Y1', sp(r[0] as number / 100, 0.3)], ['Y2', sp(r[1] as number / 100, 0.5)],
    [endL, sp(end.adoptionEndPct / 100, 0.8)]] as [string, number][],
    rows: phases.map(([name, a, t]) => {
      const y = (k: number) => Math.round(a - (a - t) * (r[k] as number) / (r[2] as number));
      return { name, cells: [`${a}j`, `${y(0)}j`, `${y(1)}j`, `${t}j`] };
    }),
  };
}

/** AS-IS vs TO-BE rows ([metric, AS-IS, TO-BE, change]) at the horizon end, and that year's label. */
export function asisTobeView(c: Ctx) {
  const { m, eng, endYear, endL } = perfFrame(c);
  let ramp = (m.ramps as number[])[m.ramps.length - 1] as number;
  if (endYear > 3) ramp = eng.year(endYear).adoptionEndPct;
  const red = Math.round(((ramp / 100) * m.eff / 100) * 100);
  const rows = [
    ['Calendar duration', '14 wk', `${(14 * (1 - red / 100 * 0.6)).toFixed(1)} wk`, `-${Math.round(red * 0.6)}%`],
    ['Human effort (PD)', '120', (120 * (1 - red / 100)).toFixed(0), `-${red}%`],
    ['Generation/artifact', '8h', `${(8 * (1 - red / 100 * 0.75)).toFixed(1)}h`, `-${Math.round(red * 0.75)}%`],
    ['Review cycles', '3.2', '1.5', '-53%'], ['Defects', '8-12%', '2-4%', '-75%'], ['Test coverage', '55-65%', '85-92%', '+27pp'],
    ['Cost/SP', '€650', '€185', '-71%'],
  ];
  return { endL, rows };
}

const tpVal = (asis: number, tgt: number, r: number) => Math.max(0, Math.round(anchorClamp(asis, tgt, r)));

/** Throughput per engineer per month for the categories whose phase is in scope (all of them, scaled, when none is). */
export function productivityView(c: Ctx) {
  const { r1, r2, r3, endL } = perfFrame(c), sc = phaseScope(c.a, c.s), inScope = activePhaseIds(c), all = throughputAnchors(c.s);
  const inList = all.filter((a) => inScope.has(a.phase)), fallback = inList.length === 0, items = fallback ? all : inList;
  return {
    endL, fallback, count: items.length, intensity: sc.avgAgent, scopeCount: sc.count, totalArt: sc.totalArt,
    rows: items.map((a) => ({ label: a.label, asis: a.asis, y1: tpVal(a.asis, a.target, r1), y2: tpVal(a.asis, a.target, r2),
    y3: tpVal(a.asis, a.target, r3) })),
  };
}

/** Velocity and DORA metrics: Y0 → Y1 → Y2 → horizon end, interpolated AS-IS → elite and clamped at the target. */
export function velocityView(c: Ctx) {
  const { r1, r2, r3, endL } = perfFrame(c), vs = daGet(c.s, 'velocitySp'), vv = (r: number) => Math.round(anchorClamp(vs.asis, vs.target, r));
  return {
    endL, velocity: [vs.asis, vv(r1), vv(r2), vv(r3)],
    rows: doraAnchors(c.s).filter((a) => a.id !== 'velocitySp').map((a) => ({
      label: a.label, cells: [a.asis, anchorClamp(a.asis, a.target, r1), anchorClamp(a.asis, a.target, r2), anchorClamp(a.asis, a.target, r3),
      a.target].map((v) => daFmt(c.s, a.id, v)),
    })),
  };
}

const RADAR_ASIS = [40, 60, 35, 50, 52, 50, 54], RADAR_MAX = [88, 90, 92, 90, 96, 90, 88];
const isDecimal = (name: string) => name.includes('1000') || name.includes('100 commits');

/** Quality anchors: Y1 / Y2 / horizon end per metric (formatted), editable flags against the defaults, and the TO-BE radar. */
export function qualityAnchorView(c: Ctx) {
  const { r1, r2, r3, endL } = perfFrame(c);
  return {
    endL, radarAsis: RADAR_ASIS, radarTobe: RADAR_ASIS.map((a, i) => Math.round(a + ((RADAR_MAX[i] as number) - a) * r3)),
    rows: qualityRows(c.s).map((q, i) => {
      const dec = isDecimal(q[0]), fmt = (v: number) => (dec ? (+v).toFixed(1) : String(Math.round(v))), at = (r: number) => fmt(anchorClamp(q[1], q[2], r));
      return { index: i, name: q[0], asis: q[1], target: q[2], source: q[3], step: dec ? 0.1 : 1, y1: at(r1), y2: at(r2), y3: at(r3),
        asisEdited: +q[1] !== +(QUALITY_DEFAULT[i]?.[1] ?? NaN), targetEdited: +q[2] !== +(QUALITY_DEFAULT[i]?.[2] ?? NaN) };
    }),
  };
}
