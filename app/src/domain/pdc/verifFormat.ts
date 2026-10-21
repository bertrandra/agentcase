/** Display helpers of the verification section (identical to the legacy globals). Kept here so the check results carry their legacy text. */
export const fmtK = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;
export const fmtE = (v: number): string => `€${Math.round(v).toLocaleString('en-US')}`;
export const fmtRoi = (r: number | null): string => (r == null ? 'n/a' : `${Math.round(r * 100)}%`);
export const fx = (r: number | null): string => (r == null ? 'n/a' : `${r.toFixed(1)}x`);
