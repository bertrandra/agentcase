/** Money / number formatting of the economics views. Identical to the legacy globals so the figures read the same. */

/** Legacy fmtE: "€1,234" (whole euros). */
export { fmtE } from '@/ui/format';

/** Legacy fmtK: "€1,704K" (thousands, explicit locale). Negative values read "−€15K" (DEV-NEG-MONEY). */
export { fmtK } from '@/ui/format';

/** One decimal (FTE counts). */
export const fmt1 = (v: number): string => v.toFixed(1);

/** Signed euro with the minus before the symbol: "−€99,190" (savings decomposition). */
export { fmtSigned } from '@/ui/format';

/** Chart axis tick in thousands: 1_704_000 -> "€1704K". */
export const tickK = (v: number | string): string => `€${Math.round(Number(v) / 1000)}K`;

/** Whole percent: 54.6 -> "55%". */
export const pct0 = (v: number): string => `${Math.round(v)}%`;
