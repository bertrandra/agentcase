import { parseCalcPackage, type CalcPackage } from '../calcPackage';
import type { CalcStaleness, CalcState } from '../calcStaleness';
import { samePackage } from '../calcStaleness';
import { buildPortfolioPackages } from './package';
import type { Portfolio } from './types';

const RANK: Record<CalcState, number> = { notCalculated: 0, valid: 1, stale: 2, versionMismatch: 3 };

/** The state of one stored package against its live twin (the single-case rules of `checkStaleness`). A missing or unreadable package is stale. */
function compare(stored: unknown, live: CalcPackage): CalcState {
  const pkg = parseCalcPackage(stored);
  if (!pkg) return 'stale';
  if (pkg.calculationVersion !== live.calculationVersion) return 'versionMismatch';
  return samePackage(pkg, live) ? 'valid' : 'stale';
}

const own = (o: unknown, k: string): unknown => (o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? (o as Record<string, unknown>)[k] : undefined);

/**
 * Staleness of a saved portfolio at BOTH levels with the single-case banner states: every product's package against its resolved case, and the
 * portfolio package against the consolidation. The worst state wins (versionMismatch > stale > valid); `staleProducts` names the products that moved.
 * A file with no package at all (older or hand-made) is `notCalculated`: silent.
 */
export function checkPortfolioStaleness(storedPortfolio: unknown, storedProducts: unknown, pf: Portfolio): CalcStaleness {
  if ((storedPortfolio === undefined || storedPortfolio === null) && (storedProducts === undefined || storedProducts === null)) return { state: 'notCalculated' };
  const live = buildPortfolioPackages(pf), top = live.calculationPackage;
  let state: CalcState = compare(storedPortfolio, top);
  const staleProducts: string[] = [];
  for (const p of pf.products) {
    const s = compare(own(storedProducts, p.id), live.calculationPackages[p.id] as CalcPackage);
    if (s !== 'valid') staleProducts.push(p.id);
    if (RANK[s] > RANK[state]) state = s;
  }
  const pkg = parseCalcPackage(storedPortfolio);
  return {
    state, liveHeadline: top.headline, liveVersion: top.calculationVersion, ...(pkg ? { storedHeadline: pkg.headline, storedVersion: pkg.calculationVersion } : {}),
    ...(staleProducts.length ? { staleProducts } : {}),
  };
}
