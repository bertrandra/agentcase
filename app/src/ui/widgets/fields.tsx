import type { ReactNode } from 'react';
import { setChecked, setInput } from '@/controllers/inputs';
import { useDoc } from '@/store/hooks';

/** Labelled wrapper used by every form widget. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="ac-field"><span className="ac-field-l">{label}</span>{children}{hint && <span className="ac-field-h">{hint}</span>}</label>;
}

/** A form input of the case (legacy DOM input id). Reads the document, writes through the inputs controller (undoable, coalesced). */
export function NumberInput({ id, label, hint, min, max, step }: { id: string; label: string; hint?: string; min?: number; max?: number; step?: number }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  return <Field label={label} hint={hint}><input type="number" value={value} min={min} max={max} step={step} onChange={(e) => setInput(id, e.target.value)} /></Field>;
}

export function RangeInput({ id, label, hint, min = 0, max = 100, step = 1, unit = '%' }: { id: string; label: string; hint?: string; min?: number; max?: number; step?: number; unit?: string }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  const locked = useDoc((d) => id === 'autoPotential' && !!d.dom.checked.fitAuto);
  return (
    <Field label={`${label}: ${value}${unit}`} hint={hint}>
      <input type="range" value={value} min={min} max={max} step={step} disabled={locked} onChange={(e) => setInput(id, e.target.value)} />
    </Field>
  );
}

export function SelectInput({ id, label, options, hint }: { id: string; label: string; options: { value: string; label: string }[]; hint?: string }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => setInput(id, e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </Field>
  );
}

export function CheckInput({ id, label, hint }: { id: string; label: string; hint?: string }) {
  const on = useDoc((d) => !!d.dom.checked[id]);
  return <label className="ac-check"><input type="checkbox" checked={on} onChange={(e) => setChecked(id, e.target.checked)} /> {label}{hint && <span className="ac-field-h"> — {hint}</span>}</label>;
}
