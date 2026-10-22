import type { ReactNode } from 'react';
import type { GanttProductRow, GanttWaveRow } from '@/domain/portfolio';
import { Row } from './bars';

const COLORS = ['#0058AB', '#006e79', '#b04600', '#71609E', '#0a6e9c'];
const FAMILY: Record<string, string> = { adoption: '#0058AB', maturity: '#71609E', financial: '#b04600', workforce: '#006e79' };
const pct = (v: number) => `${v.toFixed(2)}%`;

/** A bar on the calendar track: a focusable, labelled, read-only group. */
function Bar({ left, width, color, label, cls, children }: { left: number; width: number; color: string; label: string; cls: string; children?: ReactNode }) {
  return (
    <div style={{ position: 'relative', flex: 1, height: 16, background: '#F4F6FB', borderRadius: 3 }}>
      <div className={cls} role="group" aria-label={label} title={label} tabIndex={0} style={{ position: 'absolute', top: 0, height: 16, left: pct(left), width: pct(width), background: color, borderRadius: 3 }} />
      {children}
    </div>
  );
}

function ProductBar({ p, color }: { p: GanttProductRow; color: string }) {
  const marks = p.milestones.map((m) => `${m.label} ${m.date}`).join(', ');
  return (
    <Bar left={p.left} width={p.width} color={color} cls="ac-gantt-prod" label={`${p.name}, ${p.meta}. Milestones: ${marks || 'none within the horizon'}`}>
      {p.milestones.map((m) => (
        <span key={`${m.month}:${m.label}`} aria-hidden="true" title={m.title} data-milestone={m.family}
          style={{ position: 'absolute', top: 3, left: pct(m.left), width: 9, height: 9, marginLeft: -4, borderRadius: '50%', background: FAMILY[m.family] ?? '#5a6785', border: '2px solid #fff', boxShadow: '0 0 0 1px #5a6785' }} />
      ))}
    </Bar>
  );
}

/** One wave: the aggregated bar (earliest start to latest end of its products) and, expanded, one row per product with its milestones. */
export function WaveRow({ w, index, open, onToggle }: { w: GanttWaveRow; index: number; open: boolean; onToggle: () => void }) {
  const color = COLORS[index % COLORS.length] as string;
  return (
    <div data-gantt-wave={w.id}>
      <Row height={22} bg="#FAFBFE" title={`${w.name} — ${w.meta}`} label={
        <>
          <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${w.name}`} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, width: 14, color }}>{open ? '▼' : '▶'}</button>
          <strong style={{ fontWeight: 600 }}>{w.name}</strong> <span style={{ color: '#636363', fontSize: 10 }}>({w.products.length})</span>
        </>
      }>
        <Bar left={w.left} width={w.width} color={color} cls="ac-gantt-wave" label={`${w.name}, ${w.meta}`} />
      </Row>
      {open && w.products.map((p) => (
        <Row key={p.id} height={22} indent={24} label={p.name} title={`${p.name} — ${p.meta}`}><ProductBar p={p} color={color} /></Row>
      ))}
    </div>
  );
}
