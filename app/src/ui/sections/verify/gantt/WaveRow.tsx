import type { ReactNode } from 'react';
import type { GanttProductRow, GanttWaveRow } from '@/domain/portfolio';
import { Row } from './bars';

const TONES = ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5'];
const FAMILY: Record<string, string> = { adoption: 'chart-cat-1', maturity: 'chart-cat-4', financial: 'chart-cat-3', workforce: 'chart-cat-2' };
const pct = (v: number) => `${v.toFixed(2)}%`;

/** A bar on the calendar track (coloured by the wave's tone): a focusable, labelled, read-only group. */
function Bar({ left, width, tone, label, cls, children }: { left: number; width: number; tone: string; label: string; cls: string; children?: ReactNode }) {
  return (
    <div className="ac-gantt-track">
      {/* dynamic: place and length on the portfolio calendar */}
      <div className={`${cls} ac-gantt-bar`} data-tone={tone} role="group" aria-label={label} title={label} tabIndex={0}
        style={{ left: pct(left), width: pct(width) }} />
      {children}
    </div>
  );
}

/** A product bar and its milestone dots (each placed on the calendar and coloured by its family). */
function ProductBar({ p, tone }: { p: GanttProductRow; tone: string }) {
  const marks = p.milestones.map((m) => `${m.label} ${m.date}`).join(', ');
  return (
    <Bar left={p.left} width={p.width} tone={tone} cls="ac-gantt-prod" label={`${p.name}, ${p.meta}. Milestones: ${marks || 'none within the horizon'}`}>
      {p.milestones.map((m) => (
        // dynamic: the milestone's place on the calendar
        <span key={`${m.month}:${m.label}`} aria-hidden="true" title={m.title} data-milestone={m.family} className="ac-gantt-milestone"
          data-tone={FAMILY[m.family] ?? 'slate-650'} style={{ left: pct(m.left) }} />
      ))}
    </Bar>
  );
}

/** One wave: the aggregated bar (earliest start to latest end of its products) and, expanded, one row per product with its milestones. */
export function WaveRow({ w, index, open, onToggle }: { w: GanttWaveRow; index: number; open: boolean; onToggle: () => void }) {
  const tone = TONES[index % TONES.length] as string;
  const label = (
    <>
      <button type="button" className="ac-gantt-toggle" data-tone={tone} onClick={onToggle} aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${w.name}`}>{open ? '▼' : '▶'}</button>
      <strong className="ac-gantt-name">{w.name}</strong> <span className="ac-gantt-count">({w.products.length})</span>
    </>
  );
  return (
    <div data-gantt-wave={w.id}>
      <Row kind="phase" title={`${w.name} — ${w.meta}`} label={label}>
        <Bar left={w.left} width={w.width} tone={tone} cls="ac-gantt-wave" label={`${w.name}, ${w.meta}`} />
      </Row>
      {open && w.products.map((p) => (
        <Row key={p.id} indent label={p.name} title={`${p.name} — ${p.meta}`}><ProductBar p={p} tone={tone} /></Row>
      ))}
    </div>
  );
}
