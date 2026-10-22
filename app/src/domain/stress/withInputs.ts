import type { Ctx } from '../ctx';
import { autoCapFrom, type Inputs } from '../inputs';

/** The same case with some form inputs overridden (what the legacy engines did by writing INPUTS.v, never the DOM). */
export function withInputs(c: Ctx, ov: Record<string, string>): Ctx {
  const num: Record<string, number> = {};
  for (const id of Object.keys(ov)) num[id] = parseFloat(ov[id] as string);   // parsed once, not on every read of the kernel
  const inp: Inputs = {
    v: (id) => (id in ov ? (ov[id] as string) : c.inp.v(id)),
    p: (id) => (id in num ? (num[id] as number) : c.inp.p(id)),
    c: (id) => c.inp.c(id),
  };
  return { ...c, inp };
}

/** Technical cap on the automation potential (autoCapPct input, 10..100). */
export function autoTechCap(c: Ctx): number {
  return autoCapFrom(c.inp.v('autoCapPct'));
}
