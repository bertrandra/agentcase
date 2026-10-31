/** @calc-zone product-resolution */
import { caseHorizonYears, makeInputs } from '../inputs';
import { withProductTeam } from '../org/teamWrite';
import type { XDocument } from '../process/xml';
import type { CaseState } from '../types/state';
import { DEFAULT_PRODUCT_NAME, DEFAULT_WAVE_NAME } from './frenchAliases';
import { commonInfra } from './layers';
import { resolveProduct } from './resolve';
import type { CommonCase, Portfolio } from './types';

/**
 * A single case as a portfolio of one product "Product 1" in one wave "Wave 1" starting at month 0 (spec F21). The common values are the case
 * itself, its entry team written into the organisation part of its document as the team of "Product 1" (schema v5; an object without a process
 * document gets the organisation carrier), the hub settings read from it, so every figure stays identical (A1).
 */
export function envelopeCase(c: CaseState): Portfolio {
  const { teamIn, ...rest } = c, months = caseHorizonYears(makeInputs(c)) * 12;
  const common = { ...rest, BPMN: withProductTeam(rest.BPMN as XDocument | undefined, 'p1', teamIn ?? [], DEFAULT_PRODUCT_NAME) } as CommonCase;
  return {
    _schema: 'agentcase.portfolio.v1',
    common,
    products: [{ id: 'p1', name: DEFAULT_PRODUCT_NAME, knowledge: {}, overrides: {}, waveId: 'w1', offsetMonths: 0 }],
    waves: [{ id: 'w1', name: DEFAULT_WAVE_NAME, startMonth: 0, productIds: ['p1'] }],
    activeProductId: 'p1',
    hub: { enabled: !!c.dom?.checked?.khEnabled, infraMonthly: commonInfra(common), infraAllocation: 'perProduct' },
    horizonMonths: months,
    startDate: '',
  };
}

/** A one-product portfolio back to a single case, without loss (spec F22). More than one product has no single-case form. */
export function portfolioToCase(pf: Portfolio): CaseState {
  if (pf.products.length !== 1) throw new Error(`portfolioToCase: ${pf.products.length} products, expected exactly one`);
  return resolveProduct(pf, (pf.products[0] as { id: string }).id);
}
