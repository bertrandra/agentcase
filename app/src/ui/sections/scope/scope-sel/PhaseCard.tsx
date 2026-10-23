import { useEffect, useRef } from 'react';
import type { PhaseRow } from '@/domain';
type WArtefactView = PhaseRow['sdlc'][number] & { seq?: number | null };
import { setSeq, toggleArtefact, togglePhase, toggleRegArtefact } from '@/controllers/scope';
import { Badge } from '@/ui/widgets/cards';

const wLabel = (a: WArtefactView, lw: number, lifecycleOn: boolean) =>
  lifecycleOn && Math.abs(lw - 1) > 0.001 ? <>w{a.w.toFixed(1)} <b style={{ color: lw > 1 ? 'var(--ac-teal)' : 'var(--ac-brick)' }}>×{lw.toFixed(2)}</b></> : <>w{a.effort}</>;

function SeqInput({ value, onChange, label }: { value: number | undefined | null; onChange: (v: number | null) => void; label: string }) {
  return <input type="number" step={1} aria-label={label} title={label} className="ac-seq" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />;
}

/** One phase: tri-state checkbox, lifecycle weight, its SDLC and regulatory artefacts. */
export function PhaseCard({ row, lifecycleOn, selected, selectedReg }: { row: PhaseRow; lifecycleOn: boolean; selected: Set<string>; selectedReg: Set<string> }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (box.current) box.current.indeterminate = row.state === 'some'; }, [row.state]);
  const lw = row.lifecycle, showLw = lifecycleOn && Math.abs(lw - 1) > 0.001;
  return (
    <div className={`ac-phase${row.isCross ? ' is-cross' : ''}`}>
      <label className="ac-phase-head">
        <input ref={box} type="checkbox" checked={row.state === 'all'} aria-label={`Phase ${row.phase.id}`} onChange={(e) => togglePhase(row.phase.id, e.target.checked)} />
        <span className="ac-grow"><strong>{row.phase.id}</strong> {row.phase.name}
          {row.reg.length > 0 && <small className="ac-reg"> · {row.regOn}/{row.reg.length} reg</small>}
          {showLw && <small style={{ color: lw > 1 ? 'var(--ac-teal)' : 'var(--ac-brick)', fontWeight: 'var(--ac-font-weight-bold)' }} title="Product-status lifecycle weight"> ×{lw.toFixed(2)}</small>}</span>
        <small>seq</small><SeqInput value={row.phase.seq} label={`Ramp-up sequence of ${row.phase.id}`} onChange={(v) => setSeq('phase', row.phase.id, v)} />
        <small>{row.onCount}/{row.total}</small>
      </label>
      <div className="ac-phase-body">
        {row.sdlcShown.map((a) => (
          <label key={a.id} className="ac-art">
            <input type="checkbox" checked={selected.has(a.id)} onChange={(e) => toggleArtefact(a.id, e.target.checked)} />
            <span className="ac-grow">{a.name}</span><small>{a.agentSup}% auto · {wLabel(a, lw, lifecycleOn)}</small>
            <SeqInput value={a.seq} label={`Ramp-up sequence of ${a.id}`} onChange={(v) => setSeq('artefact', a.id, v)} />
          </label>
        ))}
        {row.regShown.map((a) => (
          <label key={a.id} className="ac-art is-reg">
            <input type="checkbox" checked={selectedReg.has(a.id)} onChange={(e) => toggleRegArtefact(a.id, e.target.checked)} />
            <Badge tone="amber">REG</Badge><span className="ac-grow">{a.name} <small>· {a.norm}</small></span>
            <small className="ac-reg">{a.agentSup}% auto · {wLabel(a, lw, lifecycleOn)}</small>
          </label>
        ))}
      </div>
    </div>
  );
}
