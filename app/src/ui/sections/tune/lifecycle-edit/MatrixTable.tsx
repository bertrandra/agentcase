import { phasesForScope } from '@/domain';
import { STATUS_LIFECYCLE } from '@/domain/catalog';
import { lifecycleBlend, statusTable } from '@/domain/lifecycle';
import { setStatusPosture } from '@/controllers/tuneB';
import { setLifecycleWeight } from '@/controllers/lifecycle';
import { useCtx } from '@/store/hooks';

const tone = (v: number) => (v > 1.001 ? 'var(--ac-teal)' : v < 0.999 ? 'var(--ac-brick)' : 'var(--ac-neutral-750)');

function Cell({ label, value, def, step, width, onValid }: { label: string; value: number; def: number; step: number; width: number; onValid: (n: number) => void }) {
  const edited = Math.abs(value - def) > 0.001;
  return (
    <input type="number" aria-label={label} min={0} step={step} value={value} data-edited={edited || undefined}
      style={{ width, textAlign: 'center', color: tone(value), fontWeight: edited ? 'var(--ac-font-weight-bold)' : 'var(--ac-font-weight-regular)', border: `1px solid ${edited ? 'var(--ac-amber)' : 'var(--ac-slate-200)'}`, borderRadius: 'var(--ac-radius-sm)' }}
      onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) onValid(n); }} />
  );
}

/** Status × phase weight matrix with the automation-posture column; the two statuses blended by the current position are tinted. */
export function MatrixTable() {
  const c = useCtx(), phases = phasesForScope(), table = statusTable(c.s), blend = c.s.lifecycleUse ? lifecycleBlend(c.s) : null;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table" style={{ minWidth: 760 }}>
        <thead><tr>
          <th scope="col">Status</th>
          {phases.map((p) => <th key={p.id} scope="col" style={{ textAlign: 'center' }} title={`${p.id} — ${p.name}`}><div>{p.id}</div><small className="ac-muted">{p.name}</small></th>)}
          <th scope="col" style={{ textAlign: 'center' }} title="Multiplier on the effective automation depth at that status">Auto<br />posture</th>
        </tr></thead>
        <tbody>
          {table.map((s, i) => {
            const def = STATUS_LIFECYCLE[i] ?? s, active = blend && (i === blend.loIdx || i === blend.hiIdx);
            return (
              <tr key={s.id} style={active ? { background: 'var(--ac-primary-80)' } : undefined}>
                <td><strong>{s.label}</strong></td>
                {phases.map((p) => (
                  <td key={p.id} style={{ textAlign: 'center' }}>
                    <Cell label={`${s.label} · ${p.id} weight`} value={s.weights[p.id] ?? 1} def={def.weights[p.id] ?? 1} step={0.1} width={52} onValid={(n) => setLifecycleWeight(s.id, p.id, n)} />
                  </td>
                ))}
                <td style={{ textAlign: 'center', borderLeft: '2px solid var(--ac-blue)' }}>
                  <Cell label={`${s.label} · automation posture`} value={s.autoPosture} def={def.autoPosture} step={0.01} width={56} onValid={(n) => setStatusPosture(s.id, n)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
