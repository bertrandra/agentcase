import { mcFingerprint } from '../stress';
import { clampRho } from './stressSeed';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';

const own = new WeakMap<object, number>();
/** Fingerprint of one resolved case (the single-case Monte Carlo fingerprint), memoised on the case identity. */
const caseFingerprint = (s: object): number => {
  let h = own.get(s);
  if (h === undefined) { h = mcFingerprint(s as Record<string, unknown>); own.set(s, h); }
  return h;
};

/**
 * What a portfolio stress run depends on: for every planned product its effective case (the Monte Carlo fingerprint, which already
 * leaves out personas, snapshots and the like), its wave and calendar start, the calendar horizon and the correlation. Draws and seed are
 * the run's own inputs, not part of it. The run is stale when this number moved after it was made.
 */
export function pfStressFingerprint(pf: Portfolio, rho: number = pf.rho ?? 0): number {
  const parts = scheduledProducts(pf).map((s) => [s.product.id, s.wave.id, s.month0, s.lead, caseFingerprint(resolveProduct(pf, s.product.id))]);
  const str = JSON.stringify([pf.horizonMonths, clampRho(rho), parts]);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h;
}
