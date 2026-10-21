const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
/** €12,345 (legacy fmtE / fmtEur). */
export const eur = (v: number): string => `€${n0.format(Math.round(v))}`;
/** €12K (legacy fmtK; a negative amount reads €-12K like the legacy figures). */
export const eurK = (v: number): string => `€${n0.format(Math.round(v / 1000))}K`;
/** 12,345 */
export const int = (v: number): string => n0.format(Math.round(v));
export const fix = (v: number, d: number): string => v.toFixed(d);
/** Signed one-decimal figure: +1.2 / -0.4 */
export const signed = (v: number, d = 1): string => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;
