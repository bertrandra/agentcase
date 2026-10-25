import type { ReactNode } from 'react';
import { setCoef, type CoefKey } from '@/controllers/tuneA';
import { useDoc } from '@/store/hooks';
import { cssVars } from '../cssVars';
import { PlainNumber } from './field/PlainNumber';

/** Legacy fmtK(): €45K (explicit en-US grouping). */
export { fmtK } from '@/ui/format';

/** A model coefficient (COEF) shown and edited as a form input; the case's COEF is the source of truth. */
export function CoefInput({ coef, id, label, hint, min, max, step }: { coef: CoefKey; id: string; label: string; hint?: string; min?: number; max?: number;
  step?: number }) {
  const value = useDoc((d) => d.COEF[coef] ?? '');
  return (
    <PlainNumber label={label} hint={hint} value={value} min={min} max={max} step={step} onCommit={(v) => setCoef(coef, id, v)} />
  );
}

/** Horizontal bar, `pct` of the track (0–100). */
export function Meter({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="ac-meter" role="meter" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      {/* dynamic: the filled share and its colour are the caller's data */}
      <div style={cssVars({ '--dyn-meter-pct': `${Math.max(0, Math.min(100, pct))}%`, '--dyn-meter-color': color })} />
    </div>
  );
}

/** Small note under a block (legacy grey 11px reference line). */
export const Note = ({ children }: { children: ReactNode }) => <p className="ac-muted ac-note-sm">{children}</p>;
