import type { Ctx } from '../../ctx';
import { npvCanonical, paybackMonthsCanonical } from '../../canonical';
import { engineOf as engineNow, modelOf as model } from '../../tune/memo';
import { headline } from '../../economics/headline';
import { cmRecommend, CM_DEFS, cmTierSplit, commercialRevenue, type CmCode } from '../commercial';
import { end, v } from './types';

const sel = (c: Ctx): CmCode => (c.inp.v('cmModel') || 'ET') as CmCode;
/** Selected model's revenue over the horizon and the run cost of the same years (legacy cgMargin3ySel / clientSavingPctSel). */
const sold = (c: Ctx) => { const rev = commercialRevenue(c, sel(c), model(c)).rev; return { rev, total: rev.reduce((a, b) => a + b, 0), run: engineNow(c).years().slice(0, rev.length).reduce((a, y) => a + y.totalRunCost, 0) }; };

/** Setup, financial, annual / monthly cash flow, commercial and results figures. */
export const FINANCE_VARS = [
  v('setupTotal', 'One-time setup cost', 'EUR_K', '€', 'setup', (c) => model(c).setupTotal),
  v('runDeltaY3', 'Run cost delta vs AS-IS, end-year', 'EUR_K', '€', 'financial', (c) => end(c).totalRunCost - model(c).baselineRun),
  v('netProfit3y', 'Net profit over horizon (savings − setup)', 'EUR_K', '€', 'financial', (c) => headline(c).net),
  v('freedFteY3', 'Human FTE freed, end-year', 'DEC1', 'FTE', 'financial', (c) => Math.max(0, model(c).base.etp - end(c).totalHumanFteEnd)),
  v('cgMargin3ySel', 'Capgemini margin (selected model)', 'EUR_K', '€', 'commercial', (c) => { const s = sold(c); return s.total - s.run - model(c).setupTotal * model(c).conv.ctx.setupBillable; }),
  v('clientSavingPctSel', 'Client saving vs AS-IS (selected model)', 'PCT', '%', 'commercial', (c) => { const s = sold(c), base = model(c).baselineRun * s.rev.length; return base > 0 ? (1 - s.total / base) * 100 : 0; }),
  v('agentshoreTierT2Pct', 'Agentshore Tier 2 (critical) share', 'PCT', '%', 'commercial', (c) => cmTierSplit(c).t2 * 100),
  v('recommendedCommercialModel', 'Recommended commercial model', 'TEXT', '', 'commercial', (c) => CM_DEFS[cmRecommend(c)[0]].label),
  v('setupBase', 'Setup base (tooling/training/coaching/gov)', 'EUR_K', '€', 'setup', (c) => model(c).conv.setupBase),
  v('setupBillableEur', 'Setup billable share (€)', 'EUR_K', '€', 'setup', (c) => model(c).conv.setupBillable),
  v('setupAbsorbedEur', 'Setup absorbed share (€)', 'EUR_K', '€', 'setup', (c) => model(c).conv.setupAbsorbed),
  v('changeMgmtCost', 'Change-management cost (HRI)', 'EUR_K', '€', 'setup', (c) => model(c).conv.changeCost),
  v('runCostY2', 'Run cost, Y2', 'EUR_K', '€', 'financial', (c) => model(c).yearRun[1]),
  v('teamCostY3', 'Human workforce cost, end-year', 'EUR_K', '€', 'financial', (c) => end(c).teamCost),
  v('agenticRunCostY3', 'Agentic run-team cost, end-year', 'EUR_K', '€', 'financial', (c) => end(c).runTeamCost),
  v('runCostEndYearOwn', 'Total run cost, end-year', 'EUR_K', '€', 'run', (c) => end(c).totalRunCost),
  v('netAfterSetupEndYear', 'Net cash flow after setup, end-year', 'EUR_K', '€', 'annual', (c) => end(c).netAfterSetup),
  v('cumulativeCashFlowEndYear', 'Cumulative cash flow, end-year', 'EUR_K', '€', 'monthly', (c) => end(c).cumulativeCashFlowEnd),
  v('playbackAdoptionEndYear', 'Adoption reached by end of playback', 'PCT', '%', 'monthly-playback', (c) => end(c).adoptionEndPct),
  v('maturityLevelEndYear', 'Maturity level, end-year', 'TEXT', '', 'exec', (c) => end(c).maturityEnd),
  v('compareAgenticSavingsEndYear', 'Agentic savings, end-year', 'EUR_K', '€', 'compare', (c) => end(c).savings),
  v('npvHeadlineResults', 'Headline NPV', 'EUR_K', '€', 'results', (c) => npvCanonical(c)),
  v('storyPaybackMonths', 'Payback (story close)', 'INT', 'mo', 'story-summary', paybackMonthsCanonical),
  v('tokenCostPerM', 'Token cost per 1M tokens', 'DEC2', '€/1M', 'sensitivity', (c) => model(c).tokenCost),
];
