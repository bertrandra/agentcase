import type { CSSProperties, ReactNode } from 'react';
import type { GanttProductRow, GanttWaveRow } from '@/domain/portfolio';
import { Row } from './bars';

const COLORS = ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5'].map((n) => `var(--ac-${n})`);
const FAMILY: Record<string, string> = { adoption: 'var(--ac-chart-cat-1)', maturity: 'var(--ac-chart-cat-4)', financial: 'var(--ac-chart-cat-3)', workforce: 'var(--ac-chart-cat-2)' };
const pct = (v: number) => `${v.toFixed(2)}%`;

/** A bar on the calendar track: a focusable, labelled, read-only group. */
function Bar({ left, width, color, label, cls, children }: { left: number; width: number; color: string; label: string; cls: string; children?: ReactNode }) {
  return (
    <div style={{ position: 'relative', flex: 1, height: 16, background: 'var(--ac-slate-55)', borderRadius: 'var(--ac-radius-xs)' }}>
      <div className={cls} role="group" aria-label={label} title={label} tabIndex={0}
        style={{ position: 'absolute', top: 0, height: 16, left: pct(left), width: pct(width), background: color, borderRadius: 'var(--ac-radius-xs)' }} />
      {children}
    </div>
  );
}

/** A milestone dot on a product bar (its place and family colour are set per milestone). */
const MILESTONE: CSSProperties = {
  position: 'absolute', top: 3, width: 9, height: 9, marginLeft: -4, borderRadius: 'var(--ac-radius-round)', border: '2px solid var(--ac-neutral-0)',
  boxShadow: 'var(--ac-shadow-ring-offset) var(--ac-slate-650)',
};
function ProductBar({ p, color }: { p: GanttProductRow; color: string }) {
  const marks = p.milestones.map((m) => `${m.label} ${m.date}`).join(', ');
  return (
    <Bar left={p.left} width={p.width} color={color} cls="ac-gantt-prod" label={`${p.name}, ${p.meta}. Milestones: ${marks || 'none within the horizon'}`}>
      {p.milestones.map((m) => (
        <span key={`${m.month}:${m.label}`} aria-hidden="true" title={m.title} data-milestone={m.family}
          style={{ ...MILESTONE, left: pct(m.left), background: FAMILY[m.family] ?? 'var(--ac-slate-650)' }} />
      ))}
    </Bar>
  );
}

/** One wave: the aggregated bar (earliest start to latest end of its products) and, expanded, one row per product with its milestones. */
export function WaveRow({ w, index, open, onToggle }: { w: GanttWaveRow; index: number; open: boolean; onToggle: () => void }) {
  const color = COLORS[index % COLORS.length] as string;
  return (
    <div data-gantt-wave={w.id}>
      <Row height={22} bg="var(--ac-slate-30)" title={`${w.name} — ${w.meta}`} label={
        <>
          <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${w.name}`}
            style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, width: 14, color }}>{open ? '▼' : '▶'}</button>
          <strong style={{ fontWeight: 'var(--ac-font-weight-semibold)' }}>{w.name}</strong> <span style={{ color: 'var(--ac-neutral-700)', fontSize: 'var(--ac-font-size-xs)' }}>({w.products.length})</span>
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
