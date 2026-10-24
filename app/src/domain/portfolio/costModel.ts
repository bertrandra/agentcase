/** @calc-zone exports */
import { discountFactor } from '../economics/cashflow';
import { monthLabels, pickScope } from './costModelAxis';
import { buildOther } from './costModelOther';
import { buildParams } from './costModelParams';
import { buildRates } from './costModelRates';
import { row } from './costModelRow';
import type { CostModel, CostScope } from './costModelTypes';
import { buildValues } from './costModelValues';
import type { Portfolio } from './types';

export type { CostFmt, CostFormula, CostModel, CostRole, CostRow, CostScope, CostTable, ParamRow, RateCardBlock } from './costModelTypes';

/** "Wave_1"-style slug of a scope for file names. */
export const scopeSlug = (label: string): string => label.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'Portfolio';

/**
 * The cost-model workbook as plain data: three monthly tables on the portfolio calendar (M1 = first portfolio month) plus a t0 column (the AS-IS reference).
 * Values = human days by skill, Rate cards = applied day rates and the team-cost check, Other costs = every other cost line, the total, and the parameters.
 * Days x applied rate + other costs = the app's cost; every number comes from the consolidation, the products' Time Engine rows and the case owners.
 */
export function costModel(pf: Portfolio, scope: CostScope): CostModel {
  const pk = pickScope(pf, scope), L = pk.c.horizon, rate = pk.c.rate, vals = buildValues(pk, L), rates = buildRates(pk, L, vals), other = buildOther(pk, L, rates, rate);
  other.rows.push(row('factor', ['Portfolio', '(all waves)', '(all products)', 'Discounting', 'Monthly discount factor', 'calendar axis: 1 / (1 + annual rate / 12) ^ month', ''], 'factor', 'factor', 1,
    Array.from({ length: L }, (_, i) => discountFactor(i + 1, rate)), { k: 'factor' }));
  return {
    title: 'AgentCase cost model (monthly)', scopeLabel: pk.label, currency: 'EUR', horizon: L, monthLabels: monthLabels(pf, L), annualRate: rate, excluded: pk.excluded,
    values: vals.table, rates: rates.table, other, rateCard: rates.card, mix: rates.mix, params: buildParams(pf, pk.views, rate, L),
  };
}
