/** @calc-zone time-engine */
import type { Ctx } from '../ctx';
import { modelRaw } from '../model/raw';
import type { ModelResult } from '../types/model';
import { makeEngine } from './engine';
import { buildK, type BuildOpts } from './kernel';

export { makeEngine, type Engine } from './engine';
export { buildK, type K } from './kernel';

/** Build an engine from a case: raw flat model → constants → engine (the engine is ALWAYS built from the raw model). */
export function timeFor(c: Ctx, opts: BuildOpts & { model?: ModelResult } = {}) {
  return makeEngine(buildK(c, opts.model ?? modelRaw(c), opts));
}
