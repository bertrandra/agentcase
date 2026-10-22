import { applyPatches, current, isDraft, produceWithPatches, type Patch } from 'immer';
import { envelopeCase, resolveProduct } from '@/domain/portfolio';
import { addressPatches } from './address';
import type { Command, Doc, PortfolioDoc } from './types';
import { VIEW_FIELDS } from './types';

export const PORTFOLIO_SCHEMA = 'agentcase.portfolio.v1';

/** A portfolio document (as opposed to a single case `Doc`). */
export const isPortfolio = (x: unknown): x is PortfolioDoc =>
  !!x && typeof x === 'object' && (x as { _schema?: unknown })._schema === PORTFOLIO_SCHEMA && Array.isArray((x as { products?: unknown }).products);

/** Whatever is opened — a case or a portfolio — as a portfolio. A single case becomes "Product 1" in "Wave 1" (F21). */
export const asPortfolio = (x: Doc | PortfolioDoc): PortfolioDoc => (isPortfolio(x) ? x : envelopeCase(x));

/** The derived `doc` of the store: the active product's effective case (identity-stable while its inputs are, via the resolve memo). */
export const deriveDoc = (pf: PortfolioDoc): Doc => resolveProduct(pf, pf.activeProductId) as Doc;

/** After an undo, redo or remote patch the active product may no longer exist: fall back to the first one (view state, no history). */
export function normalizeActive(pf: PortfolioDoc): PortfolioDoc {
  if (pf.products.some((p) => p.id === pf.activeProductId)) return pf;
  return { ...pf, activeProductId: (pf.products[0] as { id: string }).id };
}

/** Patches that only move view state (active product, edit scope) are not document changes for another tab. */
export const documentPatches = (ps: Patch[]): Patch[] => ps.filter((p) => !VIEW_FIELDS.includes(p.path[0] as string));

/**
 * Run commands on the portfolio draft. A portfolio command mutates it directly; a case command runs on a draft of the active product's
 * effective case and its patches are re-addressed (common / override / team) onto the portfolio, so the whole batch is ONE Immer produce.
 */
export function runCommands(pf: PortfolioDoc, cmds: Command[]): [PortfolioDoc, Patch[], Patch[]] {
  return produceWithPatches(pf, (d) => {
    for (const c of cmds) {
      if (c.runPortfolio) { c.runPortfolio(d as PortfolioDoc, c.payload); continue; }
      const cur = (isDraft(d) ? current(d) : d) as PortfolioDoc, base = deriveDoc(cur);
      const [next, patches] = produceWithPatches(base, (x) => { c.run(x as Doc, c.payload); });
      if (patches.length) applyPatches(d, addressPatches(cur, base, next, patches, cur.editScope ?? 'all'));
    }
  }) as [PortfolioDoc, Patch[], Patch[]];
}
