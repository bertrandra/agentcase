import { MATURITY_DEFAULT } from '../catalog';
import type { Ctx } from '../ctx';
import { engagementCoef } from '../engagement';
import type { ModelResult } from '../types/model';
import type { CaseState } from '../types/state';
import { endYear, endYearRow, modelOf } from './memo';

/** The single definition of the L1–L4 thresholds (legacy MATURITY_MAP). Only rampBounds reach the Time Engine. */
export interface MaturityMap { rampBounds: number[]; shareBounds: number[]; labels: string[]; auth: string[]; sup: string[] }

export const MATURITY_DEFAULTS = MATURITY_DEFAULT as unknown as MaturityMap;

/** The case's map; any part the case does not carry takes the shipped default. */
export const maturityMapFrom = (own: unknown): MaturityMap => ({ ...MATURITY_DEFAULTS, ...((own ?? {}) as Partial<MaturityMap>) });
export const maturityMapOf = (s: CaseState): MaturityMap => maturityMapFrom(s.MATURITY_MAP);

/** Highest level whose lower bound `v` has reached. */
export function levelFromBounds(v: number, bounds: number[]): number {
  let l = 1;
  for (let i = 1; i < bounds.length; i++) if (v >= (bounds[i] as number)) l = i + 1;
  return l;
}

/** "25–55%" ranges of the adoption axis (legacy maturityRampLevels). */
export function rampRanges(bounds: number[]): string[] {
  return bounds.map((th, i) => `${Math.round(th)}–${Math.round(i + 1 < bounds.length ? (bounds[i + 1] as number) : 100)}%`);
}

export interface MaturityInfo { rampY3: number; share: number; lr: number; ls: number; raw: number; capped: number; cap: number; diverge: boolean }

/** Maturity of a case: the lower of the adoption axis and the agent-share axis, capped by the engagement context. */
export function maturityInfo(c: Ctx, m: ModelResult = modelOf(c)): MaturityInfo {
  const n = m.ramps.length - 1;
  let rampY3 = m.ramps[n] as number, f = m.yearETP[n] as number, v = m.yearAgentVfte[n] as number;
  try {
    if (endYear(c) > 3) { const e = endYearRow(c); rampY3 = e.adoptionEndPct; f = e.humanFteEnd; v = e.agentVfteEnd; }
  } catch { /* keep the flat-model values */ }
  const share = f + v > 0 ? (v / (f + v)) * 100 : 0, mm = maturityMapOf(c.s);
  const lr = levelFromBounds(rampY3, mm.rampBounds), ls = levelFromBounds(share, mm.shareBounds);
  const raw = Math.min(lr, ls), cap = engagementCoef(c).maturityCap;
  return { rampY3, share, lr, ls, raw, capped: Math.min(raw, cap), cap, diverge: Math.abs(lr - ls) > 1 };
}
