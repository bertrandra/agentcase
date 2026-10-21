/** Euro formatting family: the single owner of the money text shared by the UI, the exports and the domain read-outs (en-US grouping). */

/** "€1,234" (whole euros; a negative reads "€-1,234"). */
export const fmtE = (v: number): string => `€${Math.round(v).toLocaleString('en-US')}`;

/** "€1,704K" (thousands; a negative reads "€-15K", as the legacy screens do). */
export const fmtK = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;

/** "−€1,234" with a real minus sign (U+2212) before the symbol. */
export const fmtEur = (v: number): string => `${v < 0 ? '−' : ''}€${Math.round(Math.abs(v)).toLocaleString('en-US')}`;

/** fmtEur, or "n/a" for a non-finite value (Monte Carlo / Results). */
export const fmtEurOrNA = (n: number): string => (isFinite(n) ? fmtEur(n) : 'n/a');

/** "-€99,190": hyphen-minus before the symbol (savings decomposition). */
export const fmtSigned = (n: number): string => `${n < 0 ? '-' : ''}€${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
