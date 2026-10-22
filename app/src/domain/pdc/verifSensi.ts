/** @calc-zone verification-verdict */
import { makeCtx, type Ctx } from '../ctx';
import { headline } from '../economics/headline';
import { horizonYears } from '../model/horizonYears';
import { model } from '../model/overlay';
import type { CaseState } from '../types/state';
import { fx } from './verifFormat';

export interface SensiRow { variation: string; expected: string; observed: string; ok: boolean | null }

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Directional validation: nudge one lever, the savings and the Y3 delivery FTE must move the right way (null = the variant cannot move: at its limit). */
export function directionalSensitivity(c: Ctx): SensiRow[] {
  const m = model(c), baseSav = sum(horizonYears(c).sav), baseRoi = headline(c).roi, baseFte = m.yearETP[2]!;
  const variant = (patch: Record<string, string>, force: boolean) => {
    const s: CaseState = { ...c.s, dom: { ...c.s.dom, values: { ...c.s.dom.values, ...patch } }, forceGlassCeiling: force || c.s.forceGlassCeiling };
    const vc = makeCtx(s);
    return { sav: sum(horizonYears(vc).sav), r: headline(vc).roi, f: model(vc).yearETP[2]! };
  };
  const atCap = m.eff >= 100 - m.ceiling - 1e-9, dnAuto = Math.max(0, m.auto - 10), upAuto = atCap ? dnAuto : Math.min(80, m.auto + 10), upCeil = Math.min(100, m.ceiling + 10), tol = 1e-9;
  const vUp = variant({ autoPotential: String(upAuto) }, false), vCeil = variant({ glassCeiling: String(upCeil) }, true);
  const okUp = atCap ? (dnAuto < m.auto ? vUp.f >= baseFte - tol && vUp.sav < baseSav - tol : null) : (upAuto > m.auto ? vUp.f <= baseFte + tol && vUp.sav > baseSav + tol : null);
  const okCeil = upCeil > m.ceiling ? vCeil.f >= baseFte - tol && vCeil.sav < baseSav - tol : null;
  const seen = (v: { f: number; r: number | null }) => `FTE ${v.f.toFixed(1)} (vs ${baseFte.toFixed(1)}) · ROI ${fx(v.r)} (vs ${fx(baseRoi)})`;
  return [
    { variation: atCap ? 'Auto −10pts' : 'Auto +10pts', expected: atCap ? 'FTE Y3 ↑, ROI ↓' : 'FTE Y3 ↓, ROI ↑', observed: seen(vUp), ok: okUp },
    { variation: 'Glass ceiling +10pts', expected: 'FTE Y3 ↑, ROI ↓', observed: seen(vCeil), ok: okCeil },
  ];
}
