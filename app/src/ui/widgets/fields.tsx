import { setChecked, setInput } from '@/controllers/inputs';
import { useDoc } from '@/store/hooks';
import { Field } from './field/Field';
import { FieldChoice } from './field/FieldChoice';
import { FieldNumber } from './field/FieldNumber';
import { FieldToggle } from './field/FieldToggle';
import { fieldRef, KeepersNotice } from './KeepersNotice';

/**
 * Form inputs of the case (legacy DOM input ids): read the document, write through the inputs controller (undoable, coalesced). Each renders as
 * it always did; the controls axes of the theme (Field*, docs/THEME.md §6) may switch it to a variant that dispatches the same command. In the in-place
 * editor of the common values each also names the products that keep their own value (`KeepersNotice`, nothing anywhere else).
 */
export { Field };

export function NumberInput({ id, label, hint, min, max, step }: { id: string; label: string; hint?: string; min?: number; max?: number; step?: number }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  return (
    <><FieldNumber native="number" label={label} hint={hint} value={value} min={min} max={max} step={step} onCommit={(v) => setInput(id, v)}>
      <Field label={label} hint={hint}><input type="number" value={value} min={min} max={max} step={step} onChange={(e) => setInput(id, e.target.value)} /></Field>
    </FieldNumber><KeepersNotice refKey={fieldRef('values', id)} label={label} /></>
  );
}

export function RangeInput({ id, label, hint, min = 0, max = 100, step = 1, unit = '%' }: { id: string; label: string; hint?: string; min?: number; max?: number; step?: number; unit?: string }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  const locked = useDoc((d) => id === 'autoPotential' && !!d.dom.checked.fitAuto);
  return (
    <><FieldNumber native="slider" label={label} hint={hint} value={value} min={min} max={max} step={step} unit={unit} disabled={locked} onCommit={(v) => setInput(id, v)}>
      <Field label={`${label}: ${value}${unit}`} hint={hint}>
        <input type="range" value={value} min={min} max={max} step={step} disabled={locked} onChange={(e) => setInput(id, e.target.value)} />
      </Field>
    </FieldNumber><KeepersNotice refKey={fieldRef('values', id)} label={label} /></>
  );
}

export function SelectInput({ id, label, options, hint }: { id: string; label: string; options: { value: string; label: string }[]; hint?: string }) {
  const value = useDoc((d) => d.dom.values[id] ?? '');
  return (
    <><FieldChoice label={label} hint={hint} value={value} options={options} onChange={(v) => setInput(id, v)}>
      <Field label={label} hint={hint}>
        <select value={value} onChange={(e) => setInput(id, e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </Field>
    </FieldChoice><KeepersNotice refKey={fieldRef('values', id)} label={label} /></>
  );
}

export function CheckInput({ id, label, hint }: { id: string; label: string; hint?: string }) {
  const on = useDoc((d) => !!d.dom.checked[id]);
  return (
    <><FieldToggle label={label} hint={hint} checked={on} onChange={(v) => setChecked(id, v)}>
      <label className="ac-check"><input type="checkbox" checked={on} onChange={(e) => setChecked(id, e.target.checked)} /> {label}{hint && <span className="ac-field-h"> — {hint}</span>}</label>
    </FieldToggle><KeepersNotice refKey={fieldRef('checked', id)} label={label} /></>
  );
}
