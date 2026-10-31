/** @calc-zone stress */
import type { Ctx } from '../ctx';
import { activeCurve } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { buildK, econ } from '../time/kernel';
import { keptMonths, type Scheduled } from './timeline';

type Placement = Pick<Scheduled, 'month0' | 'lead'>;

/**
 * Net benefit of one evaluation of a planned product as the consolidation books it (`series.ts#build`): product month t is calendar month
 * month0 + t, the months past the portfolio horizon `L` are dropped, and with a KT lead the KT part of the setup leaves its home months for
 * the preparation months (so it counts when the preparation falls inside the horizon and the home months do not). Same kernel (`econ`) and
 * curve as the full engine, one pass, no row objects.
 */
export function cutNet(c: Ctx, s: Placement, L: number): number {
  const K = buildK(c, modelRaw(c), { mode: 'full', curveModelId: activeCurve(c) }), kept = keptMonths(L, s.month0, K.horizonMonths);
  let net = 0;
  for (let t = 1; t <= kept; t++) net += econ(t, K).netSav;
  if (s.lead <= 0) return net;
  for (let t = 1; t <= K.ktProfile.length; t++) {
    const part = K.ktProfile[t - 1]!;
    if (part === 0) continue;
    if (s.month0 + t - 1 < L) net += part;
    if (s.month0 - s.lead + t - 1 < L) net -= part;
  }
  return net;
}

/**
 * The outcome of a draw of a product cut by the portfolio horizon (its own months run past `L`), or undefined when nothing is cut: the
 * draw then keeps the single-case metric `mcOutcome` (same number, unchanged arithmetic), so a product inside the horizon draws what it draws today.
 */
export const cutOutcome = (s: Placement, ownMonths: number, L: number): ((c: Ctx) => number) | undefined =>
  (s.month0 + ownMonths > L ? (c: Ctx) => cutNet(c, s, L) : undefined);
