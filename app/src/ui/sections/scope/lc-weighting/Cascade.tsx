import { factorDirection, lifecycleCascade, POSTURE_BAND, WEIGHT_BAND } from '@/domain/scope/lifecycleView';
import { useCtx } from '@/store/hooks';

const TONE = { up: 'teal', down: 'brick', flat: 'slate-700' } as const;
const tone = (v: number, band: number) => TONE[factorDirection(v, band)];

/** Per-phase weight and the resulting effort share of the in-scope artefacts (legacy renderLifecycleCascade). */
export function Cascade() {
  const c = useCtx();
  if (!c.s.lifecycleUse) return <p className="ac-muted"><em>Lifecycle weighting is off — every phase weights 1.0 (neutral).</em></p>;
  const { rows, posture, label } = lifecycleCascade(c);
  return (
    <div>
      <p>Blended status <strong>{label}</strong> re-weights each phase&apos;s effort, and applies an <strong>automation posture
        of <span className="ac-tone" data-tone={tone(posture, POSTURE_BAND)}>×{posture.toFixed(2)}</span></strong> to
        the effective automation depth — so the product status cascades to every in-scope artifact and the whole business case:</p>
      <table className="ac-table">
        <thead><tr><th>Phase</th><th className="ac-c">Weight</th><th>Resulting effort share</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.id}</strong> <small className="ac-muted">{r.name}</small></td>
              <td className="ac-c ac-tone ac-lc-factor" data-tone={tone(r.weight, WEIGHT_BAND)}>×{r.weight.toFixed(2)}</td>
              {/* dynamic: the bar width is the phase's effort share */}
              <td><div className="ac-bar-cell"><span style={{ width: `${Math.round(r.share)}%` }} /><small>{r.share.toFixed(1)}%</small></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
