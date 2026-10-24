/** @calc-zone verification */
import { makeCtx, type Ctx } from '../ctx';
import { engagementCoef, engagementKey } from '../engagement';
import { khTargetCC } from '../knowledge';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import { agentIdsCheck, agentRefsCheck } from './verifConvAgents';
import { wave1Checks, wave2Checks } from './verifConvAnalytic';
import { depChecks } from './verifConvDep';
import { loopChecks, taxChecks } from './verifConvLoops';
import { wave3Checks, wave4Checks } from './verifConvProgram';
import { statsChecks } from './verifConvStats';
import { supervisionChecks } from './verifConvSupply';
import { playbackChecks, timeChecksA } from './verifConvTime';
import { timeChecksB } from './verifConvTime2';
import { wave, type ConvCheck, type ConvRuntime } from './verifConvTypes';
import { fmtK } from './verifFormat';
import { maturityInfo } from '../tune/maturity';
import { opModelCompute } from '../tune/opmodel';

export type { ConvCheck, ConvRuntime } from './verifConvTypes';
const AUTH: Record<string, number> = { Assistance: 1, Copilot: 2, 'Supervised autonomous': 3, Autonomous: 4 };

/** The nine engagement-context rows at the head of the legacy `renderConvChecks()`: CC-CTX-01..04, CC-KH-01/02, CC-OM-01, CC-SUP-01. */
function contextChecks(c: Ctx): ConvCheck[] {
  const m = model(c), mi = maturityInfo(c, m), cx = engagementCoef(c), key = engagementKey(c);
  const blocked = activeArtefacts(c.a, c.s).filter((a) => (AUTH[a.aiAuth] || 1) > cx.authorityCap).length;
  const withCtx = (k: string) => model(makeCtx({ ...c.s, dom: { ...c.s.dom, values: { ...c.s.dom.values, engagementCtx: k } } })), mS = withCtx('STA'), mM = withCtx('MSC');
  const om = opModelCompute(c, 2, m);
  return [
    wave('CC-CTX-01', mi.capped <= mi.cap, `L${mi.capped} ≤ L${mi.cap} (${key})${mi.raw > mi.cap ? ` — raw L${mi.raw} was capped` : ''}`),
    wave('CC-CTX-02', true, `${blocked} in-scope artifact(s) above A${cx.authorityCap} — flagged as human-led (informative in v13.2, hard scope exclusion planned v13.3)`),
    wave('CC-CTX-03', Math.abs(m.conv.setupBillable + m.conv.setupAbsorbed - m.setupTotal) < 1, `${fmtK(m.conv.setupBillable)} + ${fmtK(m.conv.setupAbsorbed)} = ${fmtK(m.setupTotal)}`),
    wave('CC-CTX-04', mS.eff <= mM.eff + 1e-6 && mS.ramps[2]! <= mM.ramps[2]! + 1e-6,
      `eff STA ${mS.eff.toFixed(1)}% ≤ eff MSC ${mM.eff.toFixed(1)}% · ramp Y3 STA ${Math.round(mS.ramps[2]!)}% ≤ MSC ${Math.round(mM.ramps[2]!)}%`),
    wave('CC-KH-01', m.eff <= m.conv.effCap + 1e-6, `eff ${m.eff.toFixed(1)} ≤ headroom ${m.conv.effCap.toFixed(1)}`),
    wave('CC-KH-02', khTargetCC(c) <= cx.khMaxCC, `CC${khTargetCC(c)} ≤ CC${cx.khMaxCC}`),
    wave('CC-OM-01', om.ok, om.ok ? `engineers remainder ${om.eng.toFixed(2)} FTE ≥ 0` : 'pod structure exceeds the residual volume'),
    wave('CC-SUP-01', true, 'human share is clamped to the floor by construction'),
  ];
}

/**
 * All 68 rows of the legacy convergence table, in the legacy order: the context rows, the wave 1-5 module checks, then every check
 * registered with AUDIT (agent ids, loops, verification tax, supervision, Monte Carlo, baseline drift, flow, evidence, Monthly
 * Playback, Time Engine, dependency registry). `rt` carries the session state some rules read (last Monte Carlo run, section
 * catalogue, playback state); on a clean page those rules hold, like the legacy.
 */
export function convergenceChecks(c: Ctx, rt: ConvRuntime = {}): ConvCheck[] {
  return [
    ...contextChecks(c), ...wave1Checks(c), ...wave2Checks(c), ...wave3Checks(c), ...wave4Checks(c), agentRefsCheck(c),
    agentIdsCheck(), ...loopChecks(c), ...taxChecks(c), ...supervisionChecks(c), ...statsChecks(c, rt), ...playbackChecks(c, rt),
    ...timeChecksA(c), ...depChecks(rt), ...timeChecksB(c),
  ];
}
