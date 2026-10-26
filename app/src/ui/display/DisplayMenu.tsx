import { useEffect, useId, useRef, useState } from 'react';
import '../theme/display.css';
import type { DisplayPrefs } from './prefs';
import { setDisplayPrefs, useDisplay } from './store';

const MODES: [DisplayPrefs['mode'], string][] = [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto (system)']];
const LEVELS: [DisplayPrefs['contrast'], string][] = [['standard', 'Standard'], ['enhanced', 'Enhanced'], ['high', 'High']];

/**
 * The "Display" control of the top bar: an icon button that discloses a small panel of native radios and checkboxes (keyboard and screen-reader
 * accessible as they are). Escape or a click outside closes it and focus returns to the button. A personal preference: saved in this browser, not in the case.
 */
export function DisplayMenu() {
  const [open, setOpen] = useState(false), prefs = useDisplay((s) => s.prefs), id = useId();
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away); box.current?.addEventListener('keydown', esc);
    const el = box.current;
    el?.querySelector<HTMLInputElement>('input:checked')?.focus();
    return () => { document.removeEventListener('mousedown', away); el?.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="ac-display" ref={box}>
      <button ref={btn} type="button" className="ac-icon-btn" aria-label="Display settings" aria-expanded={open} aria-controls={id}
        title="Display: light, dark or system theme, contrast, motion, colour-blind safe charts (saved in this browser only)"
        onClick={() => setOpen((o) => !o)}>◐</button>
      {open && (
        <div className="ac-display-panel" id={id} role="group" aria-label="Display settings">
          <fieldset><legend>Theme</legend>
            {MODES.map(([v, label]) =>
              <label key={v}><input type="radio" name={`${id}-mode`} checked={prefs.mode === v} onChange={() => setDisplayPrefs({ mode: v })} /> {label}
              </label>)}
          </fieldset>
          <fieldset><legend>Contrast</legend>
            {LEVELS.map(([v, label]) =>
              <label key={v}><input type="radio" name={`${id}-contrast`} checked={prefs.contrast === v}
              onChange={() => setDisplayPrefs({ contrast: v })} /> {label}</label>)}
          </fieldset>
          <label><input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setDisplayPrefs({ reduceMotion: e.target.checked })} /> Reduce
            motion</label>
          <label><input type="checkbox" checked={prefs.cvd} onChange={(e) => setDisplayPrefs({ cvd: e.target.checked })} /> Colour-blind safe charts</label>
          <p className="ac-display-note">Saved in this browser only; the case and its exports are not changed.</p>
        </div>
      )}
    </div>
  );
}
