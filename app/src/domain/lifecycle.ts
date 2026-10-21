import { STATUS_LIFECYCLE } from './catalog';
import type { StatusLifecycleDef } from './types/catalog';
import type { CaseState } from './types/state';

/** Status table = code defaults overridden by the case (weights / autoPosture), like the legacy STATE_REGISTRY entry. */
export function statusTable(s: CaseState): StatusLifecycleDef[] {
  return STATUS_LIFECYCLE.map((def) => {
    const o = (s.statusLifecycle ?? []).find((x) => x.id === def.id);
    if (!o) return def;
    return { ...def, weights: o.weights ?? def.weights, autoPosture: o.autoPosture != null ? o.autoPosture : def.autoPosture };
  });
}

export interface LifecycleBlend { loIdx: number; hiIdx: number; frac: number; lo: StatusLifecycleDef; hi: StatusLifecycleDef }

export function lifecycleBlend(s: CaseState): LifecycleBlend {
  const table = statusTable(s), n = table.length;
  const idx = (s.lifecyclePos / 100) * (n - 1);
  const loIdx = Math.floor(idx), hiIdx = Math.min(n - 1, Math.ceil(idx));
  return { loIdx, hiIdx, frac: idx - loIdx, lo: table[loIdx] as StatusLifecycleDef, hi: table[hiIdx] as StatusLifecycleDef };
}

/** Interpolated relative weight of a phase (1.0 when the axis is off or the phase unknown). */
export function lifecycleWeight(s: CaseState, phaseId: string): number {
  if (!s.lifecycleUse) return 1.0;
  const b = lifecycleBlend(s);
  const wl = b.lo.weights[phaseId] ?? 1.0, wh = b.hi.weights[phaseId] ?? 1.0;
  return wl + (wh - wl) * b.frac;
}

/** Interpolated automation posture (1.0 when off). */
export function lifecycleAutoPosture(s: CaseState): number {
  if (!s.lifecycleUse) return 1.0;
  const b = lifecycleBlend(s);
  const pl = b.lo.autoPosture ?? 1.0, ph = b.hi.autoPosture ?? 1.0;
  return pl + (ph - pl) * b.frac;
}
