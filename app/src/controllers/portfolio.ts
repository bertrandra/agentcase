import * as ops from '@/domain/portfolio';
import type { HubSettings } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { dispatchChecked } from './portfolioGuard';

const horizonCmd = definePortfolioCommand<{ months: number }>({
  type: 'portfolio.setHorizon', label: (p) => `Set portfolio horizon to ${p.months} months`, coalesceKey: () => 'portfolio.setHorizon', apply: (pf, p) => ops.setHorizon(pf, p.months),
});
const hubCmd = definePortfolioCommand<{ patch: Partial<HubSettings> }>({
  type: 'portfolio.setHub', label: () => 'Edit shared Knowledge Hub', coalesceKey: (p) => `portfolio.setHub:${Object.keys(p.patch).join(',')}`, apply: (pf, p) => ops.setHub(pf, p.patch),
});

/** Calendar horizon of the portfolio, 1..120 months (the common case horizon in years follows). */
export const setPortfolioHorizon = (months: number): boolean => dispatchChecked(horizonCmd({ months }));
/** The shared Knowledge Hub: activation, monthly infrastructure and how it is charged to products ('perProduct' | 'byBaseEtp'). */
export const setPortfolioHub = (patch: Partial<HubSettings>): boolean => dispatchChecked(hubCmd({ patch }));
