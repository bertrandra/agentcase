/** @calc-zone foundation */
import { workingArtefacts, type ArtefactSets } from './artefacts';
import { makeInputs, type Inputs } from './inputs';
import type { CaseState } from './types/state';

/** Everything an engine function needs, derived once from a case: inputs, working artefacts, Monte-Carlo scales. */
export interface Ctx {
  s: CaseState;
  inp: Inputs;
  a: ArtefactSets;
  rateScale: number | null;
  tokenScale: number | null;
}

export function makeCtx(s: CaseState, opts: { rateScale?: number | null; tokenScale?: number | null } = {}): Ctx {
  return { s, inp: makeInputs(s), a: workingArtefacts(s), rateScale: opts.rateScale ?? null, tokenScale: opts.tokenScale ?? null };
}
