/** Numbers of the organisation screens: at most two decimals, no trailing zeros (FTE, shares, effort points). */
const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
export const fmtNum = (v: number): string => (Number.isFinite(v) ? nf.format(v) : 'n/a');
