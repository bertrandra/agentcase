/** @calc-zone workspace-config */
import { PHASES } from '../catalog';
import type { WArtefact } from '../artefacts';
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';

/** The weekly grid, anchored on the roadmap start (rmStart) and sized by the horizon. Dates are UTC calendar days. */
export interface Grid { totalW: number; horizon: number; date(w: number, dayOffset?: number): string }

export function fgGrid(c: Ctx): Grid {
  const horizon = parseInt(c.inp.v('horizon')) || 3;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(c.inp.v('rmStart')) ? c.inp.v('rmStart') : '2026-09-01';
  let t0 = Date.parse(start + 'T00:00:00Z');
  if (isNaN(t0)) t0 = Date.parse('2026-09-01T00:00:00Z');
  return { totalW: Math.round(horizon * 52.18), horizon, date: (w, off = 0) => new Date(t0 + Math.trunc((w - 1) * 7 + off) * 86400000).toISOString().slice(0,
    10) };
}

interface Item { id: string; seqKey: number; len: number }
/** Items sharing a seq value START TOGETHER (a synchronised wave); the others overlap by `overlapFrac`. Scaled to fill the window (legacy ganttGroupLayout). */
export function ganttGroupLayout(items: Item[], overlapFrac: number, winStartM: number, winDurM: number): Record<string, { startM: number; durM: number }> {
  const sorted = items.slice().sort((a, b) => a.seqKey - b.seqKey);
  let acc = 0, maxEnd = 0, i = 0;
  const rel: Record<string, { rst: number; rlen: number }> = {};
  while (i < sorted.length) {
    let j = i, groupMax = 0;
    while (j < sorted.length && (sorted[j] as Item).seqKey === (sorted[i] as Item).seqKey) { groupMax = Math.max(groupMax, (sorted[j] as Item).len); j++; }
    const st = (1 - overlapFrac) * acc;
    for (let k = i; k < j; k++) rel[(sorted[k] as Item).id] = { rst: st, rlen: (sorted[k] as Item).len };
    acc += groupMax; if (st + groupMax > maxEnd) maxEnd = st + groupMax;
    i = j;
  }
  const scale = winDurM / (maxEnd || 1), out: Record<string, { startM: number; durM: number }> = {};
  for (const id of Object.keys(rel)) {
    const o = rel[id] as { rst: number; rlen: number };
    out[id] = { startM: winStartM + o.rst * scale, durM: o.rlen * scale };
  }
  return out;
}

export interface PhaseWindow { sw: number; ew: number; arts: WArtefact[] }
/** Phase → [start week, end week] on the grid, through the Gantt's own layout helper. Phases without a scoped artefact are absent. */
export function fgPhaseWindows(c: Ctx, grid: Grid): Record<string, PhaseWindow> {
  const byPhase: Record<string, WArtefact[]> = {};
  activeArtefacts(c.a, c.s).forEach((a) => { (byPhase[a.phase] ??= []).push(a); });
  const seqOf = new Map((c.s.phaseSeq ?? []).map((x) => [x.id, x.seq]));
  const phases = PHASES.filter((p) => byPhase[p.id]?.length);
  if (!phases.length) return {};
  const items = phases.map((p) => ({ id: p.id, seqKey: seqOf.has(p.id) ? (seqOf.get(p.id) ?? 0) : (p.seq ?? 0),
    len: Math.max(0.5, (byPhase[p.id] as WArtefact[]).reduce((t, a) => t + (+a.w || 0), 0)) }));
  const ov = c.inp.p('ganttOverlap'), setup = c.inp.p('setupDuration');
  const overlap = Math.min(0.8, Math.max(0, (ov > 0 ? ov : 0) / 100)), setupM = Math.max(0, setup > 0 ? setup : 0);
  const totalM = Math.max(12, grid.horizon * 12);
  const lay = ganttGroupLayout(items, overlap, setupM, Math.max(1, totalM - setupM));
  const out: Record<string, PhaseWindow> = {};
  for (const id of Object.keys(lay)) {
    const o = lay[id] as { startM: number; durM: number };
    const sw = Math.max(1, Math.round((o.startM * 52.18) / 12) + 1);
    out[id] = { sw, ew: Math.min(grid.totalW, Math.max(sw, Math.round(((o.startM + o.durM) * 52.18) / 12))), arts: byPhase[id] as WArtefact[] };
  }
  return out;
}
