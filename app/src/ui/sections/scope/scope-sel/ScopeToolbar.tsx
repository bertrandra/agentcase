import { scopeSummary } from '@/domain';
import { selectAllPhases } from '@/controllers/scope';
import { useCtx } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { CheckInput } from '@/ui/widgets/fields';

/** Select all / clear / show-selected-only and the live "in scope" summary. */
export function ScopeToolbar() {
  const c = useCtx();
  return (
    <div className="ac-form-row">
      <button type="button" onClick={() => selectAllPhases(true)}>Select all</button>
      <button type="button" onClick={() => selectAllPhases(false)}>Clear all</button>
      <CheckInput id="scopeSelectedOnly" label="Show selected only" />
      <strong aria-live="polite">In scope : {scopeSummary(c)}</strong>
      <OverrideBadge refKey="selectedArtefacts" label="Artefacts SDLC retenus" />
      <OverrideBadge refKey="selectedRegArtefacts" label="Selected regulatory artefacts" />
    </div>
  );
}
