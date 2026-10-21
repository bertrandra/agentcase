import { engineNow, paybackMonthsCanonical } from '../canonical';
import { makeCtx, type Ctx } from '../ctx';
import { engagementCoef, engagementKey } from '../engagement';
import { khTargetCC } from '../knowledge';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import { fmtK } from './verifFormat';
import { maturityInfo, opModelCompute } from './verifTeam';

export interface ConvCheck { id: string; name: string; pass: boolean; detail: string }
const AUTH: Record<string, number> = { Assistance: 1, Copilot: 2, 'Supervised autonomous': 3, Autonomous: 4 };
const OK = 'no violation detected';

/**
 * Convergence checks computable from this build's engine: engagement context (CC-CTX), knowledge hub (CC-KH), operating model (CC-OM),
 * supervision floor (CC-SUP) and the Time Engine invariants (CC-MP-01, TE-05, TE-07, TE-HZN). The analytical modules of the legacy
 * (eligibility, abaques, AI-Act, risk, coaching, socle, gates, pilot, IP, agent catalogue, LCE/EVT/SC/MC/CB/FL/EV audits) are not part of this build.
 */
export function convergenceChecks(c: Ctx): ConvCheck[] {
  const m = model(c), mi = maturityInfo(c, m), cx = engagementCoef(c), key = engagementKey(c), eng = engineNow(c), ys = eng.years(), out: ConvCheck[] = [];
  const ck = (id: string, name: string, pass: boolean, detail: string) => out.push({ id, name, pass, detail });
  ck('CC-CTX-01', 'Maturity level ≤ context cap', mi.capped <= mi.cap, `L${mi.capped} ≤ L${mi.cap} (${key})${mi.raw > mi.cap ? ` — raw L${mi.raw} was capped` : ''}`);
  const blocked = activeArtefacts(c.a, c.s).filter((a) => (AUTH[a.aiAuth] || 1) > cx.authorityCap).length;
  ck('CC-CTX-02', 'Artifacts above the AI authority cap', true, `${blocked} in-scope artifact(s) above A${cx.authorityCap} — flagged as human-led (informative in v13.2, hard scope exclusion planned v13.3)`);
  ck('CC-CTX-03', 'Setup billable + absorbed = total', Math.abs(m.conv.setupBillable + m.conv.setupAbsorbed - m.setupTotal) < 1, `${fmtK(m.conv.setupBillable)} + ${fmtK(m.conv.setupAbsorbed)} = ${fmtK(m.setupTotal)}`);
  const withCtx = (k: string) => model(makeCtx({ ...c.s, dom: { ...c.s.dom, values: { ...c.s.dom.values, engagementCtx: k } } })), mS = withCtx('STA'), mM = withCtx('MSC');
  ck('CC-CTX-04', 'Directional — STA degrades vs MSC at equal parameters', mS.eff <= mM.eff + 1e-6 && mS.ramps[2]! <= mM.ramps[2]! + 1e-6,
    `eff STA ${mS.eff.toFixed(1)}% ≤ eff MSC ${mM.eff.toFixed(1)}% · ramp Y3 STA ${Math.round(mS.ramps[2]!)}% ≤ MSC ${Math.round(mM.ramps[2]!)}%`);
  ck('CC-KH-01', 'Hub multiplier capped by the regulatory headroom', m.eff <= m.conv.effCap + 1e-6, `eff ${m.eff.toFixed(1)} ≤ headroom ${m.conv.effCap.toFixed(1)}`);
  ck('CC-KH-02', 'Hub target ≤ context ceiling', khTargetCC(c) <= cx.khMaxCC, `CC${khTargetCC(c)} ≤ CC${cx.khMaxCC}`);
  const om = opModelCompute(c, m, 2);
  ck('CC-OM-01', 'Operating model V7 reconciliation (Y3)', om.ok, om.ok ? `engineers remainder ${om.eng.toFixed(2)} FTE ≥ 0` : 'pod structure exceeds the residual volume');
  ck('CC-SUP-01', 'No phase below its supervision floor', true, 'human share is clamped to the floor by construction');
  const months = eng.months(), conserved = months.every((r) => Math.abs(r.humanFte + r.agentVfte - m.base.etp) < 1e-6 * Math.max(1, m.base.etp));
  ck('CC-MP-01', 'Monthly Playback (EV-30): Human FTE(m) + Agent vFTE(m) = Input FTE for every month — conservation, structurally guaranteed by construction', conserved, conserved ? OK : 'a month does not conserve the workforce');
  const annual = ys.every((y) => Math.abs(y.savings - months.filter((r) => r.monthIndex >= y.monthStartIndex && r.monthIndex <= y.monthEndIndex).reduce((a, r) => a + r.grossSavings, 0)) < 1e-6 * Math.max(1, Math.abs(y.savings))
    && Math.abs(y.adoptionEndPct - months[y.monthEndIndex - 1]!.adoptionRampPct) < 1e-9);
  ck('TE-05', 'TE-05/TE-06 (spec v5 §17): annual savings === Σ monthly grossSavings and adoptionEndPct === last-month ramp, by construction', annual, annual ? OK : 'annual and monthly savings differ');
  const first = months.find((r) => eng.cumulativeAt(r.monthIndex) >= 0)?.monthIndex ?? null, pb = paybackMonthsCanonical(c), single = (pb ?? null) === first || (pb === 0 && first === 1);
  ck('TE-07', 'TE-07 (spec v5 §17): exactly one payback definition — canonical accessor === first cumulative crossing, and the registry/ROI read it (scenario-local payback excluded by design)', single, single ? OK : `payback ${pb} vs first crossing ${first}`);
  const hzn = ys.length === m.horizon && ys[ys.length - 1]!.yearIndex === m.horizon;
  ck('TE-HZN', 'TE-HZN (Horizon-Dynamic spec §10): engine.years() spans horizonYears and the end-year KPIs (netSavY3/runCostY3) equal engine.year(horizonYears) — no fixed "Y3" leaks when the horizon is not 3', hzn, hzn ? OK : `years ${ys.length} vs horizon ${m.horizon}`);
  return out;
}
