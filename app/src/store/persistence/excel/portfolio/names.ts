/** @calc-zone exports */
import { MAX_PRODUCTS } from '@/domain/portfolio';

/** The sheets a portfolio adds to the parameters workbook (the 47 existing sheets keep describing the COMMON case). */
export const PF_SHEETS = {
  products: 'Products', waves: 'Waves', team: 'TeamIn', overrides: 'Overrides', subsets: 'KnowledgeSubsets', domains: 'KnowledgeDomains',
  settings: 'PortfolioSettings',
} as const;
export const PORTFOLIO_SHEETS: ReadonlySet<string> = new Set(Object.values(PF_SHEETS));

/** Import caps of the portfolio sheets (on top of the workbook-wide limits of `params/safe.ts`). */
export const PF_LIMITS = { products: MAX_PRODUCTS, waves: 50, teamRowsPerProduct: 200, overridesPerProduct: 120, overrideChunks: 25, chunkChars: 4000,
  domainsPerProduct: 50, startMonth: 1200, offset: 1200 };

/** Header of every portfolio sheet: the first cell is checked on import so a foreign sheet of the same name is refused. */
export const PF_HEADERS: Record<string, string[]> = {
  [PF_SHEETS.settings]: ['Setting', 'Value'],
  [PF_SHEETS.products]: ['Product id', 'Name', 'Wave id', 'Offset (months)', 'Position in wave', 'Note', 'Archived'],
  [PF_SHEETS.waves]: ['Wave id', 'Name', 'Start month', 'Note', 'Order', 'Depends on (wave id)', 'Milestone (start / setupEnd)', 'Lag (months)'],
  [PF_SHEETS.team]: ['Product id', 'Skill', 'Grade', 'Location', 'FTE', 'Pinned artefacts (; separated)'],
  [PF_SHEETS.overrides]: ['Product id', 'Key', 'Part', 'Value (JSON)'],
  [PF_SHEETS.subsets]: ['Product id', 'Enabled', 'Target CC', 'Curation FTE', 'Setup base', 'KT lead (months)',
    ...Array.from({ length: 9 }, (_, i) => `Maturity A${i + 1}`)],
  [PF_SHEETS.domains]: ['Product id', 'Domain', 'Weight %'],
};
