/** @calc-zone delivery-views */
import type { WArtefact } from '../artefacts';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { CROSS_CODES } from '../frame/profile';
import { spanDates } from './ganttEdit';
import { groupLayout,seqKey, type LayoutItem, type Placed } from './ganttLayout';
import { ganttAxis, ganttNum, milestoneMarkers, programRows, type Axis, type Marker, type ProgramRow } from './ganttProgram';
import { activePhaseIds, phasesWithSeq } from './phases';
import type { ColourRole } from '../theme';

const PAL: readonly ColourRole[] = ['primary-700', 'teal-700', 'info-700', 'secondary-600', 'warning-600', 'danger-800', 'teal-700', 'teal-700', 'warning-600', 'secondary-600', 'slate-650'];
const isCross = (a: WArtefact) => CROSS_CODES.includes(a.industry ?? '') || a.phase === 'Cross-cutting';
const monLabel = (n: number): string => `${n >= 10 ? Math.round(n) : n.toFixed(1)} mo`;

/** A bar on the shared calendar: where it starts and how wide it is (% of the axis), with its human-supervision share. */
export interface Span { start: number; act: number; sup: number }
export interface ArtRow extends Span { label: string; meta: string }
export interface PhaseRow extends Span {
  key: string; name: string; count: number; last: boolean; cross: boolean; meta: string; tone: ColourRole; arts: ArtRow[];
}
export interface GanttView {
  axis: Axis; ticks: { left: number; label: string }[]; summary: [string, string][]; program: (ProgramRow & { left: number; w: number; range: string })[];
  markers: Marker[]; phases: PhaseRow[]; release: number | null; overlap: number; crossSeq: number; hasCross: boolean; velocityGain: number; phaseCount: number;
}

interface Item { a: WArtefact; kind: 'SDLC' | 'Reg' | 'Cross'; icon: string }

function spanOf(ax: Axis, p: Placed, sf: number): Span {
  return { start: ax.left(p.startM), act: ax.width(p.durM), sup: ax.width(p.durM * Math.max(0, Math.min(1, sf || 0))) };
}
const weightedSup = (arts: Item[]) => { const w = arts.reduce((s, it) => s + (+it.a.w || 0), 0); return { w, sf: w ? arts.reduce((s, it) => s + (+it.a.w || 0) * (+it.a.humanSup || 0), 0) / w / 100 : 0 }; };

function artRows(ax: Axis, arts: Item[], lam: number, win: Placed): ArtRow[] {
  const placed = groupLayout(arts.map((it): LayoutItem => ({ id: it.a.id, seqKey: seqKey(it.a, 0), len: +it.a.w || 0 })), lam, win.startM, win.durM);
  return arts.map((it) => {
    const a = it.a, p = placed[a.id]!, tail = it.kind === 'Cross' ? ` · ${a.norm || a.industry || ''}` : '';
    const head = it.kind === 'Cross' ? '' : `${it.kind} · `;
    return { ...spanOf(ax, p, (+a.humanSup || 0) / 100), label: `${it.icon} ${a.id} · ${a.name || ''}`, meta: `${head}w${(+a.w || 0).toFixed(1)} · ${monLabel(p.durM)} · ${a.humanSup || 0}% sup${tail}` };
  });
}

