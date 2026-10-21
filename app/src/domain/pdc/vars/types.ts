import type { Ctx } from '../../ctx';
import { engineOf as engineNow } from '../../tune/memo';
import type { McResult } from '../../stress';
import type { AssumptionBase } from '../assumptions';
import type { DdDoc } from '../dd';

export type VarValue = number | string | boolean | null | undefined;

/**
 * Session state a variable may read that the document does not hold: the last Monte Carlo run (store/simulation), the tornado of the last
 * stochastic run (controllers/modelRun) and the benchmark document of the due-diligence register. The UI fills it; an empty one is the
 * legacy "nothing run yet".
 */
export interface VarRuntime { mc: McResult | null; tornado: { id: string; swing: number }[] | null; ddBase: (DdDoc & AssumptionBase) | null }
export const NO_RUNTIME: VarRuntime = { mc: null, tornado: null, ddBase: null };

export interface VariableDef { id: string; label: string; format: string; unit: string; scope: string; get: (c: Ctx, rt?: VarRuntime) => VarValue }

/** One registry entry; the getter always receives a runtime (the empty one when the caller has none). */
export const v = (id: string, label: string, format: string, unit: string, scope: string, get: (c: Ctx, rt: VarRuntime) => VarValue): VariableDef =>
  ({ id, label, format, unit, scope, get: (c, rt) => get(c, rt ?? NO_RUNTIME) });

/** The engine's aggregate of the last horizon year (legacy teEndYearRow()). */
export const end = (c: Ctx) => { const ys = engineNow(c).years(); return ys[ys.length - 1]!; };
/** Index of the last horizon year (legacy teEndYear() - 1). */
export const endIdx = (c: Ctx): number => engineNow(c).years().length - 1;
export const sumSav = (c: Ctx): number => engineNow(c).years().reduce((a, y) => a + y.savings, 0);
