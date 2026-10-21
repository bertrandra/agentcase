import type { Ctx } from '../ctx';
import type { Inputs } from '../inputs';

/** The same case with some form inputs overridden (what the legacy engines did by writing INPUTS.v, never the DOM). */
export function withInputs(c: Ctx, ov: Record<string, string>): Ctx {
  const inp: Inputs = {
    v: (id) => (id in ov ? (ov[id] as string) : c.inp.v(id)),
    p: (id) => (id in ov ? parseFloat(ov[id] as string) : c.inp.p(id)),
    c: (id) => c.inp.c(id),
  };
  return { ...c, inp };
}

/** Technical cap on the automation potential (autoCapPct input, 10..100). */
export function autoTechCap(c: Ctx): number {
  const v = parseFloat(c.inp.v('autoCapPct'));
  return isNaN(v) ? 100 : Math.max(10, Math.min(100, v));
}
