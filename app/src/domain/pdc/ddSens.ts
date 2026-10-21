import { engineNow } from '../canonical';
import { ENGAGE_COEF } from '../catalog';
import { makeCtx, type Ctx } from '../ctx';
import { engagementKey } from '../engagement';
import type { CaseState } from '../types/state';
import { computeGlassCeiling } from '../model/ceiling';
import { ASSUMPTION_DEFS } from './assumptions';
import coefficients from './ddCoefficients.json';

/** One-at-a-time euro sensitivity of the due-diligence register (legacy P13c): |change of the horizon-end savings| for a +20 % perturbation. */
export interface DdSens { fp: string; base: number; w: Record<string, number>; unmeasurable: string[]; at: string }
export const DD_PERTURB = 0.2;


const endSavings = (s: CaseState): number => { const ys = engineNow(makeCtx(s)).years(); return ys[ys.length - 1]?.savings ?? NaN; };

/** Content hash of everything the measurement depends on, so a stale measurement is recognised after any edit. */
export function ddFingerprint(c: Ctx): string {
  const s = c.s as unknown as Record<string, unknown>, src = JSON.stringify([s.dom, [...(c.a.selected)].sort(), [...(c.a.selectedReg)].sort(), s.artefactsEdited, s.QUALITY, s.DORA_ANCHORS, s.THROUGHPUT_ANCHORS, s.COEF, s.engageCoef, s.statusLifecycle]);
  let h = 2166136261;
  for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function computeDdSensitivity(c: Ctx, now: () => string = () => new Date().toISOString()): DdSens {
  const s = c.s, base = endSavings(s), w: Record<string, number> = {}, bad: string[] = [];
  const delta = (alt: CaseState) => { const v = endSavings(alt); return isNaN(v) ? 0 : Math.abs(v - base); };
  const withValue = (id: string, v: string): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, [id]: v } } });
  for (const a of ASSUMPTION_DEFS) {
    const raw = a.id === 'horizon' ? c.inp.v(a.id) : s.dom.values[a.id], num = parseFloat(raw as string);
    if (isNaN(num)) { bad.push(`in-${a.id}`); continue; }
    w[`in-${a.id}`] = delta(withValue(a.id, String(num === 0 ? 1 : num * (1 + DD_PERTURB))));
  }
  const key = engagementKey(c), table = s.engageCoef ?? ENGAGE_COEF;
  for (const [id, f] of [['cf-glassfactor', 'glassFactor'], ['cf-rampcap', 'rampCapPct'], ['cf-rampspeed', 'rampSpeed']] as const) {
    const row = table[key];
    if (row) w[id] = delta({ ...s, engageCoef: { ...table, [key]: { ...row, [f]: row[f] * (1 + DD_PERTURB) } } });
  }
  for (const x of coefficients) {
    const k = (x as { k?: string }).k;
    if (!k) continue;
    const cur = s.COEF[k];
    if (typeof cur !== 'number') bad.push(x.id); else w[x.id] = delta({ ...s, COEF: { ...s.COEF, [k]: cur * (1 + DD_PERTURB) } });
  }
  // The legacy measured four engine functions by wrapping them (output x 1.2). The same perturbation reaches the model through its inputs:
  // vtaxEffBase is linear in vtaxBase; khMult and lifecycleAutoPosture only ever enter the automation depth as a product with glassFactor;
  // computeGlassCeiling is only read when the ceiling is not forced (then it feeds the forced-ceiling path with its perturbed value).
  const vb = parseFloat(s.dom.values.vtaxBase as string);
  w['cf-vtax-base'] = delta(withValue('vtaxBase', String((isNaN(vb) ? 0.3 : vb) * (1 + DD_PERTURB))));
  const row = table[key];
  w['cf-khmult'] = w['cf-autoposture'] = row ? delta({ ...s, engageCoef: { ...table, [key]: { ...row, glassFactor: row.glassFactor * (1 + DD_PERTURB) } } }) : 0;
  w['cf-ceiling'] = s.forceGlassCeiling ? 0 : delta({ ...withValue('glassCeiling', String(computeGlassCeiling(c) * (1 + DD_PERTURB))), forceGlassCeiling: true });
  const d = s as unknown as { DORA_ANCHORS?: { id: string }[]; THROUGHPUT_ANCHORS?: { id: string }[]; QUALITY?: unknown[] };
  for (const a of [...(d.DORA_ANCHORS ?? []), ...(d.THROUGHPUT_ANCHORS ?? [])]) w[`an-${a.id}`] = 0;      // display path only: no euro path by construction
  (d.QUALITY ?? []).forEach((_, i) => { w[`an-q${i}`] = 0; });
  return { fp: ddFingerprint(c), base, w, unmeasurable: bad, at: now() };
}
