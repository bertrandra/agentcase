import { lifecycleAutoPosture } from '@/domain/lifecycle';
import { statusDoc, statusLabel } from '@/domain/scope/lifecycleView';
import { useCtx } from '@/store/hooks';
import { useTheme } from '@/ui/themeContext';

const tone = (v: number) => (v > 1.02 ? 'var(--ac-teal)' : v < 0.98 ? 'var(--ac-brick)' : 'var(--ac-slate-700)');

/** Reference table of the product profiles (EV-13): character, automation posture, and the live blended position. */
export function StatusTable() {
  const { alpha } = useTheme();   // a computed alpha of a theme colour: resolved in the theme in effect
  const { s } = useCtx(), posture = lifecycleAutoPosture(s);
  return (
    <details className="ac-panel">
      <summary><h2 style={{ display: 'inline' }}>📊 Product status lifecycle weighting metrics</h2> <small className="ac-muted">— reference &amp; cascade (click
        to expand)</small></summary>
      <p className="ac-muted">A fourth weighting axis alongside scope, regulatory and location: where the product sits in its lifecycle re-distributes effort —
        and therefore the automation opportunity and cost — across the development phases.</p>
      <table className="ac-table">
        <thead><tr><th>Status</th><th>Character</th><th className="ac-c">Automation posture</th></tr></thead>
        <tbody>
          {statusDoc(s).map((r) => (
            <tr key={r.id} style={r.share != null ? { background: alpha('primary-200', (0.25 + 0.5 * r.share).toFixed(2)) } : undefined}>
              <td><strong>{r.label}</strong><b style={{ color: 'var(--ac-amber)', fontSize: 'var(--ac-font-size-sm)' }}>{r.marker}</b></td>
              <td>{r.blurb}</td><td className="ac-c" style={{ color: tone(r.posture), fontWeight: 'var(--ac-font-weight-bold)' }}>×{r.posture.toFixed(2)}</td>
            </tr>
          ))}
          {s.lifecycleUse
            ? <tr style={{ background: 'var(--ac-blue)', color: 'var(--ac-neutral-0)' }}><td><strong>▶ Current position
              ({Math.round(s.lifecyclePos)}/100)</strong></td><td>{statusLabel(s)}</td><td className="ac-c"><b>×{posture.toFixed(2)}</b></td></tr>
            : <tr><td colSpan={3} className="ac-c ac-muted"><em>Lifecycle weighting is off — enable it above to see the live position.</em></td></tr>}
        </tbody>
      </table>
      <p className="ac-muted">Each status carries a relative-intensity weight per phase (1.0 = baseline). The weights are editable benchmarks — validate them
        against the client&apos;s actual delivery profile.</p>
    </details>
  );
}
