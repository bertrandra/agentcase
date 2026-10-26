import { lifecycleAutoPosture } from '@/domain/lifecycle';
import { factorDirection, POSTURE_BAND, statusDoc, statusLabel } from '@/domain/scope/lifecycleView';
import { useCtx } from '@/store/hooks';
import { useTheme } from '@/ui/themeContext';

const TONE = { up: 'teal', down: 'brick', flat: 'slate-700' } as const;
const tone = (v: number) => TONE[factorDirection(v, POSTURE_BAND)];

/** Reference table of the product profiles (EV-13): character, automation posture, and the live blended position. */
export function StatusTable() {
  const { alpha } = useTheme();   // a computed alpha of a theme colour: resolved in the theme in effect
  const { s } = useCtx(), posture = lifecycleAutoPosture(s);
  return (
    <details className="ac-panel">
      <summary>
        <h2 className="ac-summary-title">📊 Product status lifecycle weighting metrics</h2>
        {' '}<small className="ac-muted">— reference &amp; cascade (click to expand)</small>
      </summary>
      <p className="ac-muted">A fourth weighting axis alongside scope, regulatory and location: where the product sits in its lifecycle re-distributes effort —
        and therefore the automation opportunity and cost — across the development phases.</p>
      <table className="ac-table">
        <thead><tr><th>Status</th><th>Character</th><th className="ac-c">Automation posture</th></tr></thead>
        <tbody>
          {statusDoc(s).map((r) => (
            // dynamic: the row tint grows with the product's share of that status in the blended position
            <tr key={r.id} style={r.share != null ? { background: alpha('primary-200', (0.25 + 0.5 * r.share).toFixed(2)) } : undefined}>
              <td><strong>{r.label}</strong><b className="ac-lc-marker">{r.marker}</b></td>
              <td>{r.blurb}</td><td className="ac-c ac-tone ac-lc-factor" data-tone={tone(r.posture)}>×{r.posture.toFixed(2)}</td>
            </tr>
          ))}
          {s.lifecycleUse
            ? (
              <tr className="ac-row-hl" data-tone="blue">
                <td><strong>▶ Current position ({Math.round(s.lifecyclePos)}/100)</strong></td><td>{statusLabel(s)}</td>
                <td className="ac-c"><b>×{posture.toFixed(2)}</b></td>
              </tr>
            )
            : <tr><td colSpan={3} className="ac-c ac-muted"><em>Lifecycle weighting is off — enable it above to see the live position.</em></td></tr>}
        </tbody>
      </table>
      <p className="ac-muted">Each status carries a relative-intensity weight per phase (1.0 = baseline). The weights are editable benchmarks — validate them
        against the client&apos;s actual delivery profile.</p>
    </details>
  );
}
