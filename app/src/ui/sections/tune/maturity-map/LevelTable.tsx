import { maturityMapFrom, rampRanges } from '@/domain/tune';
import { resetMaturityMap, setMaturityBound, setMaturityLabel } from '@/controllers/tuneA';
import { useDoc } from '@/store/hooks';
import { useMemo } from 'react';

const COLORS = ['var(--ac-slate-700)', 'var(--ac-info-700)', 'var(--ac-teal-700)', 'var(--ac-primary-700)'];

function BoundInput({ kind, idx, value }: { kind: 'ramp' | 'share'; idx: number; value: number }) {
  return (
    <input type="number" min={0} max={100} step={5} style={{ width: 70 }} value={value}
      aria-label={`${kind === 'ramp' ? 'Adoption' : 'Agent vFTE share'} threshold of L${idx + 1}`}
      onChange={(e) => setMaturityBound(kind, idx, e.target.value)} />
  );
}

/** The editable ladder: label and the two lower bounds of each level (L1 always starts at 0 on both axes). */
export function LevelTable() {
  const raw = useDoc((d) => d.MATURITY_MAP), mm = useMemo(() => maturityMapFrom(raw), [raw]), ranges = rampRanges(mm.rampBounds);
  return (
    <div className="ac-panel">
      <h2>Level thresholds</h2>
      <p className="ac-muted">The lower bound (%) at which each level begins. L1 starts at 0.</p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Level</th><th>Label</th><th>Adoption ≥ (%)</th><th>Agent vFTE share ≥ (%)</th><th>Adoption range</th></tr></thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i}>
                <td><strong style={{ color: COLORS[i] }}>L{i + 1}</strong></td>
                <td><input type="text" style={{ width: 230 }} aria-label={`Label of L${i + 1}`} value={mm.labels[i] ?? ''}
                  onChange={(e) => setMaturityLabel(i, e.target.value)} /></td>
                <td className="ac-c">{i === 0 ? <span className="ac-muted">0 ·
                  start</span> : <BoundInput kind="ramp" idx={i} value={mm.rampBounds[i] as number} />}</td>
                <td className="ac-c">{i === 0 ? <span className="ac-muted">0</span> : <BoundInput kind="share" idx={i} value={mm.shareBounds[i] as number} />}</td>
                <td className="ac-c ac-muted">{ranges[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><button type="button" onClick={resetMaturityMap}>↺ Reset to defaults (adoption 0/25/55/80 · share 0/10/25/45)</button></p>
    </div>
  );
}
