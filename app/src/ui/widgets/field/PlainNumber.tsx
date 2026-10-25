import { Field } from './Field';
import { FieldNumber } from './FieldNumber';

export interface PlainNumberProps {
  label: string; hint?: string; value: number | string; min?: number; max?: number; step?: number;
  /** every change of the field (the controller coalesces them into one history step) */
  onCommit: (raw: string) => void;
}

/** A labelled number field that commits each change as typed (the legacy `oninput`); the numeric controls axis may render it as a slider or a stepper. */
export function PlainNumber({ label, hint, value, min, max, step, onCommit }: PlainNumberProps) {
  return (
    <FieldNumber native="number" label={label} hint={hint} value={value} min={min} max={max} step={step} onCommit={onCommit}>
      <Field label={label} hint={hint}>
        <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onCommit(e.target.value)} />
      </Field>
    </FieldNumber>
  );
}
