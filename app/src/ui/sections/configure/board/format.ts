import { fmtK } from '@/ui/economicsFormat';

export const FORMAT_IDS = ['EUR_K', 'EUR_M', 'PCT', 'INT', 'DEC1', 'DEC2', 'RATIO', 'DAYS', 'BOOL', 'TEXT'];

/** Board display formats (legacy formatValue): a null or empty value reads as a dash. */
export function formatValue(v: unknown, format: string | null | undefined): string {
  if (format === 'BOOL') return v ? '✓ On' : '✗ Off';
  if (v == null || v === '') return '—';
  const n = Number(v);
  switch (format) {
    case 'EUR_K': return fmtK(n);
    case 'EUR_M': return `€${(n / 1e6).toFixed(2)}M`;
    case 'PCT': return `${Math.round(n)}%`;
    case 'INT': return Math.round(n).toLocaleString('en-US');
    case 'DEC1': return n.toFixed(1);
    case 'DEC2': return n.toFixed(2);
    case 'RATIO': return `${n.toFixed(1)}x`;
    case 'DAYS': return `${n < 2 ? n.toFixed(1) : Math.round(n)}d`;
    default: return String(v);
  }
}
