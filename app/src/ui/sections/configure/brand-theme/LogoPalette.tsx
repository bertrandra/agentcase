import { useState } from 'react';
import { generatePalette } from '@/controllers/themes';
import type { GeneratorSettings } from '@/domain/theme/generatorSettings';
import { isLogoSrc } from '@/domain/theme/logo';
import { logoColours, type LogoColour } from '@/domain/theme/logoPalette';
import type { ThemeDef } from '@/domain/theme/themeDef';
import { useDoc } from '@/store/hooks';
import { readLogoPixels } from '@/ui/brand/logoPixels';
import { cssVars } from '@/ui/cssVars';
import { clearDraft } from './selection';

const pct = (x: number): string => `${Math.round(x * 100)} %`;

/**
 * "Palette from logo" (docs/THEME.md §8.10), inside the one-colour generator of a user theme, shown only when the case has a customer logo. The
 * button reads the logo's pixels (canvas adapter), finds its dominant non-neutral colours and applies the palette of the first one with the
 * generator's current contrast and harmony: one undoable `theme.generate` step. The other colours found are offered as buttons doing the same.
 */
export function LogoPalette({ def, settings }: { def: ThemeDef; settings: GeneratorSettings }) {
  const src = useDoc((d) => (d.CUSTOMER_LOGO as { src?: unknown } | undefined)?.src);
  const [found, setFound] = useState<LogoColour[] | null>(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  if (!isLogoSrc(src)) return null;
  const applyColour = (hex: string) => {
    generatePalette(def.seq, { ...settings, seed: hex });
    clearDraft();
    setStatus(`Palette generated from the logo colour ${hex} (contrast ${settings.contrast}). Undo restores the previous colours.`);
  };
  const extract = async () => {
    setBusy(true); setStatus('Reading the logo…');
    try {
      const px = await readLogoPixels(src), colours = px ? logoColours(px.data) : [];
      setFound(colours);
      if (colours[0]) applyColour(colours[0].hex);
      else setStatus(px ? 'No distinct colour in the logo (only white, black, grey or transparent pixels): pick a seed colour instead.'
        : 'This browser cannot read the logo pixels: pick a seed colour instead.');
    } catch { setFound(null); setStatus('The logo could not be read: pick a seed colour instead.'); }
    setBusy(false);
  };
  return (
    <div className="ac-bt-logo-pal">
      <button type="button" className="ac-btn" disabled={busy} onClick={() => void extract()}>🖼️ Palette from logo</button>
      {found && found.length > 1 && (
        <ul className="ac-bt-logo-colours" aria-label="Colours found in the logo">
          {found.map((c) => (
            <li key={c.hex}>
              <button type="button" className="ac-btn" aria-pressed={def.generator?.seed === c.hex} onClick={() => applyColour(c.hex)}
                aria-label={`Use the logo colour ${c.hex} (${pct(c.share)} of its coloured pixels)`}>
                <span className="ac-bt-swatch" style={cssVars({ '--dyn-swatch': c.hex })} aria-hidden="true" />{/* dynamic: a colour of the logo */}
                <code>{c.hex}</code> <small className="ac-muted">{pct(c.share)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="ac-muted" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
