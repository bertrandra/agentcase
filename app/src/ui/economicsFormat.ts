/** Money / number formatting of the economics views. Identical to the legacy globals so the figures read the same. */

/** Legacy fmtE: "€1,234" (whole euros). */
export const fmtE = (v: number): string => `€${Math.round(v).toLocaleString('en-US')}`;

/** Legacy fmtK: "€1,704K" (thousands, explicit locale). Negative values read "€-15K", as the legacy screens do. */
export const fmtK = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;

/** One decimal (FTE counts). */
export const fmt1 = (v: number): string => v.toFixed(1);

/** "(€225,000)" for a negative amount, "€225,000" otherwise (P&L presentation). */
export const fmtParen = (v: number): string => (v < 0 ? `(${fmtE(-v)})` : fmtE(v));

/** Signed euro with the minus before the symbol: "-€99,190" (savings decomposition). */
export const fmtSigned = (n: number): string => `${n < 0 ? '-' : ''}€${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/** Chart axis tick in thousands: 1_704_000 -> "€1704K". */
export const tickK = (v: number | string): string => `€${Math.round(Number(v) / 1000)}K`;

/** Whole percent: 54.6 -> "55%". */
export const pct0 = (v: number): string => `${Math.round(v)}%`;
