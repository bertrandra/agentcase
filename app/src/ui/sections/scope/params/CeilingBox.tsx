import { setInput } from '@/controllers/inputs';
import { setForceGC } from '@/controllers/scopeTools';
import { useCaseResult, useDoc } from '@/store/hooks';
import { Field } from '@/ui/widgets/fields';

/** Effective glass ceiling: computed from the scope (slider shows it, locked) unless the override is ticked. */
export function CeilingBox() {
  const forced = useDoc((d) => !!d.forceGlassCeiling), ceiling = Math.round(useCaseResult().model.ceiling);
  return (
    <div className="ac-card">
      <div className="ac-card-t">Effective glass ceiling</div>
      <div className="ac-card-d">Computed from the selected scope: phases + norms + cross-cutting. The irreducible human share that caps how deep automation can go.</div>
      <Field label={`Glass ceiling: ${ceiling}%`}>
        <input type="range" min={0} max={100} value={ceiling} disabled={!forced} aria-label="Glass ceiling" onChange={(e) => setInput('glassCeiling', e.target.value)} />
      </Field>
      <label className="ac-check"><input type="checkbox" checked={forced} onChange={(e) => setForceGC(e.target.checked)} /> Force this value (override auto-computed from regulatory selection)</label>
    </div>
  );
}
