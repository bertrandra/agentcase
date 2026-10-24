import { toggleCross } from '@/controllers/frame';
import { CROSS_CATEGORIES, crossOn } from '@/domain/frame';
import { useDoc } from '@/store/hooks';
import { NormList } from './NormsPanel';
import { FieldToggle } from '@/ui/widgets/field/FieldToggle';

/** AI, sustainability and usability: independent from the industry; ticking a category adds all its norms, then each can be refined. */
export function CrossCutting() {
  const norms = useDoc((d) => d.selectedNorms);
  return (
    <div>
      <h3>🧩 Cross-cutting concerns</h3>
      <p className="ac-muted">Independent of the industry — each adds its artifacts (with their own effort / automation / supervision) to the scope. Tick a
        category then pick the norms below.</p>
      {CROSS_CATEGORIES.map((x) => {
        const on = crossOn(norms, x.code);
        return (
          <div key={x.code}>
            <FieldToggle label={x.label} ariaLabel={x.label} checked={on} onChange={(v) => toggleCross(x.code, v)}>
              <label className="ac-check"><input type="checkbox" aria-label={x.label} checked={on} onChange={(e) => toggleCross(x.code, e.target.checked)} /> {x.label}</label>
            </FieldToggle>
            {on && <div style={{ margin: '6px 0 10px 24px' }}><NormList code={x.code} dense /></div>}
          </div>
        );
      })}
    </div>
  );
}
