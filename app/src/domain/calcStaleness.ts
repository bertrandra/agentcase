import { buildCalcPackage, parseCalcPackage, type CalcPackage, type PackageHeadline } from './calcPackage';
import type { CaseState } from './types/state';

/**
 * Legacy `calcStalenessCheck` states. `notCalculated`: the file carries no package (older files): nothing to say.
 * `valid`: same engine, same inputs, same figures. `stale`: inputs or figures differ (or the package is unreadable).
 * `versionMismatch`: another engine version computed the file.
 */
export type CalcState = 'valid' | 'stale' | 'versionMismatch' | 'notCalculated';
export interface CalcStaleness { state: CalcState; storedHeadline?: PackageHeadline; liveHeadline?: PackageHeadline; storedVersion?: string; liveVersion?: string }
export const needsBanner = (s: CalcStaleness): boolean => s.state === 'stale' || s.state === 'versionMismatch';

const REL = 1e-6;
const close = (a: number | null, b: number | null): boolean => a === b || (a !== null && b !== null && Math.abs(a - b) <= REL * Math.max(1, Math.abs(a), Math.abs(b)));
const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => close(x, b[i] as number));
const flat = (p: CalcPackage): number[] => [p.headline.npv, p.headline.totalSavings, ...p.annual.flatMap((y) => [y.yearIndex, y.savings, y.totalRunCost, y.netAfterSetup, y.cumulativeCashFlowEnd])];

/** Do two packages carry the same engine identity and the same figures (to 1e-6 relative)? */
export function samePackage(a: CalcPackage, b: CalcPackage): boolean {
  return a.calculationVersion === b.calculationVersion && a.inputHash === b.inputHash && a.curveModelId === b.curveModelId
    && close(a.headline.payback, b.headline.payback) && close(a.headline.roi, b.headline.roi) && same(flat(a), flat(b));
}

/** Compare the package a file carried with a fresh computation of the loaded case. Figures themselves are never taken from the file. */
export function checkStaleness(stored: unknown, state: CaseState): CalcStaleness {
  if (stored === undefined || stored === null) return { state: 'notCalculated' };
  const live = buildCalcPackage(state), pkg = parseCalcPackage(stored);
  const base = { liveHeadline: live.headline, liveVersion: live.calculationVersion };
  if (!pkg) return { state: 'stale', ...base };
  const info = { ...base, storedHeadline: pkg.headline, storedVersion: pkg.calculationVersion };
  if (pkg.calculationVersion !== live.calculationVersion) return { state: 'versionMismatch', ...info };
  return { state: samePackage(pkg, live) ? 'valid' : 'stale', ...info };
}
