import type { Ctx } from '../ctx';
import { lifecycleAutoPosture, lifecycleBlend, lifecycleWeight, statusTable } from '../lifecycle';
import { activeArtefacts } from '../scope';
import { phasesForScope } from '../scopeView';
import type { CaseState } from '../types/state';

/** Human-readable blended status, e.g. "63% Feature add · 38% Maintenance" (legacy lifecycleStatusLabel). */
export function statusLabel(s: CaseState): string {
  if (!s.lifecycleUse) return 'Off (neutral)';
  const b = lifecycleBlend(s), name = (d: { id: string; label?: string }) => d.label ?? d.id;
  if (b.loIdx === b.hiIdx || b.frac < 0.001) return name(b.lo);
  return `${Math.round((1 - b.frac) * 100)}% ${name(b.lo).split(' / ')[0]} · ${Math.round(b.frac * 100)}% ${name(b.hi).split(' / ')[0]}`;
}

/** Option value (0..100) of the status nearest to the current position (legacy syncLifecycleControls). */
export function nearestStatusPos(s: CaseState): number {
  const b = lifecycleBlend(s), n = statusTable(s).length;
  return Math.round(((b.frac < 0.5 ? b.loIdx : b.hiIdx) / (n - 1)) * 100);
}

/** The status options of the jump selector: label and position (0..100). */
export function statusOptions(s: CaseState): { value: number; label: string }[] {
  const t = statusTable(s);
  return t.map((d, i) => ({ value: Math.round((i / (t.length - 1)) * 100), label: d.label ?? d.id }));
}

export interface CascadeRow { id: string; name: string; weight: number; share: number }
/** Per-phase interpolated weight and the resulting share of the in-scope effort (legacy renderLifecycleCascade). */
export function lifecycleCascade(c: Ctx): { rows: CascadeRow[]; posture: number; label: string } {
  const w = new Map<string, number>();
  for (const a of activeArtefacts(c.a, c.s)) w.set(a.phase, (w.get(a.phase) ?? 0) + (+a.w || 0));
  const tot = [...w.values()].reduce((s, v) => s + v, 0) || 1;
  const rows = phasesForScope().map((p) => ({ id: p.id, name: p.name, weight: lifecycleWeight(c.s, p.id), share: ((w.get(p.id) ?? 0) / tot) * 100 }));
  return { rows, posture: lifecycleAutoPosture(c.s), label: statusLabel(c.s) };
}

export interface StatusDocRow { id: string; label: string; blurb: string; posture: number; marker: string; share: number | null }
/** The status table with the ◀ markers of the two statuses being blended (legacy renderLifecycleDoc). */
export function statusDoc(s: CaseState): StatusDocRow[] {
  const b = s.lifecycleUse ? lifecycleBlend(s) : null;
  return statusTable(s).map((d, i) => {
    let marker = '', share: number | null = null;
    if (b && i === b.loIdx && i === b.hiIdx) { marker = ' ◀ current'; share = 1; }
    else if (b && i === b.loIdx) { share = 1 - b.frac; marker = ` ◀ ${Math.round(share * 100)}%`; }
    else if (b && i === b.hiIdx) { share = b.frac; marker = ` ◀ ${Math.round(share * 100)}%`; }
    return { id: d.id, label: d.label ?? d.id, blurb: (d as { blurb?: string }).blurb ?? '', posture: d.autoPosture, marker, share };
  });
}
