import { useEffect, useRef } from 'react';
import { togglePhase } from '@/controllers/scope';
import type { PhaseTile } from '@/domain/scope/phaseTiles';

/** One phase: tri-state checkbox gating its standard + regulatory artefacts, with effort share, ceiling contribution and human supervision. */
export function Tile({ t }: { t: PhaseTile }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (box.current) box.current.indeterminate = t.state === 'some'; }, [t.state]);
  return (
    <label className={`ac-tile${t.state === 'none' ? ' is-off' : ''}`}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input ref={box} type="checkbox" aria-label={`Phase ${t.id}`} checked={t.state === 'all'} disabled={t.empty}
          onChange={(e) => togglePhase(t.id, e.target.checked)} />
        <span><strong>{t.id}</strong> — {t.name}</span>
      </span>
      <span className="ac-tile-m">
        <span title="Effort share of this phase in the current selection">📊 {t.share.toFixed(1)}%</span>
        <span title="Contribution of this phase to the Effective glass ceiling (points)">🎯 {t.contrib.toFixed(1)} pts</span>
        <span title="Effort-weighted human supervision of the artifacts of this phase">👤 {t.humanSup.toFixed(0)}%</span>
        <span title="Active artifacts gated by this checkbox: standard + regulatory">({t.nStd} std · <span className="ac-reg">{t.nReg} reg</span>)</span>
        {t.empty && <span title="No artefact is eligible for this phase — select a norm">— empty</span>}
      </span>
    </label>
  );
}
