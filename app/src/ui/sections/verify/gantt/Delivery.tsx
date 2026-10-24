import { useState } from 'react';
import type { GanttView, PhaseRow } from '@/domain/verifyB';
import { DualBar, Row } from './bars';
import { useTheme } from '@/ui/themeContext';

function PhaseLabel({ p, open, onToggle }: { p: PhaseRow; open: boolean; onToggle: () => void }) {
  const tone = p.cross ? 'chart-cat-3' : 'chart-cat-1';
  return (
    <>
      {p.arts.length
        ? <button type="button" className="ac-gantt-toggle" data-tone={tone} onClick={onToggle} aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${p.name}`}>{open ? '▼' : '▶'}</button>
        : <span className="ac-gantt-toggle-none">·</span>}
      <strong className={p.cross ? 'ac-gantt-name ac-tone' : 'ac-gantt-name'} data-tone={p.cross ? tone : undefined}>{p.name}</strong>
      {' '}<span className="ac-gantt-count">({p.count})</span>
      {p.last && <span className="ac-gantt-release-flag"> 🏁</span>}
    </>
  );
}

/** The bar legend: the translucent activity span and the solid human-supervision subset. */
function Legend() {
  const { alpha } = useTheme();
  return (
    <div className="ac-gantt-legend">
      {/* dynamic: the activity swatch is a computed alpha of the first chart colour */}
      Bars: <span className="ac-gantt-swatch" style={{ background: alpha('chart-cat-1', 0.4) }} /> activity &nbsp;
      <span className="ac-gantt-swatch is-sup" /> human supervision
    </div>
  );
}

/** The release marker: where a full pass of the in-scope backlog completes on the calendar. */
function Release({ at }: { at: number }) {
  return (
    <div className="ac-gantt-release">
      <div className="ac-gantt-release-gap" />
      <div className="ac-gantt-release-track">
        {/* dynamic: the release's place on the calendar */}
        <div className="ac-gantt-release-line" style={{ left: `${at.toFixed(2)}%` }} />
        <div className="ac-gantt-release-l" style={{ left: `${at.toFixed(2)}%` }}>🏁 full cycle complete</div>
      </div>
    </div>
  );
}

/** Delivery rollout: one dual bar per phase (and cross-cutting) on the shared calendar, expandable to its artefacts, with the release marker. */
export function Delivery({ v }: { v: GanttView }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(k)) n.add(k); return n; });
  const rows = (p: PhaseRow) => (
    <div key={p.key}>
      <Row kind={p.cross ? 'cross' : 'phase'} title={`${p.name} — ${p.meta}`} label={<PhaseLabel p={p} open={open.has(p.key)} onToggle={() => toggle(p.key)} />}>
        <DualBar left={p.start} act={p.act} sup={p.sup} tone={p.tone} title={`${p.name} — ${p.meta}`} />
      </Row>
      {open.has(p.key) && p.arts.map((a) => (
        <Row key={a.label} indent label={a.label} title={`${a.label} — ${a.meta}`}>
          <DualBar left={a.start} act={a.act} sup={a.sup} tone={p.tone} title={`${a.label} — ${a.meta}`} />
        </Row>
      ))}
      <div className="ac-gantt-meta">{p.meta}</div>
    </div>
  );
  const sdlc = v.phases.filter((p) => !p.cross), cross = v.phases.filter((p) => p.cross);
  return (
    <>
      <div className="ac-gantt-sub">Delivery rollout — phases overlap &amp; stagger by sequence, 🏁 marks the release</div>
      <Legend />
      {sdlc.length ? sdlc.map(rows) : <div className="ac-gantt-empty">No phase in scope — select artefacts in 🎯 Scope.</div>}
      {v.release != null && <Release at={v.release} />}
      {cross.map(rows)}
    </>
  );
}
