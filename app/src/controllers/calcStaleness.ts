/** @calc-zone exports */
import { checkStaleness, needsBanner, type CalcStaleness } from '@/domain/calcStaleness';
import { checkPortfolioStaleness, resolveProduct } from '@/domain/portfolio';
import { isPortfolioSnapshot, packagesOfSnapshot } from '@/store/persistence/portfolioSnapshot';
import { packageOfSnapshot } from '@/store/persistence/snapshot';
import { isPortfolio } from '@/store/portfolioState';
import type { Doc, PortfolioDoc } from '@/store/types';

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

/**
 * Compare the packages carried by a raw snapshot with the freshly recomputed loaded work; shows or clears the banner. Never throws.
 * A single-case file is checked on the case; a portfolio file at both levels (every product and the consolidation), same banner states.
 */
export function checkLoadedCase(raw: unknown, loaded: Doc | PortfolioDoc): CalcStaleness {
  let st: CalcStaleness;
  try {
    if (isPortfolioSnapshot(raw) && isPortfolio(loaded)) st = checkPortfolioStaleness(packageOfSnapshot(raw), packagesOfSnapshot(raw), loaded);
    else st = checkStaleness(packageOfSnapshot(raw), isPortfolio(loaded) ? (resolveProduct(loaded, loaded.activeProductId) as Doc) : loaded);
  } catch (e) { console.error('Calculation staleness check failed', e); st = { state: 'notCalculated' }; }
  set(needsBanner(st) ? st : null);
  return st;
}
