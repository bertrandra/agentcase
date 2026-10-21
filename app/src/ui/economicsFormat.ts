/** Money / number formatting of the economics views. Identical to the legacy globals so the figures read the same. */

/** Whole euros: "€1,234", negative "−€1,234" (U+2212 before the euro sign: the one convention for a negative amount, DEV-NEG-MONEY). */
export const fmtE = (v: number): string => `${v < 0 && Math.round(v) !== 0 ? '−' : ''}€${Math.abs(Math.round(v)).toLocaleString('en-US')}`;

/** Legacy fmtK: "€1,704K" (thousands, explicit locale); negative "−€15K" (DEV-NEG-MONEY; the legacy printed "€-15K"). */
export const fmtK = (v: number): string => `${v < 0 && Math.round(v / 1000) !== 0 ? '−' : ''}€${Math.abs(Math.round(v / 1000)).toLocaleString('en-US')}K`;

/** One decimal (FTE counts). */
export const fmt1 = (v: number): string => v.toFixed(1);

/** Signed euro with the minus before the symbol: "−€99,190" (P&L, savings decomposition; the legacy P&L used "(€99,190)"). Same as `fmtE`. */
export const fmtSigned = fmtE;

/** Chart axis tick in thousands: 1_704_000 -> "€1704K". */
export const tickK = (v: number | string): string => `€${Math.round(Number(v) / 1000)}K`;

/** Whole percent: 54.6 -> "55%". */
export const pct0 = (v: number): string => `${Math.round(v)}%`;
