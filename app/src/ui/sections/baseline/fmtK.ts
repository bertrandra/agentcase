/** €1,234K — the legacy fmtK (explicit en-US grouping). */
export const fmtK = (v: number): string => `€${Math.round(v / 1000).toLocaleString('en-US')}K`;
