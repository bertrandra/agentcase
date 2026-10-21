import { useEffect } from 'react';
import { flatten } from '@/domain/nav/sequence';
import { rescueFocus } from '../focusRescue';
import { uiStore, useUi, wizExit, wizStart } from '../uiState';
import { useNavModel } from '../zones/navModel';
import { WizardActive } from './WizardActive';

/**
 * The guided sequence of the active persona (legacy wizBar): while idle a banner offers to start it, once started the step bar walks it.
 * The walk ends when the persona changes or the sequence is switched off / emptied (also by an undo).
 */
export function WizardBar() {
  const { persona, seq } = useNavModel(), walking = useUi((s) => s.wiz.active);
  const stops = seq ? flatten(seq) : [];
  useEffect(() => { wizExit(); }, [persona]);
  useEffect(() => { if (!stops.length && uiStore.getState().wiz.active) wizExit(); }, [stops.length]);
  if (!seq || !stops.length) return null;
  if (walking) return <WizardActive seq={seq} stops={stops} />;
  const steps = new Set(stops.map((s) => s.si)).size;
  return (
    <div className="ac-wiz ac-wiz-idle" role="region" aria-label="Guided sequence">
      <span>🧭 A guided <strong>build sequence</strong> ({steps} step{steps === 1 ? '' : 's'}) is available for this persona.</span>
      <button type="button" className="ac-btn ac-btn-primary" onClick={() => { wizStart(stops.map((s) => s.sec)); rescueFocus(() => document.querySelector<HTMLElement>('.ac-wiz-active .ac-btn-primary')); }}>▶ Start guided sequence</button>
    </div>
  );
}
