import type { Ctx } from '../ctx';
import { statusTable } from '../lifecycle';
import { verificationTaxRate, sddMaturity, vtaxAvgHuman } from '../model/vtax';
import { activeArtefacts } from '../scope';
import { maturityInfo } from './maturity';
import { endYear, endYearRow, modelOf } from './memo';

/** EV-15 eligibility gate: six prerequisites, the first four critical. */
export const ELIG_PREREQS: { id: string; label: string; critical: boolean }[] = [
  { id: 'plat', label: 'Agent-accessible platform (API / MCP)', critical: true },
  { id: 'tech', label: 'Mastered tech & standard architecture', critical: true },
  { id: 'spec', label: 'Clear & stable specifications', critical: true },
  { id: 'scope', label: 'Bounded scope (< 500k LoC)', critical: true },
  { id: 'client', label: 'Open & collaborative client', critical: false },
  { id: 'res', label: 'Committed qualified resources', critical: false },
];
export const NATURE_LABEL: Record<string, string> = { standard: 'Standard', embedded: 'Embedded/firmware', critical: 'Critical/safety', sovereign: 'Sovereign/air-gap' };

export const eligState = (c: Ctx, id: string): string => c.inp.v('elPre_' + id) || 'met';
export const eligLoc = (c: Ctx): number => { const v = c.inp.p('elLoc'); return isNaN(v) ? 150 : v; };
export const eligNature = (c: Ctx): string => c.inp.v('elNature') || 'standard';

export interface EligVerdict { verdict: 'go' | 'conditional' | 'no-go'; unmetCrit: number; partial: number; notes: string[] }
export function eligVerdict(c: Ctx): EligVerdict {
  let unmetCrit = 0, partial = 0;
  const notes: string[] = [];
  for (const p of ELIG_PREREQS) {
    const st = eligState(c, p.id);
    if (st === 'unmet') { if (p.critical) { unmetCrit++; notes.push(`${p.label} (critical) not met`); } else { partial++; notes.push(`${p.label} not met`); } }
    else if (st === 'partial') partial++;
  }
  if (eligLoc(c) > 500) { unmetCrit++; notes.push('Codebase > 500k LoC — global eligibility fails (may stay eligible per task)'); }
  const nature = eligNature(c);
  if (nature !== 'standard') { partial++; notes.push(`${NATURE_LABEL[nature] ?? nature} hardens prerequisites and lowers engageable maturity`); }
  return { verdict: unmetCrit > 0 ? 'no-go' : partial > 0 ? 'conditional' : 'go', unmetCrit, partial, notes };
}
export const VERDICT_VIEW = {
  go: { color: '#00828E', text: 'GO — eligible' },
  conditional: { color: '#BE4D00', text: 'CONDITIONAL — eligible per task, close the gaps' },
  'no-go': { color: '#8F3237', text: 'NO-GO — not globally eligible' },
};

/** EV-13 product profiles (one source of truth: the lifecycle position anchor) and the 12 phases of the potential matrix. */
export const PRODUCT_PROFILES: { id: string; label: string; status: string; pos: number }[] = [
  { id: 'greenfield', label: 'Greenfield', status: 'inception', pos: 0 },
  { id: 'feature', label: 'Feature add', status: 'growth', pos: 25 },
  { id: 'maintenance', label: 'Maintenance', status: 'maturity', pos: 50 },
  { id: 'modernisation', label: 'Modernisation', status: 'decline', pos: 75 },
];
export const PROFILE_PHASES = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'L8', 'L9', 'L10', 'Cross-cutting'];
export const profileById = (id: string) => PRODUCT_PROFILES.find((p) => p.id === id) ?? (PRODUCT_PROFILES[1] as (typeof PRODUCT_PROFILES)[number]);
export function currentProfileId(lifecyclePos: number): string {
  if (lifecyclePos >= 87.5) return 'maintenance';
  let best = PRODUCT_PROFILES[1] as (typeof PRODUCT_PROFILES)[number];
  for (const p of PRODUCT_PROFILES) if (Math.abs(p.pos - lifecyclePos) < Math.abs(best.pos - lifecyclePos)) best = p;
  return best.id;
}
/** Lever of a (profile, phase) cell = the phase weight of the mapped status. */
export function profileCoef(c: Ctx, profile: string, phase: string): number {
  const st = statusTable(c.s).find((x) => x.id === profileById(profile).status);
  return st?.weights?.[phase] ?? 1.0;
}
export const leverWord = (x: number): string => (x >= 0.85 ? 'Strong' : x >= 0.6 ? 'Medium' : x > 0 ? 'Cautious' : 'n/a');
export const leverColor = (x: number): string => (x >= 0.85 ? '#00828E' : x >= 0.6 ? '#BE4D00' : x > 0 ? '#8F3237' : '#999');

