/** @calc-zone workspace-config */
import { classTargetPct } from '../../baseline/locStrat';
import { locationMix, targetBlendedTJM, teamInCost } from '../../location';
import { modelOf as model } from '../../tune/memo';
import { maturityInfo } from '../../tune/maturity';
import { opModelCompute } from '../../tune/opmodel';
import { targetTeam } from '../verifTeam';
import { end, endIdx, v } from './types';

/** Rate card, AS-IS / TO-BE teams, vFTE, location strategy, operating model and maturity. */
export const TEAM_VARS = [
  v('blendedTjmAsIs', 'Blended day rate (AS-IS)', 'DEC1', '€/day', 'ratecard', (c) => model(c).blendedTJM),
  v('blendedTjmTgt', 'Blended day rate (target)', 'DEC1', '€/day', 'ratecard', (c) => model(c).tgtTJM),
  v('baseFte', 'Baseline headcount (FTE)', 'DEC1', 'FTE', 'team-in', (c) => model(c).base.etp),
  v('residualFteY3', 'Residual headcount, end-year (FTE)', 'DEC1', 'FTE', 'team-out', (c) => end(c).totalHumanFteEnd),
  v('headcountReductionPctKpi', 'Headcount reduction, end-year', 'PCT', '%', 'kpi', (c) => { const m = model(c); return m.base.etp > 0 ? (1 - end(c).totalHumanFteEnd / m.base.etp) * 100 : 0; }),
  v('asisTobeFreedFte', 'Human FTE freed, AS-IS vs TO-BE', 'DEC1', 'FTE', 'asis-tobe', (c) => Math.max(0, model(c).base.etp - end(c).totalHumanFteEnd)),
  v('runTeamFteEndYear', 'AgentOps run-team FTE, end-year', 'DEC1', 'FTE', 'run-sizing', (c) => end(c).runTeamFteEnd),
  v('tobeTeamTotalHeadcount', 'TO-BE team (delivery + run), end-year', 'DEC1', 'FTE', 'tobe-team', (c) => end(c).totalHumanFteEnd),
  v('agentVfteAvgEndYear', 'Agent vFTE, end-year average', 'DEC1', 'FTE', 'vfte-ov', (c) => end(c).agentVfteAvg),
  v('targetOffshorePct', 'Target location mix — Offshore %', 'PCT', '%', 'loc-strat', (c) => classTargetPct(c.s, 'Offshore')),
  v('targetNearshorePct', 'Target location mix — Nearshore %', 'PCT', '%', 'loc-strat', (c) => classTargetPct(c.s, 'Nearshore')),
  v('locRateGapPct', 'Blended rate gap, target vs AS-IS', 'PCT', '%', 'loc-strat', (c) => {
    const mx = locationMix(c.s), asis = mx.tot ? teamInCost(c.s, c.inp).cost / (mx.tot * c.inp.p('workdays')) : 0, tgt = targetBlendedTJM(c.s, c.rateScale);
    return asis ? (tgt / asis - 1) * 100 : 0;
  }),
  v('omPodsY3', 'Pods, end-year (topology)', 'INT', '', 'opmodel', (c) => opModelCompute(c, endIdx(c)).pods),
  v('omMaturityLevelY3', 'Operating-model maturity level, end-year', 'INT', '', 'opmodel', (c) => opModelCompute(c, endIdx(c)).lvl),
  v('asisTeamCost', 'AS-IS team cost (payroll/yr)', 'EUR_K', '€', 'team-in', (c) => model(c).base.cost),
  v('agentVfteY3', 'Agent vFTE, end-year', 'DEC1', 'FTE', 'team-out', (c) => end(c).agentVfteEnd),
  v('runTeamFteY3', 'Agentic run-team FTE, end-year', 'DEC1', 'FTE', 'team-out', (c) => end(c).runTeamFteEnd),
  v('devFteY3', 'Dev FTE (residual, end-year)', 'DEC1', 'FTE', 'team-out', (c) => targetTeam(c).devETP),
  v('supFteY3', 'Supervision FTE (residual, end-year)', 'DEC1', 'FTE', 'team-out', (c) => targetTeam(c).supETP),
  v('totalTargetFteY3', 'Total target FTE, end-year (residual + run)', 'DEC1', 'FTE', 'team-out', (c) => targetTeam(c).totalRecurrent),
  v('rateGapAbs', 'Blended rate delta (AS-IS − target)', 'DEC1', '€/day', 'ratecard', (c) => { const m = model(c); return m.blendedTJM - m.tgtTJM; }),
  v('omEngFteY3', 'Engineering FTE, end-year (topology)', 'DEC1', 'FTE', 'opmodel', (c) => opModelCompute(c, endIdx(c)).eng),
  v('omOrchFteY3', 'Orchestration FTE, end-year (topology)', 'DEC1', 'FTE', 'opmodel', (c) => opModelCompute(c, endIdx(c)).orch),
  v('maturityLevelCapped', 'Maturity level, end-year (capped)', 'INT', 'L', 'maturity', (c) => maturityInfo(c).capped),
  v('agentShareY3Pct', 'Agent vFTE share, end-year', 'PCT', '%', 'maturity', (c) => maturityInfo(c).share),
  v('maturityMapLevelLabel', 'Maturity level reached', 'TEXT', '', 'maturity-map', (c) => `L${maturityInfo(c).capped}`),
  v('vfteConservationCheck', 'Conservation check |human+agent−base|', 'DEC2', 'FTE', 'fte-vfte', (c) => { const e = end(c); return Math.abs(e.humanFteEnd + e.agentVfteEnd - model(c).base.etp); }),
  v('aiRunSupportTeamFte', 'AI-run support team (Eng+Prompt+FinOps+QA)', 'DEC1', 'FTE', 'agent-detail', (c) => {
    const e = model(c).base.etp;
    return Math.max(0.3, e / 12) + Math.max(0.2, e / 20) + (c.s.COEF.aiFinOpsFte as number) + Math.max(0.2, e / 25);
  }),
];
