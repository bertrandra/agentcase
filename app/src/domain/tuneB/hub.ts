/** @calc-zone delivery-views */
import { CC_MULT } from '../catalog';
import { makeCtx, type Ctx } from '../ctx';
import { engagementCoef, engagementKey } from '../engagement';
import { khAsisCC, khAsisScore, khEnabled, khTargetCC } from '../knowledge';
import { horizonYears } from '../model/horizonYears';
import { model } from '../model/overlay';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export interface HubView {
  on: boolean; locked: boolean; context: string; maxCC: number; rawTarget: number; clamped: boolean;
  asisScore: number; asisCC: number; target: number; mult: number; mcSigma: number; sigmaFactor: number;
  dEff: number; dSav: number; kt: number; hubCost: number; effCap: number;
}

/** Knowledge-hub read-out (legacy renderKnowledgeHub): channels 1-3, hub cost and the delta against the same case with the hub off. */
export function hubView(c: Ctx): HubView {
  const coef = engagementCoef(c), on = khEnabled(c), m = model(c), tgt = khTargetCC(c);
  const raw = parseInt(c.inp.v('khTargetCC'), 10) || 3;
  let dEff = 0, dSav = 0;
  if (on) {
    const off = makeCtx({ ...c.s, dom: { ...c.s.dom, checked: { ...c.s.dom.checked, khEnabled: false } } },
      { rateScale: c.rateScale, tokenScale: c.tokenScale });
    const m0 = model(off);
    dEff = m.eff - m0.eff; dSav = sum(horizonYears(c).sav) - sum(horizonYears(off).sav);
  }
  return {
    on, locked: coef.khMaxCC <= 0, context: engagementKey(c), maxCC: coef.khMaxCC, rawTarget: raw, clamped: raw > coef.khMaxCC && coef.khMaxCC > 0,
    asisScore: khAsisScore(c), asisCC: khAsisCC(c), target: tgt, mult: CC_MULT[tgt] as number, mcSigma: 8 * tgt, sigmaFactor: 1 - 0.08 * tgt,
    dEff, dSav, kt: sum(m.conv.ktAvoidYr), hubCost: m.conv.khSetup + sum(m.conv.khRunYr), effCap: m.conv.effCap,
  };
}
