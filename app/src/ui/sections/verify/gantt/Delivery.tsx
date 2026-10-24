import { useState } from 'react';
import type { GanttView, PhaseRow } from '@/domain/verifyB';
import { DualBar, hexRgba, Row } from './bars';
import { SUB } from './Program';
import { tok } from '@/domain/theme';

const CROSS_BG = 'var(--ac-warning-35)', PHASE_BG = 'var(--ac-slate-30)';

function PhaseLabel({ p, open, onToggle }: { p: PhaseRow; open: boolean; onToggle: () => void }) {
  const colour = p.cross ? tok('chart-cat-3') : tok('chart-cat-1');
  return (
    <>
      {p.arts.length
        ? <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${p.name}`}
          style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, width: 14, color: colour }}>{open ? '▼' : '▶'}</button>
        : <span style={{ display: 'inline-block', width: 14, color: 'var(--ac-neutral-250)' }}>·</span>}
      <strong style={{ fontWeight: 'var(--ac-font-weight-semibold)', color: p.cross ? colour : undefined }}>{p.name}</strong> <span style={{ color: 'var(--ac-neutral-700)', fontSize: 'var(--ac-font-size-xs)' }}>({p.count})</span>
      {p.last && <span style={{ color: 'var(--ac-primary-700)', fontSize: 'var(--ac-font-size-xs)' }}> 🏁</span>}
    </>
  );
}

/** Delivery rollout: one dual bar per phase (and cross-cutting) on the shared calendar, expandable to its artefacts, with the release marker. */
export function Delivery({ v }: { v: GanttView }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(k)) n.add(k); return n; });
  const rows = (p: PhaseRow) => (
    <div key={p.key}>
      <Row height={22} bg={p.cross ? CROSS_BG : PHASE_BG} title={`${p.name} — ${p.meta}`} label={<PhaseLabel p={p} open={open.has(p.key)} onToggle={() => toggle(p.key)} />}>
        <DualBar left={p.start} act={p.act} sup={p.sup} color={p.color} title={`${p.name} — ${p.meta}`} />
      </Row>
      {open.has(p.key) && p.arts.map((a) => <Row key={a.label} height={22} indent={24} label={a.label} title={`${a.label} — ${a.meta}`}><DualBar left={a.start} act={a.act} sup={a.sup} color={p.color} title={`${a.label} — ${a.meta}`} /></Row>)}
      <div style={{ paddingLeft: 260, fontSize: 'var(--ac-font-size-xs)', color: 'var(--ac-neutral-700)' }}>{p.meta}</div>
    </div>
  );
  const sdlc = v.phases.filter((p) => !p.cross), cross = v.phases.filter((p) => p.cross);
  return (
    <>
      <div style={SUB}>Delivery rollout — phases overlap &amp; stagger by sequence, 🏁 marks the release</div>
      <div style={{ fontSize: 'var(--ac-font-size-sm-plus)', color: 'var(--ac-neutral-700)', margin: '.2rem 0 .5rem' }}>
        Bars: <span style={{ display: 'inline-block', width: 22, height: 9, borderRadius: 'var(--ac-radius-2xs)', background: hexRgba(tok('chart-cat-1'), 0.4), verticalAlign: 'middle' }} /> activity &nbsp;
        <span style={{ display: 'inline-block', width: 12, height: 9, borderRadius: 'var(--ac-radius-2xs)', background: 'var(--ac-primary-700)', verticalAlign: 'middle' }} /> human supervision
      </div>
      {sdlc.length ? sdlc.map(rows) : <div style={{ fontSize: 'var(--ac-font-size-sm-plus)', color: 'var(--ac-neutral-700)', padding: '2px 0' }}>No phase in scope — select artefacts in 🎯 Scope.</div>}
      {v.release != null && (
        <div style={{ display: 'flex', height: 16, margin: '1px 0 3px' }}>
          <div style={{ width: 260, flex: 'none' }} />
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'absolute', left: `${v.release.toFixed(2)}%`, top: -2, bottom: -2, borderLeft: '2px dashed var(--ac-primary-700)' }} />
            <div style={{ position: 'absolute', left: `${v.release.toFixed(2)}%`, top: 0, fontSize: 'var(--ac-font-size-xs-plus)', fontWeight: 'var(--ac-font-weight-bold)', color: 'var(--ac-primary-700)', whiteSpace: 'nowrap', paddingLeft: 4 }}>🏁 full cycle complete</div>
          </div>
        </div>
      )}
      {cross.map(rows)}
    </>
  );
}
