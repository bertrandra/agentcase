import type { Ctx } from '../ctx';
import type { McsResult } from '../model/mcs';
import type { DepEdges, DepSection } from '../refshare/deps';
import names from './verifConvNames.json';

export interface ConvCheck { id: string; name: string; pass: boolean; detail: string }

/**
 * Session state the legacy checks read from the running page rather than from the case (never part of the document):
 *  - mcsLast: the last stochastic run (MCS_LAST). CC-MC-01/02 and the evidence weights read it; null until a run exists.
 *  - sections / deps: the section catalogue and the dependency registry (SECTION_CATALOG / SECTION_DEPS).
 *  - playbackHorizon: horizon of the Monthly Playback series while it is playing (MP.series.horizon), null when idle.
 */
export interface ConvRuntime { mcsLast?: McsResult | null; sections?: DepSection[]; deps?: DepEdges; playbackHorizon?: number | null }
export type ConvFamily = (c: Ctx, rt: ConvRuntime) => ConvCheck[];

export const OK = 'no violation detected';
const NAMES = names as Record<string, string>;

/** Row of a check registered through AUDIT.registerCheck: `violation` is the check's message, null when it holds (legacy text: 'no violation detected'). */
export function audit(id: string, violation: string | null): ConvCheck {
  return { id, name: NAMES[id] ?? id, pass: violation === null, detail: violation ?? OK };
}

/** Same, running the check body the way AUDIT.runChecks() does: an exception becomes a violation 'check threw: …'. */
export function auditTry(id: string, body: () => string | null): ConvCheck {
  let v: string | null;
  try { v = body(); } catch (e) { v = `check threw: ${e instanceof Error && e.message ? e.message : 'unknown'}`; }
  return audit(id, v);
}

/** Row of a wave check (computed directly by renderConvChecks, with its own pass flag and detail). */
export const wave = (id: string, pass: boolean, detail: string): ConvCheck => ({ id, name: NAMES[id] ?? id, pass, detail });
