import { buildPortfolioPackages, deepEqual, envelopeCase, portfolioToCase, type Portfolio } from '@/domain/portfolio';
import { PORTFOLIO_SCHEMA } from '../portfolioState';
import type { Doc, PortfolioDoc } from '../types';
import { readPortfolio } from './portfolioRead';
import { fromSnapshot, sanitize, toSnapshot } from './snapshot';

const withoutView = (pf: PortfolioDoc): Portfolio => { const out = { ...pf }; delete out.editScope; delete out.displayScope; return out; };

/**
 * THE F22 RULE. A portfolio is saved as a plain single-case `agentcase.snapshot.v1` file exactly when that file re-opens (as "Produit 1" in
 * "Vague 1") to the very same portfolio: one product, one wave, no overrides, no knowledge subset, default names/ids/offset, hub and horizon
 * consistent with the case. Anything else (more products or waves, overrides, knowledge subsets, a renamed or noted product, a start
 * date, ...) keeps the portfolio format, so a save never loses information. Existing file/HTML/Excel tools keep seeing v1 files.
 */
export function isSingleCase(pf: PortfolioDoc): boolean {
  if (pf.products.length !== 1 || pf.waves.length !== 1) return false;
  const env = envelopeCase(portfolioToCase(pf)), a = env.common as Record<string, unknown>, b = pf.common as Record<string, unknown>;
  if (Object.keys(a).length !== Object.keys(b).length || !Object.keys(a).every((k) => Object.is(a[k], b[k]))) return false;   // the hub layer changed the case
  const rest: Record<string, unknown> = { ...env }, mine: Record<string, unknown> = { ...withoutView(pf) };
  delete rest.common; delete mine.common;
  return deepEqual(rest, mine);
}

/**
 * Does the work hold more than a plain single case? True from two products, two waves, an override or a knowledge subset on (and for an unplanned,
 * offset, archived, renamed or dated single product), i.e. exactly when the file is saved as a portfolio. The portfolio additions of the Excel
 * workbooks and of the report apply only then; a plain case keeps every export identical to the single-case build.
 */
export const hasPortfolioContent = (pf: PortfolioDoc): boolean => !isSingleCase(pf);

/** The calculation packages stamped into a saved portfolio (never read back as input). */
function packagesOf(pf: Portfolio): Record<string, unknown> {
  try { return { ...buildPortfolioPackages(pf) }; } catch (e) { console.error('Snapshot: portfolio calculation packages failed', e); return {}; }
}

/**
 * Portfolio -> snapshot JSON. A single-case portfolio is written as `agentcase.snapshot.v1` (see `isSingleCase`) unless `full` is set (the
 * autosave record needs the exact portfolio: its undo patches address product and wave positions).
 */
export function toPortfolioSnapshot(pf: PortfolioDoc, now: () => Date = () => new Date(), full = false): Record<string, unknown> {
  if (!full && isSingleCase(pf)) return toSnapshot(portfolioToCase(pf) as Doc, now);
  const plain = withoutView(pf);
  return { ...structuredClone(plain), savedAt: now().toISOString(), _schema: PORTFOLIO_SCHEMA, ...packagesOf(plain) };
}

export const isPortfolioSnapshot = (raw: unknown): boolean => !!raw && typeof raw === 'object' && (raw as { _schema?: unknown })._schema === PORTFOLIO_SCHEMA;

/** Any saved case, old or new, as a portfolio: `agentcase.portfolio.v1` as is, a single case (v1 or legacy) enveloped as "Produit 1" / "Vague 1" (F21). */
export function openSnapshot(raw: unknown): Portfolio {
  return isPortfolioSnapshot(raw) ? readPortfolio(raw) : envelopeCase(fromSnapshot(raw));
}

/** The per-product packages a portfolio snapshot carries (`calculationPackages`), or undefined. */
export function packagesOfSnapshot(raw: unknown): unknown {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? sanitize((raw as Record<string, unknown>).calculationPackages) : undefined;
}
