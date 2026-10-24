import { phasesForScope } from '@/domain';
import { STATUS_LIFECYCLE } from '@/domain/catalog';
import { lifecycleBlend, statusTable } from '@/domain/lifecycle';
import { setStatusPosture } from '@/controllers/tuneB';
import { setLifecycleWeight } from '@/controllers/lifecycle';
import { useCtx } from '@/store/hooks';

const tone = (v: number) => (v > 1.001 ? 'teal' : v < 0.999 ? 'brick' : 'neutral-750');

interface CellProps { label: string; value: number; def: number; step: number; posture?: boolean; onValid: (n: number) => void }

/** One coefficient: coloured up (teal) / down (brick) from 1.00, bold with an amber border once it differs from the benchmark. */
function Cell({ label, value, def, step, posture, onValid }: CellProps) {
  const edited = Math.abs(value - def) > 0.001;
  return (
    <input type="number" aria-label={label} min={0} step={step} value={value} data-edited={edited || undefined}
      className={posture ? 'ac-lc-cell is-posture' : 'ac-lc-cell'} data-tone={tone(value)}
      onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) onValid(n); }} />
  );
}

/** Status × phase weight matrix with the automation-posture column; the two statuses blended by the current position are tinted. */
export function MatrixTable() {
  const c = useCtx(), phases = phasesForScope(), table = statusTable(c.s), blend = c.s.lifecycleUse ? lifecycleBlend(c.s) : null;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table ac-lc-matrix">
        <thead><tr>
          <th scope="col">Status</th>
          {phases.map((p) => (
            <th key={p.id} scope="col" className="ac-th-c" title={`${p.id} — ${p.name}`}><div>{p.id}</div><small className="ac-muted">{p.name}</small></th>
          ))}
          <th scope="col" className="ac-th-c" title="Multiplier on the effective automation depth at that status">Auto<br />posture</th>
        </tr></thead>
        <tbody>
          {table.map((s, i) => {
            const def = STATUS_LIFECYCLE[i] ?? s, active = blend && (i === blend.loIdx || i === blend.hiIdx);
            return (
              <tr key={s.id} className={active ? 'ac-row-hl' : undefined} data-tone={active ? 'primary-80' : undefined}>
                <td><strong>{s.label}</strong></td>
                {phases.map((p) => (
                  <td key={p.id} className="ac-c">
                    <Cell label={`${s.label} · ${p.id} weight`} value={s.weights[p.id] ?? 1} def={def.weights[p.id] ?? 1} step={0.1}
                      onValid={(n) => setLifecycleWeight(s.id, p.id, n)} />
                  </td>
                ))}
                <td className="ac-c ac-lc-posture">
                  <Cell label={`${s.label} · automation posture`} value={s.autoPosture} def={def.autoPosture} step={0.01} posture
                    onValid={(n) => setStatusPosture(s.id, n)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
