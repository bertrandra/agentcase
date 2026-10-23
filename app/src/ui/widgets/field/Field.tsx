import type { ReactNode } from 'react';
import './field.css';

/** Labelled wrapper used by every form widget (one control: the `<label>` names it). */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return <label className="ac-field"><span className="ac-field-l">{label}</span>{children}{hint && <span className="ac-field-h">{hint}</span>}</label>;
}

/**
 * Wrapper of a variant made of several controls (slider + field, stepper, radio group): a group named by its visible label. `bare` (a table cell)
 * keeps the name for assistive technology only and drops the field margins.
 */
export function FieldGroup({ id, label, hint, role = 'group', bare, children }: { id: string; label: string; hint?: ReactNode; role?: 'group' | 'radiogroup'; bare?: boolean; children: ReactNode }) {
  return (
    <div className={bare ? 'ac-fv-bare' : 'ac-field'} role={role} aria-labelledby={id}>
      <span id={id} className={bare ? 'ac-sr' : 'ac-field-l'}>{label}</span>
      {children}
      {hint && !bare && <span className="ac-field-h">{hint}</span>}
    </div>
  );
}
