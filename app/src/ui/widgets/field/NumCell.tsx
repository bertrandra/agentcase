import { useState } from 'react';
import { cssVars, px } from '../../cssVars';

export interface Num {
  value: number | string; onCommit: (raw: string) => void; min?: number; max?: number; step?: number; width?: number | null; ariaLabel?: string;
    invalid?: boolean;
  disabled?: boolean;
}

/**
 * A number the user types: shown from the document, but while the field is being edited its own text wins, and a value is only handed to the
 * controller when it parses and sits inside [min, max] (typing "0.3" must not be clamped to the minimum at the "0"). Leaving the field commits
 * whatever was typed; the controller clamps, and the field then shows the document's value again. `width: null` leaves the width to the CSS.
 */
export function NumCell({ value, onCommit, min, max, step, width = 80, ariaLabel, disabled }: Num) {
  const [text, setText] = useState<string | null>(null);
  const ok = (raw: string) => { const x = parseFloat(raw); return !isNaN(x) && (min == null || x >= min) && (max == null || x <= max); };
  // the typed text wins while it is unfinished (out of range) or says what the case says; once the case moved elsewhere (undo) the case wins
  const shown = text !== null && (!ok(text) || parseFloat(text) === Number(value)) ? text : String(value);
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      className={width === null ? undefined : 'ac-sized'}
      style={width === null ? undefined : cssVars({ '--dyn-w': px(width) })}   // dynamic: the width the caller asks for
      value={shown}
      disabled={disabled}
      onChange={(e) => { setText(e.target.value); if (ok(e.target.value)) onCommit(e.target.value); }}
      onBlur={() => { if (text !== null) { onCommit(text); setText(null); } }} />
  );
}
