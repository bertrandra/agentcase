import { updateTheme } from '@/controllers/themes';
import { resolveTokens, type ThemeValues } from '@/domain/theme';
import type { CheckResult } from '@/domain/theme/themeChecks';
import { shownToken } from '@/domain/theme/themeChecks';
import { normHex, type ColourKey, type ThemeDef } from '@/domain/theme/themeDef';

const SCALE_LABELS: Record<string, string> = {
  primary: 'Primary (brand: links, buttons, callouts, key figures)', secondary: 'Secondary (agentic build)', info: 'Information (AI accents)',
  teal: 'Teal (automation)',
  success: 'Success', warning: 'Warning (human supervision)', danger: 'Danger (glass ceiling, errors)', neutral: 'Neutral greys (ink, lines)',
  slate: 'Slate (page, secondary text)',
};
/** "kpibar-start" → "KPI bar start". */
export const colourLabel =
  (k: ColourKey): string =>
  SCALE_LABELS[k] ?? k.replace('kpibar', 'KPI bar').replace('chart-cat-', 'Chart series ').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** One settable colour: picker, hex, reset to the default look, and the contrast of the pair it paints. */
export function ColourRow({ k, def, table, check }: { k: ColourKey; def: ThemeDef; table: ThemeValues; check?: CheckResult }) {
  const value = normHex(resolveTokens(table[shownToken(k)], table)) ?? '', set = def.colours[k] !== undefined, label = colourLabel(k);
  return (
    <div className="ac-bt-colour">
      <input type="color" value={value} aria-label={label} onChange={(e) => updateTheme(def.seq, { colours: { [k]: e.target.value } })} />
      <span className="ac-bt-colour-l">{label}{set && <small> · set</small>}</span>
      <code>{value}</code>
      {check && (
        <span className="ac-bt-check" data-ok={check.ok} title={`${check.fg} on ${check.bg}: ${check.ratio.toFixed(2)}:1 (needs ${check.min}:1)`}>
          {check.level} {check.ratio.toFixed(1)}
        </span>
      )}
      {set && <button type="button" className="ac-btn" aria-label={`Reset ${label}`}
        onClick={() => updateTheme(def.seq, { colours: { [k]: null } })}>Reset</button>}
      {check && !check.ok && <p className="ac-bt-warn" role="note">⚠ {check.fg} on {check.bg} is {check.ratio.toFixed(2)}:1, below {check.min}:1.</p>}
    </div>
  );
}
