import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { daGet, daVal } from './anchors';
import { perfRel } from './perf';

/**
 * Delivery velocity uplift at the horizon end, in whole percent versus the AS-IS velocity anchor (legacy top-bar "Velocity Y3" and the
 * story line). The one owner: the velocity reached follows the adoption at the horizon end and stays inside the case anchors.
 */
export function velocityUpliftPct(c: Ctx): number {
  const ys = engineNow(c).years(), e = ys[ys.length - 1]!, v0 = daGet(c.s, 'velocitySp').asis;
  return v0 > 0 ? Math.round((Math.round(daVal(c.s, 'velocitySp', perfRel(c, e.adoptionEndPct))) - v0) / v0 * 100) : 0;
}
