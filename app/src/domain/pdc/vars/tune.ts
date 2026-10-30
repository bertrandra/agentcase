/** @calc-zone workspace-config */
import type { Ctx } from '../../ctx';
import { modelOf as model } from '../../tune/memo';
import { blendedTokenCostPer1M } from '../../tokens';
import { tokenUsage } from '../../tuneB/tokens';
import { agentsOf, loopInternalTokenCost } from '../../verifyA/agents';
import { daVal, qualityRows } from '../../verifyB/anchors';
import { perfRel } from '../../verifyB/perf';
import { end, v } from './types';

/** Legacy interpolation of a quality anchor at the horizon-end realisation (no clamp, like the legacy). */
const quality = (c: Ctx, i: number): number => {
  const q = qualityRows(c.s)[i]!, r3 = perfRel(c, end(c).adoptionEndPct);
  return q[1] + (q[2] - q[1]) * r3;
};

/** Quality and velocity anchors, agents, token economics and the knowledge hub. */
export const TUNE_VARS = [
  v('testCoverageY3', 'Test coverage, Y3 target', 'PCT', '%', 'quality', (c) => quality(c, 1)),
  v('defectLeakagePctY3', 'Defect leakage %, Y3 target', 'PCT', '%', 'quality', (c) => quality(c, 3)),
  v('velocitySpY3', 'Velocity Y3 (SP/sprint)', 'INT', 'SP', 'velocity', (c) => Math.round(daVal(c.s, 'velocitySp', perfRel(c, end(c).adoptionEndPct)))),
  v('leadTimeY3Days', 'Lead time, Y3', 'DAYS', 'd', 'velocity', (c) => daVal(c.s, 'leadTime', perfRel(c, end(c).adoptionEndPct))),
  v('perfUpliftRelY3Pct', 'Productivity uplift, relative, Y3', 'PCT', '%', 'productivity', (c) => perfRel(c, end(c).adoptionEndPct) * 100),
  v('agentCatalogCount', 'Total agents in catalog', 'INT', '', 'agent-dir', (c) => agentsOf(c).length),
  v('loopInternalTokenCostEst', 'Agentic loop internal token cost (est.)', 'EUR_K', '€', 'agent-dir', (c) => loopInternalTokenCost(c).cost),
  v('tokenCostPer1M', 'Blended token cost per 1M tokens', 'DEC2', '€/1M', 'token-econ', (c) => blendedTokenCostPer1M(c.s)),
  v('tokenVolumeY3M', 'Token volume, end-year (M tokens)', 'DEC1', 'M', 'token-econ', (c) => tokenUsage(c).y3),
  v('tokenCostY3', 'Token cost, end-year', 'EUR_K', '€', 'token-econ', (c) => end(c).tokenCost),
  v('agentRunsY3', 'Agent runs / year, end-year', 'INT', '', 'token-econ', (c) => tokenUsage(c).runsY3),
  v('infraCostYr', 'Infra cost / year', 'EUR_K', '€', 'token-econ', (c) => model(c).infraYear),
  v('khSetupCostEur', 'Knowledge-hub setup cost', 'EUR_K', '€', 'knowledge', (c) => model(c).conv.khSetup),
  v('khRunCostY3', 'Knowledge-hub run cost, end-year', 'EUR_K', '€', 'knowledge', (c) => end(c).knowledgeHubCost),
  v('ktAvoidedY3', 'KT cost avoided, end-year', 'EUR_K', '€', 'knowledge', (c) => end(c).knowledgeTransferAvoided),
  v('tokenVolumeEndYear', 'Agent token volume, end-year', 'DEC1', 'M', 'agent-usage', (c) => tokenUsage(c).y3),
];
