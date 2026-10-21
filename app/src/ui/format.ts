const eur = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
/** €1,234k style amounts for the KPI bar. */
export const fmtEurK = (v: number): string => (isFinite(v) ? `${v < 0 ? '-' : ''}€${eur.format(Math.round(Math.abs(v) / 1000))}k` : 'n/a');
export const fmtPct = (v: number): string => (isFinite(v) ? `${Math.round(v)}%` : 'n/a');
export const fmtMonths = (v: number | null): string => (v == null ? 'beyond horizon' : `${v} mo`);
export { fmtE, fmtK, fmtEur, fmtEurOrNA, fmtSigned } from '@/domain/format';
