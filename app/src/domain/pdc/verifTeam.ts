/** @calc-zone verification-verdict */
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { model } from '../model/overlay';
import { targetTeam as targetTeamOf, type TargetTeam } from '../verifyA/targetTeam';
import type { ModelResult } from '../types/model';

/** Delivery + agentic run team FTE in year index y (legacy humanFte()). */
export const humanFte = (m: ModelResult, y: number): number => (m.yearETP[y] || 0) + (m.yearRunAgenticETP?.[y] || 0);

/** Target team at the horizon end: the verifyA owner applied to the live case of `c` (model and engine are cached per context). */
export const targetTeam = (c: Ctx): TargetTeam => targetTeamOf({ c, m: model(c), eng: engineNow(c) });

export type { TargetTeam };
