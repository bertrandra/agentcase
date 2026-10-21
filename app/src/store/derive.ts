import { current } from 'immer';
import { makeCtx, phaseScopeOf } from '@/domain';
import type { Doc } from './types';

/** Technical cap on the automation potential (autoCapPct input, 10..100). */
export function autoTechCap(d: Doc): number {
  const v = parseFloat(d.dom.values.autoCapPct ?? '');
  return isNaN(v) ? 100 : Math.max(10, Math.min(100, v));
}

/** Fit-to-scope: when `fitAuto` is on, the potential follows the scope's effort-weighted automatable share (legacy applyScopeAuto). */
export function refitPotential(draft: Doc): void {
  if (!draft.dom.checked.fitAuto) return;
  const sc = phaseScopeOf(makeCtx(current(draft) as Doc));
  draft.dom.values.autoPotential = String(Math.max(0, Math.min(autoTechCap(draft), Math.round(sc.avgAgent))));
}
