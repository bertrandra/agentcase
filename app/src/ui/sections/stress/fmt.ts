/** €1,234,567 with a real minus sign (legacy Monte Carlo / Results format); "n/a" for a non-finite value. */
export const fmtEur = (n: number): string => (isFinite(n) ? `${n < 0 ? '−' : ''}€${Math.round(Math.abs(n)).toLocaleString('en-US')}` : 'n/a');
