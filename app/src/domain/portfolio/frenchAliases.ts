/** @calc-zone foundation */
/**
 * THE ONLY FRENCH TEXT ALLOWED IN THE SOURCE. The product is English (every user-facing string); these are the display names that files saved by
 * v20.0 (the first multi-product build, French labels) may carry, kept so such a file still opens as before and is still recognised as a plain
 * single case. The importer and the F22 single-case rule accept both these and the English defaults; everything written is English.
 * `tests/ui/english-only.test.ts` lets these strings (and only these) through.
 */
export const FRENCH_ALIASES = {
  defaultProductNames: ['Produit 1'] as string[],
  defaultWaveNames: ['Vague 1'] as string[],
  /** French text the legacy v18.13 oracle itself shows (golden fixtures compare it character for character, so it is kept verbatim). */
  legacyOracle: { 'domain/stress/compare.ts': ['mois'], 'ui/sections/tune/knowledge/index.tsx': ['mémoire vivante'], 'ui/zones/data/sectionCatalog.json': ['AS-IS team composition: skill × grade × location × ETP'] } as Record<string, string[]>,
};

/** The default name of the first product / wave of an enveloped single case (English since v20.1). */
export const DEFAULT_PRODUCT_NAME = 'Product 1';
export const DEFAULT_WAVE_NAME = 'Wave 1';

/** Is this the default name of the first product (current English or legacy French)? */
export const isDefaultProductName = (name: string): boolean => name === DEFAULT_PRODUCT_NAME || FRENCH_ALIASES.defaultProductNames.includes(name);
/** Is this the default name of the first wave (current English or legacy French)? */
export const isDefaultWaveName = (name: string): boolean => name === DEFAULT_WAVE_NAME || FRENCH_ALIASES.defaultWaveNames.includes(name);