/** The Gantt: transformation program, engine milestones and the seq-grouped delivery rollout on one calendar (pure; reads the case). */
export function ganttView(c: Ctx): GanttView {
  const ax = ganttAxis(c), { totalM } = ax, prog = programRows(c, totalM), overlap = Math.min(90, Math.max(0, ganttNum(c, 'ganttOverlap', 50))), lam = overlap / 100;
  const inSet = activePhaseIds(c);
  const ordered = phasesWithSeq(c).filter((p) => inSet.has(p.id)).map((p, i) => ({ p, k: seqKey(p, i) })).sort((x, y) => x.k - y.k).map((o) => o.p);
  const phaseArts = (pid: string): Item[] => {
    const out: Item[] = [];
    c.a.sdlc.forEach((a) => { if (a.phase === pid && c.a.selected.has(a.id)) out.push({ a, kind: 'SDLC', icon: '📄' }); });
    c.a.reg.forEach((a) => { if (!isCross(a) && a.phase === pid && c.a.selectedReg.has(a.id)) out.push({ a, kind: 'Reg', icon: '⚖️' }); });
    return out.map((o, i) => ({ o, k: seqKey(o.a, i) })).sort((x, y) => x.k - y.k).map((x) => x.o);
  };
  const cross: Item[] = c.a.reg.filter((a) => isCross(a) && c.a.selectedReg.has(a.id)).map((a) => ({ a, kind: 'Cross', icon: '🔶' }));
  const crossSeqRaw = c.inp.p('ganttCrossSeq'), crossSeq = isNaN(crossSeqRaw) ? 0 : crossSeqRaw;
  const ramps = model(c).ramps, r0 = +(ramps[0] as number) || 0, rL = +(ramps[ramps.length - 1] as number) || 0, rampOn = r0 > 0 && rL > r0;
  const vAt = (frac: number) => (rampOn ? (r0 + (rL - r0) * Math.max(0, Math.min(1, frac))) / r0 : 1);

  const per = ordered.map((p) => { const arts = phaseArts(p.id), ws = weightedSup(arts); return { id: p.id, p, arts, w: ws.w, sf: ws.sf, seq: seqKey(p, 0) }; });
  const cw = weightedSup(cross), parts = per.map((x) => ({ id: x.id, w: x.w, seq: x.seq }));
  if (cross.length) parts.push({ id: 'Cross-cutting', w: cw.w, seq: crossSeq });
  const totalPW = parts.reduce((s, x) => s + x.w, 0) || 1, velocity: Record<string, number> = {};
  let cum = 0;
  const items = parts.map((x): LayoutItem => { const v = vAt((cum + x.w / 2) / totalPW); cum += x.w; velocity[x.id] = v; return { id: x.id, seqKey: x.seq, len: v > 0 ? x.w / v : x.w }; });
  const delivStart = prog.onboardEnd, win = groupLayout(items, lam, delivStart, Math.max(1, totalM - prog.onboardEnd));
  const ids = Object.keys(win), end = (id: string) => win[id]!.startM + win[id]!.durM;
  const cycleEnd = ids.length ? Math.max(...ids.map(end)) : delivStart, lastId = ids.reduce<string | null>((b, id) => (!b || end(id) > end(b) ? id : b), null);
  const meta = (id: string, sf: number, pre = '') => `${pre}${monLabel(win[id]!.durM)} · ${Math.round(sf * 100)}% supervised · ×${velocity[id]!.toFixed(2)} velocity${id === lastId ? ' · closes the release' : ''}`;

  const phases: PhaseRow[] = per.map((x, i) => ({
    ...spanOf(ax, win[x.id]!, x.sf), key: x.id, name: `${x.id} · ${x.p.name}`, count: x.arts.length, last: x.id === lastId, cross: false, meta: meta(x.id, x.sf),
    tone: PAL[i % PAL.length]!, arts: artRows(ax, x.arts, lam, win[x.id]!),
  }));
  if (cross.length) phases.push({ ...spanOf(ax, win['Cross-cutting']!, cw.sf), key: '__cross__', name: '🔶 Cross-cutting', count: cross.length, last: lastId === 'Cross-cutting', cross: true,
    meta: meta('Cross-cutting', cw.sf, 'AI · Sustainability · Usability · '), tone: 'chart-cat-3', arts: artRows(ax, cross, lam, win['Cross-cutting']!) });

  return {
    axis: ax, phaseCount: ordered.length, velocityGain: vAt(1), overlap, crossSeq, hasCross: cross.length > 0, markers: milestoneMarkers(c, ax), phases,
    release: ids.length ? ax.left(cycleEnd) : null,
    ticks: Array.from({ length: Math.floor(totalM / 12) + 1 }, (_, k) => ({ left: ax.left(k * 12), label: ax.dateAt(k * 12) })),
    program: prog.rows.map((r) => ({ ...r, left: ax.left(r.start), w: ax.width(r.dur), range: spanDates(ax, r.start, r.dur) })),
    summary: [['Start', ax.startOk ? ax.startDate.toLocaleDateString('en-US') : ax.startStr], ['Horizon', `${ax.horizon} yr`], ['Onboarding', `${prog.onboardWeeks} wk`],
      ['Phases in scope', String(ordered.length)], ['Velocity gain', `×${vAt(1).toFixed(2)}`]],
  };
}
