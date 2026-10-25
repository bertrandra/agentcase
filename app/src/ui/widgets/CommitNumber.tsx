import { useState, type CSSProperties } from 'react';

const COMPLETE = /^-?\d+(\.\d+)?$/;

/**
 * Number field that commits like the legacy `onchange`: a complete number is committed as it is typed (so a spinner click or a test
 * edit lands at once), a half-typed one ("0.") only on blur. The draft is view state; the committed value is read back from the document.
 */
export function CommitNumber({ value, onCommit, label, placeholder, min, max, step, className, style }: {
  value: string; onCommit: (v: string) => void; label: string; placeholder?: string; min?: number; max?: number; step?: number;
  /** The look of the field (a theme class); `style` stays accepted for older callers. */
  className?: string; style?: CSSProperties;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      aria-label={label}
      value={draft ?? value}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={className}
      style={style}   // a caller's own inline look (older callers; the theme class is `className`)
      onChange={(e) => { setDraft(e.target.value); if (COMPLETE.test(e.target.value) && e.target.value !== value) onCommit(e.target.value); }}
      onBlur={(e) => { if (draft !== null && draft !== value && e.target.value !== value) onCommit(e.target.value); setDraft(null); }} />
  );
}

/** Free-text field bound to the document (commits on every keystroke; the controller coalesces them into one history step). */
export function TextField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
  return (
    <label className="ac-field">
      <span className="ac-field-l">{label}</span>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
