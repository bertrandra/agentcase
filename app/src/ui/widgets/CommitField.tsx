import { useState } from 'react';
import { Field } from './fields';

interface Num { value: number | string; onCommit: (raw: string) => void; min?: number; max?: number; step?: number; width?: number; ariaLabel?: string; invalid?: boolean }

/**
 * A number the user types: shown from the document, but while the field is being edited its own text wins, and a value is only handed to the
 * controller when it parses and sits inside [min, max] (typing "0.3" must not be clamped to the minimum at the "0"). Leaving the field commits
 * whatever was typed; the controller clamps, and the field then shows the document's value again.
 */
export function NumCell({ value, onCommit, min, max, step, width = 80, ariaLabel }: Num) {
  const [text, setText] = useState<string | null>(null);
  const ok = (raw: string) => { const x = parseFloat(raw); return !isNaN(x) && (min == null || x >= min) && (max == null || x <= max); };
  // the typed text wins while it is unfinished (out of range) or says what the case says; once the case moved elsewhere (undo) the case wins
  const shown = text !== null && (!ok(text) || parseFloat(text) === Number(value)) ? text : String(value);
  return (
    <input type="number" aria-label={ariaLabel} min={min} max={max} step={step} style={{ width }} value={shown}
      onChange={(e) => { setText(e.target.value); if (ok(e.target.value)) onCommit(e.target.value); }}
      onBlur={() => { if (text !== null) { onCommit(text); setText(null); } }} />
  );
}

/** Labelled number field (see NumCell). */
export function NumField({ label, hint, ...rest }: Num & { label: string; hint?: string }) {
  return <Field label={label} hint={hint}><NumCell {...rest} ariaLabel={rest.ariaLabel ?? label} /></Field>;
}

/** Labelled text field: every keystroke goes to the controller (it coalesces into one history step). */
export function TextField({ label, value, onChange, placeholder, width }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  return <Field label={label}><input type="text" aria-label={label} placeholder={placeholder} value={value} style={width ? { width } : undefined} onChange={(e) => onChange(e.target.value)} /></Field>;
}

/** Labelled choice field. */
export function ChoiceField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </Field>
  );
}

/** A destructive action that asks twice (arm, then confirm); the armed state is view state, nothing in the case. */
export function ConfirmButton({ label, confirmText, onConfirm, tone = 'danger' }: { label: string; confirmText?: string; onConfirm: () => void; tone?: 'danger' | 'primary' }) {
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
