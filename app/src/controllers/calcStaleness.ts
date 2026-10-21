import { checkStaleness, needsBanner, type CalcStaleness } from '@/domain/calcStaleness';
import { packageOfSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';

/**
 * Load-time staleness of a saved case (legacy `calcStalenessCheck` + `renderCalcStaleBanner`).
 * The banner state lives HERE, outside the document and the history: opening, undoing or redoing never rewrites it, and only a new
 * load check or the user's Dismiss changes it. Figures are always recomputed from the inputs; this only tells the user.
 */
let banner: CalcStaleness | null = null;
const subs = new Set<() => void>();
const set = (b: CalcStaleness | null) => { banner = b; subs.forEach((f) => f()); };

export const getCalcBanner = (): CalcStaleness | null => banner;
export const onCalcBanner = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const dismissCalcBanner = (): void => { if (banner) set(null); };

/** Compare the package carried by a raw snapshot with the freshly recomputed loaded `doc`; shows or clears the banner. Never throws. */
export function checkLoadedCase(raw: unknown, doc: Doc): CalcStaleness {
  let st: CalcStaleness;
  try { st = checkStaleness(packageOfSnapshot(raw), doc); } catch (e) { console.error('Calculation staleness check failed', e); st = { state: 'notCalculated' }; }
  set(needsBanner(st) ? st : null);
  return st;
}
