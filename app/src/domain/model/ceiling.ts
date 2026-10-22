/** @calc-zone scope-automation @owner glass-ceiling */
import type { Ctx } from '../ctx';
import { phaseScope } from '../scope';

/** Glass ceiling = effort-weighted human supervision of the scope; falls back to the manual input when the scope has no weight. */
export function computeGlassCeiling(c: Ctx): number {
  const sc = phaseScope(c.a, c.s);
  if (!(sc.selW > 0)) return c.inp.p('glassCeiling') || 0;
  return Math.round(sc.avgHuman || 0);
}
