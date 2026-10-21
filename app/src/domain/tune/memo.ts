import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import type { Engine } from '../time';
import type { ModelResult } from '../types/model';

const models = new WeakMap<Ctx, ModelResult>(), engines = new WeakMap<Ctx, Engine>();

/** model() of a context, computed once per context (sections ask for it several times per render). */
export function modelOf(c: Ctx): ModelResult {
  let m = models.get(c);
  if (!m) { m = model(c); models.set(c, m); }
  return m;
}
/** teEngineNow(): the Time Engine on the live curve, once per context. */
export function engineOf(c: Ctx): Engine {
  let e = engines.get(c);
  if (!e) { e = engineNow(c); engines.set(c, e); }
  return e;
}
/** teEndYear(): horizon in years (3 when the engine cannot be built, like the legacy try/catch). */
export function endYear(c: Ctx): number {
  try { return engineOf(c).horizonYears; } catch { return 3; }
}
/** teEndYearRow(): the engine's aggregate of the last horizon year. */
export function endYearRow(c: Ctx) {
  const e = engineOf(c);
  return e.year(e.horizonYears);
}
