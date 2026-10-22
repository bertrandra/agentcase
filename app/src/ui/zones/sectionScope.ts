import scopes from './data/sectionScope.json';

/**
 * How a section follows the top-bar "View" (Portfolio / Wave / Product), see docs/VUE_AGREGEE.md:
 *  - `R-conso`     result with a natural consolidated form (sums and series of `domain/portfolio`);
 *  - `R-rollup`    per-case check or logic that does not add up: a rollup table per product + drill-down into the product's own render;
 *  - `I-input`     input section, edited per product: a read-only aggregated view of the selection, a row per product and "Edit this product";
 *  - `S-static`    reference, documentation, common settings, management: independent of the View;
 *  - `P-portfolio` the Portfolio group: already portfolio-level.
 */
export type SectionKind = 'R-conso' | 'R-rollup' | 'I-input' | 'S-static' | 'P-portfolio';
export const SECTION_KINDS: readonly SectionKind[] = ['R-conso', 'R-rollup', 'I-input', 'S-static', 'P-portfolio'];

const MAP = scopes as Record<string, SectionKind>;
/** The kind of a section id; ids unknown to the catalogue (dynamic sections made on the Board) are read as independent of the View. */
export const sectionKind = (id: string): SectionKind => MAP[id] ?? 'S-static';
/** Every id with a declared kind (validated against the catalogue by `tests/ui/section-scope.test.ts`). */
export const SECTION_KIND_IDS: readonly string[] = Object.keys(MAP);
/** Kinds whose content changes with the View (the others are shown as they are, with a banner). */
export const followsView = (k: SectionKind): boolean => k === 'R-conso' || k === 'R-rollup' || k === 'I-input';
