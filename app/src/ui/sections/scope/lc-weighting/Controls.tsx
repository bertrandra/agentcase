import { setLifecyclePos, setLifecycleUse } from '@/controllers/lifecycle';
import { nearestStatusPos, statusLabel, statusOptions } from '@/domain/scope/lifecycleView';
import { useCtx } from '@/store/hooks';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { FieldToggle } from '@/ui/widgets/field/FieldToggle';

const USE = 'Apply product-status lifecycle weighting';

/** Switch, status jump and position slider of the product-status axis (legacy lifecycleControlsHTML). */
export function Controls() {
  const { s } = useCtx(), opts = statusOptions(s).map((o) => ({ value: String(o.value), label: o.label }));
  return (
    <div className="ac-lc-controls">
      <FieldToggle label={USE} checked={s.lifecycleUse} onChange={setLifecycleUse}>
        <label className="ac-check"><input type="checkbox" checked={s.lifecycleUse} onChange={(e) => setLifecycleUse(e.target.checked)} />{` ${USE}`}</label>
      </FieldToggle>
      <p className="ac-muted">Re-weights each phase&apos;s effort by where the product sits in its lifecycle. Off = neutral (all phases weight 1.0).</p>
      <FieldChoice label="Lifecycle position — jump to a status" value={String(nearestStatusPos(s))} options={opts} onChange={(v) => setLifecyclePos(+v)}>
        <label className="ac-field"><span className="ac-field-l">Lifecycle position — jump to a status</span>
          <select value={nearestStatusPos(s)} onChange={(e) => setLifecyclePos(+e.target.value)}>
            {statusOptions(s).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
      </FieldChoice>
      <FieldNumber native="slider" label="Lifecycle position" value={s.lifecyclePos} min={0} max={100} onCommit={(v) => setLifecyclePos(+v)}
        hint="Or slide gradually between statuses.">
        <label className="ac-field"><span className="ac-field-h">Or slide gradually between statuses:</span>
          <input type="range" min={0} max={100} value={s.lifecyclePos} aria-label="Lifecycle position"
            onChange={(e) => setLifecyclePos(+e.target.value)} /></label>
      </FieldNumber>
      <p className="ac-lc-status">Current status: <span>{statusLabel(s)}</span></p>
    </div>
  );
}
