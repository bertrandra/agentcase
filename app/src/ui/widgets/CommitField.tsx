import { useState } from 'react';
import { cssVars, px } from '../cssVars';
import { Field } from './field/Field';
import { FieldChoice } from './field/FieldChoice';
import { FieldNumber } from './field/FieldNumber';
import { NumCell, type Num } from './field/NumCell';

export { NumCell };

/** Labelled number field (see NumCell); the numeric controls axis may render it as a slider or a stepper (FieldNumber). */
export function NumField({ label, hint, ...rest }: Num & { label: string; hint?: string }) {
  return (
    <FieldNumber native="number" label={label} hint={hint} value={rest.value} onCommit={rest.onCommit} min={rest.min} max={rest.max} step={rest.step}>
      <Field label={label} hint={hint}><NumCell {...rest} ariaLabel={rest.ariaLabel ?? label} /></Field>
    </FieldNumber>
  );
}

/** Labelled text field: every keystroke goes to the controller (it coalesces into one history step). */
export function TextField({ label, value, onChange, placeholder, width }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; width?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        className={width ? 'ac-sized' : undefined}
        style={width ? cssVars({ '--ac-w': px(width) }) : undefined}   // dynamic: the width the caller asks for
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Labelled choice field; the choice controls axis may render it as segmented buttons or a radio group (FieldChoice). */
export function ChoiceField({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <FieldChoice label={label} value={value} options={options} onChange={onChange}>
      <Field label={label}>
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
    </FieldChoice>
  );
}

/** A destructive action that asks twice (arm, then confirm); the armed state is view state, nothing in the case. */
export function ConfirmButton({ label, confirmText, onConfirm, tone = 'danger' }: {
  label: string; confirmText?: string; onConfirm: () => void; tone?: 'danger' | 'primary';
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button type="button" data-tone={tone} onClick={() => setArmed(true)}>{label}</button>;
  return (
    <span role="group" aria-label={`Confirm: ${label}`}>
      {confirmText && <span className="ac-muted">{confirmText} </span>}
      <button type="button" data-tone={tone} onClick={() => { setArmed(false); onConfirm(); }}>✓ Confirm</button>{' '}
      <button type="button" onClick={() => setArmed(false)}>✕ Cancel</button>
    </span>
  );
}
