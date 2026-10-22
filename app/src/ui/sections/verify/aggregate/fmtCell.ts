import type { Cell, CellKind } from '@/domain/portfolio';
import { fmtE } from '@/ui/format';

/** A domain cell as the roll-up tables print it (null stays blank: the figure does not add up). */
export function fmtCell(v: Cell | undefined, kind: CellKind): string {
  if (v === null || v === undefined) return '';
  if (kind === 'text' || typeof v === 'string') return String(v);
  if (!isFinite(v)) return 'n/a';
  switch (kind) {
    case 'int': return String(Math.round(v));
    case 'n1': return v.toFixed(1);
    case 'n2': return v.toFixed(2);
    case 'pct': return `${Math.round(v)}%`;
    case 'eur': return fmtE(v);
    default: return String(v);
  }
}
