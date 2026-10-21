import type { Ctx } from '../ctx';
import { phaseScope, totalEffort } from '../scope';

export interface Anchor { id: string; label?: string; asis: number; target: number; fmt?: string; dir?: string }

/** Default DORA / velocity anchors (legacy DORA_ANCHORS_DEFAULT): used when the case does not carry the anchor. */
export const DORA_DEFAULT: Anchor[] = [
  { id: 'deployFreq', label: 'Deploy frequency', asis: 0.75, target: 14, fmt: 'wk', dir: 'up' },
  { id: 'leadTime', label: 'Lead time', asis: 21, target: 1, fmt: 'd', dir: 'down' },
  { id: 'mttr', label: 'MTTR', asis: 5, target: 0.75, fmt: 'h', dir: 'down' },
  { id: 'changeFail', label: 'Change failure', asis: 17, target: 4, fmt: 'p', dir: 'down' },
  { id: 'velocitySp', label: 'Velocity (SP/sprint)', asis: 35, target: 59, fmt: 'n', dir: 'up' },
];

/** The case's anchor `id` (editable in the due-diligence register), else the default. */
export function daGet(c: Ctx, id: string): Anchor {
  const own = (c.s as unknown as { DORA_ANCHORS?: Anchor[] }).DORA_ANCHORS;
  return own?.find((a) => a.id === id) ?? DORA_DEFAULT.find((a) => a.id === id)!;
}

/** Clamp the interpolation to the declared [as-is, target] interval, whichever way the metric improves. */
export function anchorClamp(asis: number, target: number, r: number): number {
  const v = asis + (target - asis) * r;
  return target >= asis ? Math.min(v, target) : Math.max(v, target);
}

/** Effort-weighted average agent supervision of the full catalogue (+ active regulatory artefacts). */
export function refAvgAgent(c: Ctx): number {
  const t = totalEffort(c.a, c.s);
  return t ? c.a.sdlc.reduce((s, a) => s + (+a.w || 0) * a.agentSup, 0) / t : 0;
}

/** Performance realisation of an adoption ramp (0..perfRelCap), relative to the reference uplift. */
export function perfRel(c: Ctx, ramp: number): number {
  const d = (refAvgAgent(c) / 100) * (c.s.COEF.perfUpliftFactor ?? 0.85);
  const up = (phaseScope(c.a, c.s).avgAgent / 100) * (ramp / 100);
  return d ? Math.max(0, Math.min(c.s.COEF.perfRelCap ?? 1.4, up / d)) : 0;
}
