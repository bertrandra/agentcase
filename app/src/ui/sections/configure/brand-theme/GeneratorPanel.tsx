import { useId } from 'react';
import { generatePalette } from '@/controllers/themes';
import { resolveTokens, THEME_DEFAULT } from '@/domain/theme';
import { contrastWord, GENERATOR_DEFAULTS, HARMONIES, HARMONY_LABELS, type GeneratorSettings, type Harmony } from '@/domain/theme/generatorSettings';
import { normHex, SCALE_KEYS, type ColourKey, type ThemeDef } from '@/domain/theme/themeDef';
import { clearDraft, generated, setDraft, useDraft } from './selection';
import { cssVars } from '@/ui/cssVars';

const SERIES = Array.from({ length: 8 }, (_, i) => `chart-cat-${i + 1}` as ColourKey);
const SWATCHES: readonly ColourKey[] = [...SCALE_KEYS, 'header-start', 'bg', 'ink', ...SERIES];
const swatchName = (k: ColourKey): string => k.replace('chart-cat-', 'Series ').replace('bg', 'Page').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** The settings the panel starts from: the last ones applied to the theme, else its primary colour with the default contrast and harmony. */
export function initialSettings(def: ThemeDef): GeneratorSettings {
  return def.generator ?? { seed: normHex(def.colours.primary) ?? resolveTokens(THEME_DEFAULT['primary-700'], THEME_DEFAULT), ...GENERATOR_DEFAULTS };
}

/**
 * "Generate from one colour" (docs/THEME.md §8.9): a seed colour, the palette contrast and a harmony derive every colour of the theme. Changing them
 * updates the swatches and the live preview only; "Apply to theme" writes the whole palette as one undoable step. The pickers below stay editable.
 */
export function GeneratorPanel({ def }: { def: ThemeDef }) {
  const id = useId(), draft = useDraft(def.seq), s = draft ?? initialSettings(def), palette = generated(s), word = contrastWord(s.contrast);
  const set = (patch: Partial<GeneratorSettings>) => setDraft(def.seq, { ...s, ...patch });
  const apply = () => { generatePalette(def.seq, s); clearDraft(); };
  return (
    <section className="ac-bt-gen" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>Generate from one colour</h3>
      <p className="ac-muted">Pick one colour: every colour of the theme (scales, surfaces, header, navigation, tables, text, business colours, chart series) is
        derived from it, readable in every display mode. Then fine-tune any colour below.</p>
      <div className="ac-bt-gen-row">
        <div className="ac-bt-gen-seed">
          <label className="ac-field-l" htmlFor={`${id}-seed`}>Seed colour</label>
          <input id={`${id}-seed`} type="color" value={s.seed} onChange={(e) => set({ seed: normHex(e.target.value) ?? s.seed })} />
          <code>{s.seed}</code>
        </div>
        <div className="ac-bt-gen-range">
          <label className="ac-field-l" htmlFor={`${id}-contrast`}>Palette contrast</label>
          <input id={`${id}-contrast`} type="range" min={0} max={100} step={5} value={s.contrast} aria-valuetext={`${s.contrast}, ${word}`}
            onChange={(e) => set({ contrast: Number(e.target.value) })} />
          <output htmlFor={`${id}-contrast`}>{s.contrast} · {word}</output>
        </div>
      </div>
      <fieldset className="ac-bt-gen-harmony">
        <legend className="ac-field-l">Harmony</legend>
        {HARMONIES.map((h: Harmony) => (
          <label key={h} data-on={s.harmony === h}>
            <input type="radio" name={`${id}-harmony`} value={h} checked={s.harmony === h} onChange={() => set({ harmony: h })} /> {HARMONY_LABELS[h]}
          </label>
        ))}
      </fieldset>
      <ul className="ac-bt-gen-swatches" aria-label="Generated colours">
        {SWATCHES.map((k) => (
          <li key={k}><span className="ac-bt-swatch" style={cssVars({ '--ac-swatch': palette[k] })} aria-hidden="true" />{/* dynamic: the generated colour */}<span>{swatchName(k)}</span> <code>{palette[k]}</code></li>
        ))}
      </ul>
      <div className="ac-bt-actions">
        <button type="button" data-tone="primary" onClick={apply}>Apply to theme</button>
        {draft && <button type="button" className="ac-btn" onClick={clearDraft}>Discard preview</button>}
      </div>
      <p className="ac-muted" role="status">{draft ? 'The live preview shows the generated palette: not applied yet.' : def.generator ? `Last applied: ${def.generator.seed}, contrast ${def.generator.contrast}, ${HARMONY_LABELS[def.generator.harmony]}.` : ''}</p>
    </section>
  );
}
