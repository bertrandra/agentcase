const eur = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
/**
 * €1,234k style amounts for the KPI bar. Negative amounts read "−€1,234k" (U+2212 before the euro sign: the one convention, docs/DEVIATIONS.md
 * DEV-NEG-MONEY).
 */
export const fmtEurK = (v: number): string => (isFinite(v) ? `${v < 0 ? '−' : ''}€${eur.format(Math.round(Math.abs(v) / 1000))}k` : 'n/a');
export const fmtPct = (v: number): string => (isFinite(v) ? `${Math.round(v)}%` : 'n/a');
/** A payback in months: "9 mo", "immediate" (0: nothing invested, see `displayedPayback`) or "beyond horizon". */
export const fmtMonths = (v: number | null): string => (v == null ? 'beyond horizon' : v <= 0 ? 'immediate' : `${v} mo`);
export { fmtE, fmtK, fmtEur, fmtEurOrNA, fmtSigned } from '@/domain/format';
