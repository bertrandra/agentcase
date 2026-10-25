import { useId, type ReactNode } from 'react';
import { useThemeAxis } from '@/ui/themeAxes';
import { Field, FieldGroup } from './Field';
import { NumCell } from './NumCell';

/** How a numeric control renders today (its default variant). */
export type NumericNative = 'number' | 'slider' | 'slider-field';
type Variant = 'number' | 'slider' | 'slider-field' | 'stepper';

export interface FieldNumberProps {
  label: string; hint?: ReactNode; value: number | string; onCommit: (raw: string) => void;
  min?: number; max?: number; step?: number; unit?: string; disabled?: boolean;
  /** The control as rendered before T3; `children` is that rendering, used whenever the axis asks for it (or for `auto`). */
  native: NumericNative; children: ReactNode;
  /** A table cell: no visible label, no field margins. */
  bare?: boolean;
}

/** The variant the numeric controls axis asks for, or null for the native rendering (`auto`, the same kind, or a slider without bounds). */
export function useNumericVariant(native: NumericNative, bounded: boolean): Variant | null {
  const v = useThemeAxis('controlsNumeric');
  if (v === 'auto' || v === native || ((v === 'slider' || v === 'slider-field') && !bounded)) return null;
  return v;
}

const decimals = (step: number): number => (String(step).split('.')[1] ?? '').length;
/** One step up (+1) or down (-1) from `value`, kept inside [min, max] and rounded to the precision of the step. */
export function nudge(value: number | string, dir: 1 | -1, { min, max, step = 1 }: { min?: number; max?: number; step?: number }): string {
  const x = parseFloat(String(value)), base = isNaN(x) ? (min ?? 0) : x;
  const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, base + dir * step));
  return next.toFixed(decimals(step)).replace(/^-0$/, '0');
}

/**
 * Numbers, percentages and amounts: number field, slider, slider + field, or stepper (− value +), chosen by the `controlsNumeric` theme axis.
 * Every variant commits through the same `onCommit` (the same command, the same undo step) and keeps the label as the accessible name.
 */
export function FieldNumber(p: FieldNumberProps) {
  const id = useId(), variant = useNumericVariant(p.native, p.min != null && p.max != null);
  if (variant === null) return <>{p.children}</>;
  const shown = `${p.value}${p.unit ?? ''}`;
  const slider = (
    <input type="range" aria-label={p.label} aria-valuetext={shown} value={p.value} min={p.min} max={p.max} step={p.step} disabled={p.disabled}
      onChange={(e) => p.onCommit(e.target.value)} />
  );
  const box = (name: string) => <NumCell
    value={p.value}
    onCommit={p.onCommit}
    min={p.min}
    max={p.max}
    step={p.step}
    width={null}
    ariaLabel={name}
    disabled={p.disabled}
  />;
  if (variant === 'number') return p.bare ? box(p.label) : <Field label={p.label} hint={p.hint}>{box(p.label)}</Field>;
  if (variant === 'slider') return p.bare ? slider : <Field label={`${p.label}: ${shown}`} hint={p.hint}>{slider}</Field>;
  if (variant === 'slider-field') {
    return <FieldGroup
      id={id}
      label={p.label}
      hint={p.hint}
      bare={p.bare}
    ><span className="ac-fv-row">{slider}{box(`${p.label} (value)`)}{p.unit && <span>{p.unit}</span>}</span></FieldGroup>;
  }
  const x = parseFloat(String(p.value)), atMin = p.min != null && x <= p.min, atMax = p.max != null && x >= p.max;
  return (
    <FieldGroup id={id} label={p.label} hint={p.hint} bare={p.bare}>
      <span className="ac-fv-row ac-fv-stepper">
        <button
          type="button"
          className="ac-fv-step"
          aria-label={`Decrease ${p.label}`}
          disabled={p.disabled || atMin}
          onClick={() => p.onCommit(nudge(p.value, -1, p))}
        >−</button>
        {box(p.label)}
        <button
          type="button"
          className="ac-fv-step"
          aria-label={`Increase ${p.label}`}
          disabled={p.disabled || atMax}
          onClick={() => p.onCommit(nudge(p.value, 1, p))}
        >+</button>
        {p.unit && <span>{p.unit}</span>}
      </span>
    </FieldGroup>
  );
}
