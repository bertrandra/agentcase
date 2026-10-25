/** @calc-zone exports */
import { engagementCoef, engagementKey } from '../engagement';
import { khAsisCC, khEnabled, khRunAnnual, khTargetCC } from '../knowledge';
import { model } from '../model/overlay';
import { pilotSizing } from '../tune/program';
import type { ParamRow } from './costModelTypes';
import type { Portfolio } from './types';
import type { ProductView } from './waves';

const IN = { setup: 'Agentic Setup — Initial investment', ctx: 'Engagement context', tok: 'Token economics & FinOps', kh: 'Knowledge hub — living memory',
team: 'Input team (AS-IS) — breakdown by resource',
  loc: 'Location strategy', rate: 'Rate Card — Day rate by Grade × Location', run: 'Agentic run-team sizing', prog: 'Program & Completeness', waves: 'Waves',
  hub: 'Knowledge transfer (hub settings)',
  curve: 'S-curve — adoption ramp', elig: 'Eligibility & Abaques', fixed: 'Fixed in the engine (not editable)', mc: 'Portfolio stress (1 = base case)' };

const common = (name: string, value: number | string, unit: string, where: string): ParamRow => ({ scope: 'Common', product: '', name, value, unit, where });

/** Everything common to the exported products that moves the cost: discounting, horizon, hub, token catalogue, scales. */
function commonParams(pf: Portfolio, v: ProductView, rate: number, horizon: number): ParamRow[] {
  const s = v.run.ctx.s, ctx = v.run.ctx;
  return [
    common('Annual discount rate', rate, 'per year', IN.ctx), common('Monthly discount rate (annual rate / 12)', rate / 12, 'per month', IN.ctx),
    common('Portfolio horizon', horizon, 'months', IN.waves), common('Portfolio start date', pf.startDate || '(not set: months are labelled M1, M2...)',
    'date', IN.waves),
    common('Currency', 'EUR', '', IN.fixed), common('Knowledge Hub enabled for the portfolio', pf.hub.enabled ? 'Yes' : 'No', '', IN.hub),
    common('Hub infrastructure', pf.hub.infraMonthly, 'EUR/month', IN.hub), common('Hub infrastructure allocation', pf.hub.infraAllocation, '', IN.hub),
    common('Output share of tokens (TOK_OUT_SHARE)', s.TOK_OUT_SHARE, '%', IN.tok),
    ...s.TOKEN_MODELS.flatMap((m) => [common(`Token model ${m.name}: share of the mix`, m.mix, '%', IN.tok),
    common(`Token model ${m.name}: price in`, m.priceIn, 'EUR per 1M tokens', IN.tok),
      common(`Token model ${m.name}: price out`, m.priceOut, 'EUR per 1M tokens', IN.tok)]),
    common('Day-rate scale', ctx.rateScale ?? 1, 'x', IN.mc), common('Token-price scale', ctx.tokenScale ?? 1, 'x', IN.mc),
    common('AgentOps premium on the day rate', 1.15, 'x', IN.fixed), common('Setup spread over', v.run.profile, 'months', IN.fixed),
  ];
}

/** What moves one product's cost, with where it is edited. */
function productParams(v: ProductView): ParamRow[] {
  const K = v.run.engine.K, ctx = v.run.ctx, m = model(ctx), cv = engagementCoef(ctx), pilot = pilotSizing(ctx);
  const p = (name: string, value: number | string, unit: string, where: string): ParamRow => ({ scope: 'Product', product: v.name, name, value, unit, where });
  return [
    p('Entry team (AS-IS)', K.baseEtp, 'FTE', IN.team), p('Working days per year', K.wdMonth * 12, 'days', IN.setup),
    p('Working days per month (days per year / 12)', K.wdMonth, 'days', IN.setup),
    p('Case horizon', K.horizonMonths, 'months', IN.waves), p('AS-IS blended day rate (TJM)', K.dayRateAsIs, 'EUR/day', IN.rate),
    p('Target blended day rate (TJM)', K.dayRateTarget, 'EUR/day', IN.loc),
    p('Effective automation', K.eff, '%', IN.elig), p('Adoption ramp Y1', m.ramps[0] ?? 0, '%', IN.curve),
    p('Adoption ramp Y2', m.ramps[1] ?? 0, '%', IN.curve), p('Adoption ramp Y3', m.ramps[2] ?? 0, '%', IN.curve),
    p('Curve model', K.curveModelId, '', IN.curve), p('Setup: tooling, training, coaching, governance', m.conv.setupBase, 'EUR', IN.setup),
    p('Setup: engagement change cost', m.conv.changeCost, 'EUR', IN.ctx),
    p('Setup: Knowledge Hub', m.conv.khSetup, 'EUR', IN.kh), p('Setup total', K.setupTotal, 'EUR', IN.setup),
    p('Setup billable share', cv.setupBillable, 'share', IN.ctx),
    p('Knowledge-transfer lead', v.lead, 'months', IN.kh), p('Knowledge Hub enabled', khEnabled(ctx) ? 'Yes' : 'No', '', IN.kh),
    p('Knowledge Hub target level (CC)', khTargetCC(ctx), 'level', IN.kh),
    p('Knowledge Hub AS-IS level (CC)', khAsisCC(ctx), 'level', IN.kh), p('Knowledge Hub curation', ctx.inp.p('khCurationFTE'), 'FTE', IN.kh),
    p('Knowledge Hub setup base', ctx.inp.p('khSetupBase'), 'EUR', IN.kh),
    p('Knowledge Hub infrastructure (allocated)', khRunAnnual(ctx, 0, 1) / 12, 'EUR/month', IN.hub),
    p('Tokens per article', K.tokensPerArt, 'tokens', IN.tok), p('Agent runs per day per vFTE', K.runsPerDay, 'runs', IN.tok),
    p('Blended token price', K.tokenUnitCost, 'EUR per 1M tokens', IN.tok), p('Infrastructure', K.infraMonth, 'EUR/month', IN.tok),
    p('Run-team sizing mode', K.runSizeMode, '', IN.run),
    p('Run-team floor', K.runFloorMin, 'FTE', IN.run), p('Run-team floor share', K.runFloorPct, '% of entry team', IN.run),
    p('Run-team FTE per agent vFTE', K.runOpsPerAgent, 'FTE', IN.run),
    p('Run-team factor', K.runTeamFactor, 'x', IN.run), p('Verification tax rate', K.vTaxRate, 'of raw savings', IN.elig),
    p('External rework rate', K.loopExtRate, 'of raw savings', IN.elig),
    p('Compliance tax rate', K.complianceTaxRate, 'of raw savings', IN.elig), p('Engagement context', engagementKey(ctx), '', IN.ctx),
    p('Ramp speed coefficient', cv.rampSpeed, 'x', IN.ctx),
    p('Ramp cap', cv.rampCapPct, '%', IN.ctx), p('Glass-ceiling factor', cv.glassFactor, 'x', IN.ctx),
    p('Risk premium (decision-risk bar, not a cost line)', cv.riskPremium, '', IN.ctx),
    p('Pilot team', pilot.fte, 'FTE', IN.prog), p('Pilot duration', pilot.totalWeeks, 'weeks', IN.prog),
    p('Pilot cost (included in the cost-model totals, not in the engine cost)', pilot.cost, 'EUR', IN.prog),
  ];
}

export const buildParams = (pf: Portfolio, views: ProductView[], rate: number, horizon: number): ParamRow[] => [...commonParams(pf, views[0]!, rate, horizon),
  ...views.flatMap(productParams)];
