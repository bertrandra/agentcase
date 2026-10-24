import { resolveTokens, type ThemeValues, type TokenName } from '@/domain/theme';
import { RAINBOW_ZONES } from '@/domain/theme/catalogue';
import { cssVars } from '@/ui/cssVars';

/** Rainbow's legend: which zone of the screen each colour paints, and the token behind it (a diagnostic theme, docs/THEME.md §8.3). */
export function RainbowLegend({ table }: { table: ThemeValues }) {
  return (
    <div className="ac-card ac-bt-legend">
      <h3>Diagnostic legend: zone → token</h3>
      <ul>
        {RAINBOW_ZONES.map(([zone, token]) => {
          const hex = resolveTokens(table[token as TokenName], table);
          return <li key={zone}><span className="ac-bt-swatch" style={cssVars({ '--ac-swatch': hex })} aria-hidden="true" />{/* dynamic: the zone's colour */} {zone} <code>{token}</code> <code>{hex}</code></li>;
        })}
      </ul>
      <p className="ac-muted">Activate Rainbow (or open the app with ?theme=4) to see every zone painted; text stays readable, but the contrast checks are not applied to this theme.</p>
    </div>
  );
}
