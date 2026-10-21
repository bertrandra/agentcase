import type { Ctx } from '../ctx';
import { engineNow, npvCanonical, paybackMonthsCanonical } from '../canonical';
import { savingsBreakdown } from '../economics/savings';
import { khMult } from '../knowledge';
import { locationMix } from '../location';
import { model } from '../model/overlay';
import { phaseScope } from '../scope';
import { cmRecommend, CM_DEFS, cmTierSplit, commercialRevenue, type CmCode } from './commercial';
import { perfRel } from './perf';

export type VarValue = number | string | boolean | null | undefined;
export interface VariableDef { id: string; label: string; format: string; unit: string; scope: string; get: (c: Ctx) => VarValue }

const end = (c: Ctx) => { const ys = engineNow(c).years(); return ys[ys.length - 1]!; };
const sumSav = (c: Ctx) => engineNow(c).years().reduce((a, y) => a + y.savings, 0);
const sel = (c: Ctx): CmCode => (c.inp.v('cmModel') || 'ET') as CmCode;
const v = (id: string, label: string, format: string, unit: string, scope: string, get: VariableDef['get']): VariableDef => ({ id, label, format, unit, scope, get });
/** Selected model's revenue over the horizon and the run cost of the same years (legacy cgMargin3ySel / clientSavingPctSel). */
const sold = (c: Ctx) => { const rev = commercialRevenue(c, sel(c), model(c)).rev; return { rev, total: rev.reduce((a, b) => a + b, 0), run: engineNow(c).years().slice(0, rev.length).reduce((a, y) => a + y.totalRunCost, 0) }; };

/**
 * The bindable variables of the Board (subset of the legacy VARIABLE_REGISTRY): every GLOBAL headline plus the section-scoped values of the
 * sections that exist in this build. Cards bound to a variable that is not listed here show a dash.
 */
