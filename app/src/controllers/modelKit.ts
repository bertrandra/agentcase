/** @calc-zone time-engine */
import { current } from 'immer';
import { makeCtx, type Ctx } from '@/domain';
import { LOOP_PAIRS } from '@/domain/catalog';
import { lceLoops } from '@/domain/model/lce';
import type { Doc } from '@/store/types';

/** Shared helpers of the Model-Engine controllers (no commands here). */

/** Number the way the legacy handlers read an input: parseFloat of the raw value, `dflt` when it does not parse. */
export const parseNum = (v: unknown, dflt: number): number => { const x = parseFloat(String(v)); return isNaN(x) ? dflt : x; };
export const parseInteger = (v: unknown, dflt: number): number => { const x = parseInt(String(v), 10); return isNaN(x) ? dflt : x; };
export const clampNum = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Engine context of the document as it is right now inside a command (Immer draft snapshot). */
export const ctxOfDraft = (d: Doc): Ctx => makeCtx(current(d) as Doc);

/** Build MODEL.LCE.loops (calibrated on the legacy counts) when absent or not built yet, like legacy lceEnsureCalibrated(). Idempotent. */
export function ensureLceBuilt(d: Doc): void {
  const lce = d.MODEL.LCE;
  const need = !Array.isArray(lce.loops) || lce.loops.length !== LOOP_PAIRS.length || (!lce.calibrated && !lce.built);
  if (!need) return;
  const r = lceLoops(ctxOfDraft(d));
  lce.loops = r.loops; lce.calibrated = r.calibrated; lce.built = true;
}
