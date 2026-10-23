import type { ReactNode } from 'react';
import { setCoef, type CoefKey } from '@/controllers/tuneA';
import { useDoc } from '@/store/hooks';
import { Field } from './fields';

/** Legacy fmtK(): €45K (explicit en-US grouping). */
export { fmtK } from '@/ui/format';

/** A model coefficient (COEF) shown and edited as a form input; the case's COEF is the source of truth. */
export function CoefInput({ coef, id, label, hint, min, max, step }: { coef: CoefKey; id: string; label: string; hint?: string; min?: number; max?: number; step?: number }) {
  const value = useDoc((d) => d.COEF[coef] ?? '');
  return <Field label={label} hint={hint}><input type="number" value={value} min={min} max={max} step={step} onChange={(e) => setCoef(coef, id, e.target.value)} /></Field>;
}

/** Horizontal bar, `pct` of the track (0–100). */
export function Meter({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div role="meter" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ background: 'var(--ac-line)', borderRadius: 'var(--ac-radius-md)', overflow: 'hidden', height: 16 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color }} />
    </div>
  );
}

/** Small note under a block (legacy grey 11px reference line). */
export const Note = ({ children }: { children: ReactNode }) => <p className="ac-muted" style={{ fontSize: 'var(--ac-font-size-md)' }}>{children}</p>;
