import { SUP_REF_HOURS_PER_PERIOD } from '../catalog';
import type { Ctx } from '../ctx';

const num = (c: Ctx, id: string, dflt: number) => { const v = parseFloat(c.inp.v(id)); return isNaN(v) ? dflt : v; };
const supOn = (c: Ctx) => !!c.s.MODEL.FLAGS?.sup;
const constrained = (c: Ctx) => supOn(c) && c.s.MODEL.SUP.provision === 'constrained';

function supSpanFor(c: Ctx, baseEtp: number) {
  const rfMin = num(c, 'runFloorMin', 0.5), rfPct = num(c, 'runFloorPct', 4), rOps = num(c, 'runOpsPerAgent', 0.15);
  const hpp = c.s.MODEL.SUP.hoursPerPeriod;
  return { floor: Math.max(rfMin, (baseEtp * rfPct) / 100), rOps: hpp > 0 ? rOps * (SUP_REF_HOURS_PER_PERIOD / hpp) : rOps };
}

function supRampMultiplier(c: Ctx, yearIdx: number): number {
  const lambda = Math.max(0, Math.min(0.5, c.s.MODEL.SUP.rampRate || 0));
  const cap = Math.max(1, Math.min(4, c.s.MODEL.SUP.rampCap || 2.5));
  return Math.min(cap, Math.pow(1 + lambda, yearIdx || 0));
}

export function supMaxVfte(c: Ctx, esup: number, baseEtp: number, yearIdx: number): number {
  const span = supSpanFor(c, baseEtp);
  if (esup < span.floor) return 0;
  const rOpsEff = span.rOps > 0 ? span.rOps / supRampMultiplier(c, yearIdx) : span.rOps;
  return rOpsEff > 0 ? (esup - span.floor) / rOpsEff : Infinity;
}

/** Supervision ceiling on the achievable agent vFTE (constrained mode only). */
export function supCeilVfte(c: Ctx, vRaw: number, baseEtp: number, yearIdx: number): number {
  if (!constrained(c)) return vRaw;
  const vm = supMaxVfte(c, Math.max(0, c.s.MODEL.SUP.supervisors || 0), baseEtp, yearIdx);
  if (c.s.MODEL.SUP.mode === 'soft') return vm === Infinity || vRaw <= 0 ? vRaw : vRaw / (1 + vRaw / vm);
  return Math.min(vRaw, vm);
}

export function supApplyCeiling(c: Ctx, raw: number[], baseEtp: number) {
  if (!constrained(c)) return null;
  const esup = Math.max(0, c.s.MODEL.SUP.supervisors || 0);
  const vfte = raw.map((v, i) => supCeilVfte(c, v, baseEtp, i));
  return { vfte, etp: vfte.map((v) => baseEtp - v), vMax: raw.map((_, i) => supMaxVfte(c, esup, baseEtp, i)), esup };
}

export function supRunCostFor(c: Ctx, etp: number[], tgtTjm: number, wd: number, runTeamF: number): number[] {
  const override = supOn(c) && c.s.MODEL.SUP.supervisorCost > 0;
  return etp.map((e) => (override ? e * c.s.MODEL.SUP.supervisorCost * wd : e * tgtTjm * 1.15 * wd * runTeamF));
}