export const VARIABLES: VariableDef[] = [
  v('netSavY1', 'Net savings Y1', 'EUR_K', '€', 'GLOBAL', (c) => model(c).yearSav[0]),
  v('netSavY2', 'Net savings Y2', 'EUR_K', '€', 'GLOBAL', (c) => model(c).yearSav[1]),
  v('netSavY3', 'Net savings, end-year', 'EUR_K', '€', 'GLOBAL', (c) => end(c).savings),
  v('cumSav3yr', 'Cumulative gain over horizon', 'EUR_K', '€', 'GLOBAL', sumSav),
  v('runCostY1', 'Run cost Y1', 'EUR_K', '€', 'GLOBAL', (c) => model(c).yearRun[0]),
  v('runCostY3', 'Run cost, end-year', 'EUR_K', '€', 'GLOBAL', (c) => end(c).totalRunCost),
  v('grossAutoY3', 'Automation potential (gross auto value, end-year)', 'EUR_K', '€', 'GLOBAL', (c) => { const y = savingsBreakdown(c).years; return y[y.length - 1]!.grossAuto; }),
  v('paybackMonths', 'Payback', 'INT', 'months', 'GLOBAL', paybackMonthsCanonical),
  v('roiPct', 'ROI (net, over horizon)', 'PCT', '%', 'GLOBAL', (c) => { const m = model(c); return m.setupTotal ? ((sumSav(c) - m.setupTotal) / m.setupTotal) * 100 : 0; }),
  v('npv8', 'NPV (case rate)', 'EUR_K', '€', 'GLOBAL', (c) => npvCanonical(c)),
  v('glassCeilingPct', 'Glass ceiling', 'PCT', '%', 'GLOBAL', (c) => c.inp.p('glassCeiling')),
  v('artefactsInScope', 'Artefacts in scope', 'INT', '', 'GLOBAL', (c) => phaseScope(c.a, c.s).count),
  v('adoptionRateY3', 'Adoption rate (end-year)', 'PCT', '%', 'GLOBAL', (c) => end(c).adoptionEndPct),
  v('sourcingMixIndia', 'Sourcing mix (India @ cruise)', 'PCT', '%', 'GLOBAL', (c) => c.s.targetLocPct?.India ?? (locationMix(c.s).pct as Record<string, number>).India ?? 0),
  v('fteShift', 'FTE peak → cruise', 'TEXT', '', 'GLOBAL', (c) => `${Math.round(model(c).base.etp)} → ${Math.round(end(c).totalHumanFteEnd)}`),
  v('setupTotal', 'One-time setup cost', 'EUR_K', '€', 'setup', (c) => model(c).setupTotal),
  v('blendedTjmAsIs', 'Blended day rate (AS-IS)', 'DEC1', '€/day', 'ratecard', (c) => model(c).blendedTJM),
  v('blendedTjmTgt', 'Blended day rate (target)', 'DEC1', '€/day', 'ratecard', (c) => model(c).tgtTJM),
  v('baseFte', 'Baseline headcount (FTE)', 'DEC1', 'FTE', 'team-in', (c) => model(c).base.etp),
  v('residualFteY3', 'Residual headcount, end-year (FTE)', 'DEC1', 'FTE', 'team-out', (c) => end(c).totalHumanFteEnd),
  v('khMultiplier', 'Knowledge-hub multiplier', 'RATIO', 'x', 'knowledge', (c) => khMult(c)),
  v('avgAgentSuitability', 'Avg. agent-suitability in scope', 'PCT', '%', 'scope-sel', (c) => phaseScope(c.a, c.s).avgAgent),
  v('runDeltaY3', 'Run cost delta vs AS-IS, end-year', 'EUR_K', '€', 'financial', (c) => end(c).totalRunCost - model(c).baselineRun),
  v('netProfit3y', 'Net profit over horizon (savings − setup)', 'EUR_K', '€', 'financial', (c) => sumSav(c) - model(c).setupTotal),
  v('freedFteY3', 'Human FTE freed, end-year', 'DEC1', 'FTE', 'financial', (c) => Math.max(0, model(c).base.etp - end(c).totalHumanFteEnd)),
  v('cgMargin3ySel', 'Capgemini margin (selected model)', 'EUR_K', '€', 'commercial', (c) => { const s = sold(c); return s.total - s.run - model(c).setupTotal * model(c).conv.ctx.setupBillable; }),
  v('clientSavingPctSel', 'Client saving vs AS-IS (selected model)', 'PCT', '%', 'commercial', (c) => { const s = sold(c), base = model(c).baselineRun * s.rev.length; return base > 0 ? (1 - s.total / base) * 100 : 0; }),
  v('agentshoreTierT2Pct', 'Agentshore Tier 2 (critical) share', 'PCT', '%', 'commercial', (c) => cmTierSplit(c).t2 * 100),
  v('recommendedCommercialModel', 'Recommended commercial model', 'TEXT', '', 'commercial', (c) => CM_DEFS[cmRecommend(c)[0]].label),
  v('maxAutomatablePct', 'Max automatable % (100 − glass ceiling)', 'PCT', '%', 'compliance', (c) => 100 - c.inp.p('glassCeiling')),
  v('velocitySpY3', 'Velocity Y3 (SP/sprint)', 'INT', 'SP', 'velocity', (c) => Math.round(35 + (59 - 35) * perfRel(c, end(c).adoptionEndPct))),
  v('perfUpliftRelY3Pct', 'Productivity uplift, relative, Y3', 'PCT', '%', 'productivity', (c) => perfRel(c, end(c).adoptionEndPct) * 100),
  v('programmeLengthMonths', 'Programme length', 'INT', 'mo', 'gantt', (c) => model(c).horizon * 12),
  v('headcountReductionPctKpi', 'Headcount reduction, end-year', 'PCT', '%', 'kpi', (c) => { const m = model(c); return m.base.etp > 0 ? (1 - end(c).totalHumanFteEnd / m.base.etp) * 100 : 0; }),
  v('asisTobeFreedFte', 'Human FTE freed, AS-IS vs TO-BE', 'DEC1', 'FTE', 'asis-tobe', (c) => Math.max(0, model(c).base.etp - end(c).totalHumanFteEnd)),
  v('runTeamFteEndYear', 'AgentOps run-team FTE, end-year', 'DEC1', 'FTE', 'run-sizing', (c) => end(c).runTeamFteEnd),
  v('tobeTeamTotalHeadcount', 'TO-BE team (delivery + run), end-year', 'DEC1', 'FTE', 'tobe-team', (c) => end(c).totalHumanFteEnd),
  v('agentVfteAvgEndYear', 'Agent vFTE, end-year average', 'DEC1', 'FTE', 'vfte-ov', (c) => end(c).agentVfteAvg),
  v('runCostEndYearOwn', 'Total run cost, end-year', 'EUR_K', '€', 'run', (c) => end(c).totalRunCost),
  v('netAfterSetupEndYear', 'Net cash flow after setup, end-year', 'EUR_K', '€', 'annual', (c) => end(c).netAfterSetup),
  v('cumulativeCashFlowEndYear', 'Cumulative cash flow, end-year', 'EUR_K', '€', 'monthly', (c) => end(c).cumulativeCashFlowEnd),
  v('playbackAdoptionEndYear', 'Adoption reached by end of playback', 'PCT', '%', 'monthly-playback', (c) => end(c).adoptionEndPct),
  v('maturityLevelEndYear', 'Maturity level, end-year', 'TEXT', '', 'exec', (c) => end(c).maturityEnd),
  v('compareAgenticSavingsEndYear', 'Agentic savings, end-year', 'EUR_K', '€', 'compare', (c) => end(c).savings),
  v('npvHeadlineResults', 'Headline NPV', 'EUR_K', '€', 'results', (c) => npvCanonical(c)),
  v('storyPaybackMonths', 'Payback (story close)', 'INT', 'mo', 'story-summary', paybackMonthsCanonical),
];

export const variableById = (id: string | null | undefined): VariableDef | undefined => VARIABLES.find((x) => x.id === id);
export const variablesForSection = (section: string): VariableDef[] => VARIABLES.filter((x) => x.scope === section || x.scope === 'GLOBAL');
