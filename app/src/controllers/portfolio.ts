/** @calc-zone product-resolution */
import * as ops from '@/domain/portfolio';
import type { HubSettings } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { dispatchChecked } from './portfolioGuard';

const horizonCmd = definePortfolioCommand<{ months: number }>({
  type: 'portfolio.setHorizon', label: (p) => `Set portfolio horizon to ${p.months} months`, coalesceKey: () => 'portfolio.setHorizon',
  apply: (pf, p) => ops.setHorizon(pf, p.months),
});
const hubCmd = definePortfolioCommand<{ patch: Partial<HubSettings> }>({
  type: 'portfolio.setHub', label: () => 'Edit shared Knowledge Hub', coalesceKey: (p) => `portfolio.setHub:${Object.keys(p.patch).join(',')}`,
  apply: (pf, p) => ops.setHub(pf, p.patch),
});

const rhoCmd = definePortfolioCommand<{ rho: number }>({
  type: 'portfolio.setRho', label: (p) => `Set the correlation between products to ${p.rho}`, coalesceKey: () => 'portfolio.setRho',
  apply: (pf, p) => ops.setRho(pf, p.rho),
});

/** Calendar horizon of the portfolio, 1..120 months (the common case horizon in years follows). */
export const setPortfolioHorizon = (months: number): boolean => dispatchChecked(horizonCmd({ months }));
/** The shared Knowledge Hub: activation, monthly infrastructure and how it is charged to products ('perProduct' | 'byBaseEtp'). */
export const setPortfolioHub = (patch: Partial<HubSettings>): boolean => dispatchChecked(hubCmd({ patch }));
/** Global correlation between products in the portfolio Monte Carlo, 0 (independent, default) to 1 (common shocks); out of [0, 1] is refused. */
export const setPortfolioRho = (rho: number): boolean => Number.isFinite(rho) && rho >= 0 && rho <= 1 && dispatchChecked(rhoCmd({ rho }));
