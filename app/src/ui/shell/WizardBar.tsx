import { useEffect } from 'react';
import { flatten } from '@/domain/nav/sequence';
import { flattenFast } from '@/domain/nav/fastPath';
import { uiStore, useUi, wizExit, wizStart } from '../uiState';
import { useNavModel } from '../zones/navModel';
import { WizardActive } from './WizardActive';

/**
 * The guided sequence of the active persona (legacy wizBar): while idle a banner offers to start it, once started the step bar walks it.
 * The walk ends when the persona changes or the sequence is switched off / emptied (also by an undo).
 */
export function WizardBar() {
  const { persona, seq, sections, fastPath } = useNavModel(), walking = useUi((s) => s.wiz.active);
  const stops = seq ? flattenFast(seq, sections, fastPath) : [];
  useEffect(() => { wizExit(); }, [persona]);
  useEffect(() => { if (!stops.length && uiStore.getState().wiz.active) wizExit(); }, [stops.length]);
  if (seq && !stops.length && fastPath && flatten(seq).length) return <div className="ac-wiz ac-wiz-idle" role="status">🧭 Fast Path is on and this sequence has no minimum-viable-path sections — turn Fast Path off to run it.</div>;
  if (!seq || !stops.length) return null;
  if (walking) return <WizardActive seq={seq} stops={stops} />;
  const steps = new Set(stops.map((s) => s.si)).size;
  return (
    <div className="ac-wiz ac-wiz-idle" role="region" aria-label="Guided sequence">
      <span>🧭 A guided <strong>build sequence</strong> ({steps} step{steps === 1 ? '' : 's'}{fastPath ? ` · ${stops.length} Fast-Path section${stops.length === 1 ? '' : 's'}` : ''}) is available for this persona.</span>
      <button type="button" className="ac-btn ac-btn-primary" onClick={() => wizStart(stops.map((s) => s.sec))}>▶ Start guided sequence</button>
    </div>
  );
}
