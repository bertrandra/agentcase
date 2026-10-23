import { setLifecyclePos, setLifecycleUse } from '@/controllers/lifecycle';
import { nearestStatusPos, statusLabel, statusOptions } from '@/domain/scope/lifecycleView';
import { useCtx } from '@/store/hooks';

/** Switch, status jump and position slider of the product-status axis (legacy lifecycleControlsHTML). */
export function Controls() {
  const { s } = useCtx();
  return (
    <div style={{ maxWidth: 520 }}>
      <label className="ac-check"><input type="checkbox" checked={s.lifecycleUse} onChange={(e) => setLifecycleUse(e.target.checked)} /> Apply product-status lifecycle weighting</label>
      <p className="ac-muted">Re-weights each phase&apos;s effort by where the product sits in its lifecycle. Off = neutral (all phases weight 1.0).</p>
      <label className="ac-field"><span className="ac-field-l">Lifecycle position — jump to a status</span>
        <select value={nearestStatusPos(s)} onChange={(e) => setLifecyclePos(+e.target.value)}>
          {statusOptions(s).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></label>
      <label className="ac-field"><span className="ac-field-h">Or slide gradually between statuses:</span>
        <input type="range" min={0} max={100} value={s.lifecyclePos} aria-label="Lifecycle position" onChange={(e) => setLifecyclePos(+e.target.value)} /></label>
      <p style={{ fontSize: 'var(--ac-font-size-md)', color: 'var(--ac-blue)', fontWeight: 'var(--ac-font-weight-semibold)' }}>Current status: <span>{statusLabel(s)}</span></p>
    </div>
  );
}
