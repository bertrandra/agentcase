/** @calc-zone exports */
/* eslint-disable no-control-regex -- stripping control characters is the point */
const BAD = /[\u0000-\u001f[\]:*?/\\]/g;
/* eslint-enable no-control-regex */
const MAX = 31;

/** The sheet names (and name prefixes) of the portfolio part of the results workbook, in workbook order; each goes through `sheetName`. */
export const PF_RESULT_SHEETS = {
  portfolio: 'Portfolio', unit: 'Unit ', wave: 'Wave ', kt: 'Knowledge transfer', stress: 'Portfolio stress', services: 'Services', product: 'Product ',
} as const;

/**
 * An Excel-safe worksheet name: at most 31 characters, none of `[ ] : * ? / \`, no leading or trailing apostrophe, never empty, and unique
 * (case-insensitively) among `used`, to which it is added. A duplicate gets " (2)", " (3)"... inside the 31 characters.
 */
export function sheetName(base: string, used: Set<string>): string {
  const clean = base.replace(BAD, '-').replace(/\s+/g, ' ').trim().replace(/^'+|'+$/g, '').trim() || 'Sheet';
  let name = clean.slice(0, MAX).trim().replace(/'+$/g, ''), n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n++})`;
    name = clean.slice(0, MAX - suffix.length).trim().replace(/'+$/g, '') + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}
