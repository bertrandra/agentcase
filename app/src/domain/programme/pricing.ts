/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';

/** How a training, coaching or governance line is priced (FX-D13 d; coaching: normalisation #3): from its resources or from its euro amount. */
export type Pricing = 'resources' | 'amount';
export const PRICING_KEYS = { training: { mode: 'trainPricing', amount: 'setupTraining' }, governance: { mode: 'govPricing', amount: 'setupGov' },
  coaching: { mode: 'coachPricing', amount: 'setupCoaching' } } as const;
/**
 * The pricing mode of a line: the case's choice; without one, training and governance are priced by resources, and coaching by its amount when the
 * case gives no duration (the legacy calibration: the same total, 0 without an amount), else by resources.
 */
export function pricingOf(c: Ctx, id: keyof typeof PRICING_KEYS): Pricing {
  const v = c.inp.v(PRICING_KEYS[id].mode);
  if (v === 'amount' || v === 'resources') return v;
  if (id !== 'coaching') return 'resources';
  const months = c.inp.p('coachMonths');
  return months > 0 ? 'resources' : 'amount';
}
/** A fixed € amount of the case, scaled by the Monte Carlo amount draw (normalisation #9; 1 outside a draw). */
export const amountOf = (c: Ctx, key: string): number => Math.max(0, c.inp.p(key) || 0) * (c.amountScale ?? 1);