/** EV-27 Abaque A (addressable effort reduction per activity, [min,max] %) and Abaque B (share captured per maturity level). */
const ABAQUE_A: Record<string, [number, number]> = { plan: [5, 20], design: [20, 40], coding: [30, 60], buildint: [20, 40], test: [30, 70], deploy: [10, 30], operate: [20, 40], xcut: [10, 30] };
const ABAQUE_B: Record<number, [number, number]> = { 1: [0, 15], 2: [30, 50], 3: [50, 75], 4: [75, 100] };
const mid = (a: [number, number]) => (a[0] + a[1]) / 2;
export const abaqueCeiling = (act: string): number => mid(ABAQUE_A[act] ?? [100, 100]) / 100;
const PILLAR_LEVER: Record<string, Record<string, number>> = {
  greenfield: { plan: 0.7, design: 1, coding: 1, buildint: 1, test: 1, deploy: 0.7, operate: 0.7, xcut: 1 },
  feature: { plan: 0.7, design: 0.7, coding: 1, buildint: 1, test: 1, deploy: 0.7, operate: 0.7, xcut: 1 },
  modernisation: { plan: 0.7, design: 0.45, coding: 0.7, buildint: 0.7, test: 1, deploy: 0.45, operate: 0.7, xcut: 1 },
  maintenance: { plan: 0.7, design: 0, coding: 0.7, buildint: 0.7, test: 1, deploy: 0.7, operate: 1, xcut: 1 },
};
const SDLC_ACTIVITY: Record<string, string> = { L0: 'plan', V1: 'plan', V2: 'design', V3: 'coding', V5: 'buildint', V4: 'test', V6: 'test', V7: 'test', L8: 'deploy', L9: 'operate', L10: 'operate', 'Cross-cutting': 'xcut' };
export const ACTIVITY_LABEL: Record<string, string> = { plan: 'Plan / Analyse', design: 'Design', coding: 'Coding', buildint: 'Build / Integrate', test: 'Test', deploy: 'Deploy', operate: 'Operate', xcut: 'Cross-cutting' };
export const PHASE_LABEL: Record<string, string> = {
  L0: 'L0 Upstream', V1: 'V1 Specification', V2: 'V2 Design', V3: 'V3 Implementation', V4: 'V4 Verification', V5: 'V5 Integration', V6: 'V6 Validation',
  V7: 'V7 Qualification', L8: 'L8 Deployment', L9: 'L9 Run / AMS', L10: 'L10 End-of-life', 'Cross-cutting': 'Cross-cutting',
};

export const pillarApplyOn = (c: Ctx): boolean => c.inp.c('pillarApply');
export const pillarKey = (c: Ctx): string => { const p = currentProfileId(c.s.lifecyclePos); return PILLAR_LEVER[p] ? p : 'feature'; };

/** Review need before supervision credit: vtaxBase x (1 - half the SDD maturity). */
export function vtaxEffBase(c: Ctx): number {
  let base = c.inp.p('vtaxBase'); if (isNaN(base)) base = 0.3;
  return base * (1 - 0.5 * (sddMaturity(c) / 100));
}
export const vtaxModeOf = (c: Ctx): 'net' | 'overlay' => (c.inp.v('vtaxMode') === 'net' ? 'net' : 'overlay');

export interface AbaqueRow { ph: string; act: string; w: number; addressable: number; lever: number; captured: number; tax: number; net: number }
/** Per-phase reconciliation: Abaque A x Abaque B (at the reached level) x pillar leverage, minus the proportional review drag. */
export function abaqueRows(c: Ctx) {
  const lvl = maturityInfo(c).capped, bCap = mid(ABAQUE_B[lvl] ?? (ABAQUE_B[2] as [number, number])) / 100;
  const lever = PILLAR_LEVER[pillarKey(c)] as Record<string, number>, applyP = pillarApplyOn(c);
  const by: Record<string, { w: number; h: number }> = {};
  for (const a of activeArtefacts(c.a, c.s)) {
    const o = (by[a.phase || 'Cross-cutting'] ??= { w: 0, h: 0 }), ww = +a.w || 0;
    o.w += ww; o.h += (ww * (+a.humanSup || 0)) / 100;
  }
  const vTaxRate = verificationTaxRate(c), rows: AbaqueRow[] = [];
  for (const ph of Object.keys(PHASE_LABEL)) {
    const act = SDLC_ACTIVITY[ph] ?? 'xcut', o = by[ph];
    if (!o || !(o.w > 0)) continue;
    const addressable = mid(ABAQUE_A[act] ?? [0, 0]) / 100, lev = applyP ? (lever[act] !== undefined ? (lever[act] as number) : 1) : 1;
    const captured = addressable * bCap * lev, avgHuman = o.w > 0 ? o.h / o.w : 0.5;
    const tax = captured * (vTaxRate > 0 ? (vTaxRate / 0.6) * avgHuman * 0.6 : 0);
    rows.push({ ph, act, w: o.w, addressable, lever: lev, captured, tax, net: Math.max(0, captured - tax) });
  }
  return { rows, lvl, bCap, vTaxRate };
}

export interface TaxExplain { base: number; avgHuman: number; mode: 'net' | 'overlay'; rateOverlay: number; rateNet: number; gross: number; applied: boolean; yearly: number[] }
/** The figures behind the two verification-tax cases (Case 1 overlay / Case 2 net). */
export function taxExplain(c: Ctx): TaxExplain {
  const m = modelOf(c), base = vtaxEffBase(c), avgHuman = vtaxAvgHuman(c);
  let runEnd = m.yearRun[m.yearRun.length - 1] as number;
  try { if (endYear(c) > 3) runEnd = endYearRow(c).totalRunCost; } catch { /* flat model */ }
  const cap = 0.6;
  return {
    base, avgHuman, mode: vtaxModeOf(c), rateOverlay: Math.min(cap, base * avgHuman), rateNet: Math.min(cap, Math.max(0, base - avgHuman)),
    gross: m.base.cost - runEnd, applied: c.inp.c('vtaxApply'), yearly: m.conv?.vTaxYr ?? [0, 0, 0],
  };
}
