import { current } from 'immer';
import { makeCtx, phaseScopeOf } from '@/domain';
import { autoCapFrom } from '@/domain/inputs';
import type { Doc } from './types';

/** Technical cap on the automation potential (autoCapPct input, 10..100). */
export function autoTechCap(d: Doc): number {
  return autoCapFrom(d.dom.values.autoCapPct);
}

/** Fit-to-scope: when `fitAuto` is on, the potential follows the scope's effort-weighted automatable share (legacy applyScopeAuto). */
export function refitPotential(draft: Doc): void {
  if (!draft.dom.checked.fitAuto) return;
  const sc = phaseScopeOf(makeCtx(current(draft) as Doc));
  draft.dom.values.autoPotential = String(Math.max(0, Math.min(autoTechCap(draft), Math.round(sc.avgAgent))));
}
