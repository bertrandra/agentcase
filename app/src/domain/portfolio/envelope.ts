import { makeInputs } from '../inputs';
import type { CaseState } from '../types/state';
import { DEFAULT_PRODUCT_NAME, DEFAULT_WAVE_NAME } from './frenchAliases';
import { commonInfra } from './layers';
import { resolveProduct } from './resolve';
import type { CommonCase, Portfolio } from './types';

/**
 * A single case as a portfolio of one product "Product 1" in one wave "Wave 1" starting at month 0 (spec F21). Nothing is copied or
 * converted: the common values are the case itself, the hub settings are read from it, so every figure stays identical (A1).
 */
export function envelopeCase(c: CaseState): Portfolio {
  const { teamIn, ...common } = c, months = (parseInt(makeInputs(c).v('horizon'), 10) || 3) * 12;
  return {
    _schema: 'agentcase.portfolio.v1',
    common: common as CommonCase,
    products: [{ id: 'p1', name: DEFAULT_PRODUCT_NAME, teamIn, knowledge: {}, overrides: {}, waveId: 'w1', offsetMonths: 0 }],
    waves: [{ id: 'w1', name: DEFAULT_WAVE_NAME, startMonth: 0, productIds: ['p1'] }],
    activeProductId: 'p1',
    hub: { enabled: !!c.dom?.checked?.khEnabled, infraMonthly: commonInfra(common as CommonCase), infraAllocation: 'perProduct' },
    horizonMonths: months,
    startDate: '',
  };
}

/** A one-product portfolio back to a single case, without loss (spec F22). More than one product has no single-case form. */
export function portfolioToCase(pf: Portfolio): CaseState {
  if (pf.products.length !== 1) throw new Error(`portfolioToCase: ${pf.products.length} products, expected exactly one`);
  return resolveProduct(pf, (pf.products[0] as { id: string }).id);
}
