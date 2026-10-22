import { buildCalcPackage, type CalcPackage, CALC_PACKAGE_SCHEMA } from '../calcPackage';
import { consolidate } from './consolidate';
import { portfolioHeadline } from './portfolioHeadline';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';

/** What a saved portfolio carries: one package per product (its effective case) and one for the consolidated portfolio. */
export interface PortfolioPackages { calculationPackage: CalcPackage; calculationPackages: Record<string, CalcPackage> }

const djb2 = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
};

/**
 * Canonical packages of a portfolio. Per product: exactly the single-case package of its resolved case. Portfolio level: the engine identity of
 * the products, a hash of what places them on the calendar (inputs, month 0, KT lead, horizon), the consolidated headline (`portfolioHeadline`)
 * and the calendar-year table (`consolidate`) — no figure is computed here.
 */
export function buildPortfolioPackages(pf: Portfolio): PortfolioPackages {
  const per: Record<string, CalcPackage> = {};
  for (const p of pf.products) per[p.id] = buildCalcPackage(resolveProduct(pf, p.id));
  const all = Object.values(per), c = consolidate(pf), h = portfolioHeadline(c);
  const planned = scheduledProducts(pf).map((s) => [s.product.id, (per[s.product.id] as CalcPackage).inputHash, s.month0, s.lead]);
  let cum = 0;
  const annual = h.years.net.map((net, i) => {
    cum += net;
    return { yearIndex: i + 1, savings: h.years.savings[i] as number, totalRunCost: h.years.run[i] as number, netAfterSetup: net, cumulativeCashFlowEnd: cum };
  });
  const first = all[0] as CalcPackage;
  return {
    calculationPackage: {
      schemaVersion: CALC_PACKAGE_SCHEMA, calculationVersion: first.calculationVersion, curveModelId: [...new Set(all.map((x) => x.curveModelId))].sort().join('+'),
      inputHash: 'pf1:' + djb2(JSON.stringify([pf.horizonMonths, c.rate, planned])),
      headline: { payback: h.paybackMonth, npv: h.npv, roi: h.roi, totalSavings: h.totalBenefit }, annual,
    },
    calculationPackages: per,
  };
}
