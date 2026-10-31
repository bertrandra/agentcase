/** @calc-zone exports */
import { DEFAULT_UNIT_ID, storedTeams } from '@/domain/org';
import { buildPortfolioPackages, DEFAULT_PRODUCT_NAME, DEFAULT_WAVE_NAME, deepEqual, envelopeCase, isDefaultProductName, isDefaultWaveName, portfolioToCase,
  processCommon, type Portfolio } from '@/domain/portfolio';
import { attr, type XDocument } from '@/domain/process';
import { withSavedPersona } from '../persona';
import { openChecked, versionStamp } from './schema';
import { PORTFOLIO_SCHEMA } from '../portfolioState';
import type { Doc, PortfolioDoc } from '../types';
import { sanitize, toSnapshot } from './snapshot';
import { portfolioInFile } from './bpmn/caseFile';

const withoutView = (pf: PortfolioDoc): Portfolio => { const out = { ...pf }; delete out.editScope; delete out.displayScope; delete out.persona; return out; };
/** The same portfolio with the legacy French default names ("Produit 1", "Vague 1" of a v20.0 file) read as the English defaults: both are "default names". */
const withDefaultNames = (pf: Portfolio): Portfolio => ({
  ...pf,
  products: pf.products.map((p) => (isDefaultProductName(p.name) ? { ...p, name: DEFAULT_PRODUCT_NAME } : p)),
  waves: pf.waves.map((w) => (isDefaultWaveName(w.name) ? { ...w, name: DEFAULT_WAVE_NAME } : w)),
});

/** The only stored team is the product's own one, in the default unit, with no owning unit and no shared line (what a case file keeps). */
function plainTeams(pf: PortfolioDoc): boolean {
  const st = storedTeams(pf.common.BPMN as XDocument | undefined), id = (pf.products[0] as { id: string }).id, own = st.own.get(id);
  return !st.shared.length && st.own.size <= 1 && (!own || (attr(own, 'unit') === DEFAULT_UNIT_ID && attr(own, 'owner') === undefined));
}

/**
 * THE F22 RULE. A portfolio is saved as a plain single-case `agentcase.snapshot.v1` file exactly when that file re-opens (as "Product 1" in
 * "Wave 1") to the very same portfolio: one product, one wave, no overrides, no knowledge subset, default names (English, or the French "Produit 1" /
 * "Vague 1" of a v20.0 file)/ids/offset, hub and horizon consistent with the case. Anything else (more products or waves, overrides, knowledge
 * subsets, a renamed or noted product, a start date, ...) keeps the portfolio format, so a save never loses information. Existing file/HTML/Excel
 * tools keep seeing v1 files.
 */
export function isSingleCase(pf: PortfolioDoc): boolean {
  if (pf.products.length !== 1 || pf.waves.length !== 1 || !plainTeams(pf)) return false;
  // schema v5: the case's document is compared without its stored teams (the envelope writes the team again; `plainTeams` checked the rest)
  const env = envelopeCase(portfolioToCase(pf)), a = processCommon(env.common) as Record<string, unknown>,
    b = processCommon(pf.common) as Record<string, unknown>;
  if (Object.keys(a).length !== Object.keys(b).length || !Object.keys(a).every((k) => Object.is(a[k], b[k]))) return false;   // the hub layer changed the case
  const rest: Record<string, unknown> = { ...env }, mine: Record<string, unknown> = { ...withDefaultNames(withoutView(pf)) };
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
 * autosave record needs the exact portfolio: its undo patches address product and wave positions). The tab's persona is written as the legacy
 * `currentPersona` (first key of the case / of `common`): the persona the file opens on, nothing more (`store/persona.ts`). Every process
 * document is written as XML text (schema v3).
 */
export function toPortfolioSnapshot(pf: PortfolioDoc, now: () => Date = () => new Date(), full = false): Record<string, unknown> {
  if (!full && isSingleCase(pf)) return toSnapshot(withSavedPersona(portfolioToCase(pf) as Doc, pf.persona), now);
  const plain = withoutView(pf), saved = { ...plain, common: withSavedPersona(plain.common, pf.persona) };
  return { ...structuredClone(portfolioInFile(saved)), savedAt: now().toISOString(), _schema: PORTFOLIO_SCHEMA, ...versionStamp(), ...packagesOf(plain) };
}

export const isPortfolioSnapshot = (raw: unknown): boolean => !!raw && typeof raw === 'object' && (raw as { _schema?: unknown })._schema === PORTFOLIO_SCHEMA;

/**
 * Any saved case, old or new, as a portfolio: `agentcase.portfolio.v1` as is, a single case (v1 or legacy) enveloped as "Product 1" / "Wave 1" (F21).
 * Migrated to the current file schema and corrected where damaged (`schema/index.ts#openChecked`, which also returns the correction notes).
 */
export const openSnapshot = (raw: unknown): PortfolioDoc => openChecked(raw).portfolio;

/** The per-product packages a portfolio snapshot carries (`calculationPackages`), or undefined. */
export function packagesOfSnapshot(raw: unknown): unknown {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? sanitize((raw as Record<string, unknown>).calculationPackages) : undefined;
}
