import { selectAllPhases } from '@/controllers/scope';
import { phaseTiles } from '@/domain/scope/phaseTiles';
import { useCtx } from '@/store/hooks';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import '../scope-tools.css';
import { Tile } from './Tile';

const OVERRIDES = ['phaseOff', 'selectedArtefacts'] as const;

const help = (
  <>
    <p>The coarse scope control: whole SDLC phases in or out, in one click each. It writes to exactly the same artefact selection that Scope edits one artefact at a time — same state, two resolutions.</p>
    <p>Each tile shows the phase&apos;s effort share (after lifecycle weighting), its contribution to the glass ceiling and the effort-weighted human supervision of its artefacts.
      A phase shows as indeterminate when only some of its artefacts are selected.</p>
  </>
);

/** Phase scope — toggle whole phases in or out, with the live effect of each one on effort share and glass ceiling. */
export default function PhaseScopeSection() {
  const { tiles, selected, total } = phaseTiles(useCtx());
  return (
    <SectionFrame title="🎯 Phase scope" help={help} overrides={OVERRIDES}
      input={
        <div className="ac-form-row">
          <button type="button" onClick={() => selectAllPhases(true)}>Select all</button>
          <button type="button" onClick={() => selectAllPhases(false)}>Clear all</button>
          <span className="ac-muted">In scope : <strong>{selected}/{total} art.</strong></span>
          <OverrideBadge refKey="phaseOff" label="Phases désactivées" />
          <OverrideBadge refKey="selectedArtefacts" label="Artefacts SDLC retenus" />
        </div>
      }
      result={
        <>
          <div className="ac-tiles">{tiles.map((t) => <Tile key={t.id} t={t} />)}</div>
          <p className="ac-callout">
            <strong>Legend</strong> — 📊 <strong>effort share</strong>: share of the total effort×lifecycle weight carried by this phase · 🎯 <strong>contribution</strong>: points this phase adds to
            the Effective glass ceiling (Σ over ALL rows = GC) · 👤 <strong>human sup</strong>: average human-supervision % across the phase&apos;s artifacts · art. = active artifacts (SDLC + selected norms + cross-cutting)
          </p>
        </>
      } />
  );
}
