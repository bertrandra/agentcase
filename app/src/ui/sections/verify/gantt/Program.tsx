import type { GanttView } from '@/domain/verifyB';
import { CalendarHeader, Row } from './bars';
import { ProgramBar } from './ProgramBar';

const FAMILY: Record<string, string> = {
  adoption: 'var(--ac-chart-cat-1)', maturity: 'var(--ac-chart-cat-4)', financial: 'var(--ac-chart-cat-3)', workforce: 'var(--ac-chart-cat-2)',
};

/** One engine milestone: a dot and its label, placed at its month (lifted when it would overprint its neighbour). */
function Marker({ m }: { m: GanttView['markers'][number] }) {
  const col = FAMILY[m.family] ?? 'var(--ac-slate-650)';
  return (
    // dynamic: the marker's place on the calendar and its family colour (dot, ring and label)
    <div title={m.title} className={m.lift ? 'ac-gantt-marker is-lifted' : 'ac-gantt-marker'} style={{ left: `${m.left.toFixed(2)}%` }}>
      <div className="ac-gantt-marker-dot" style={{ background: col, boxShadow: `var(--ac-shadow-ring-offset) ${col}` }} />
      <div className="ac-gantt-marker-l" style={{ color: col }}>{m.label}</div>
      <div className="ac-gantt-marker-d">{m.date}</div>
    </div>
  );
}

/** Calendar header, the transformation program rows and the engine-derived milestone markers. */
export function Program({ v }: { v: GanttView }) {
  return (
    <>
      <CalendarHeader ticks={v.ticks} />
      <div className="ac-gantt-sub">Transformation program</div>
      {v.program.map((r) => <Row key={r.name} kind="program" label={r.name} title={`${r.name} — ${r.meta}`}><ProgramBar r={r} /></Row>)}
      <div className="ac-gantt-sub">Generated milestones — derived from the adoption model, not typed</div>
      <div className="ac-gantt-markers">
        <div className="ac-gantt-markers-l">🎯 Model milestones <span className="ac-gantt-markers-note">(engine-derived)</span></div>
        <div className="ac-gantt-markers-track">
          <div className="ac-gantt-markers-axis" />
          {v.markers.length === 0 && <div className="ac-gantt-markers-none">no crossings in horizon</div>}
          {v.markers.map((m) => <Marker key={`${m.month}:${m.label}`} m={m} />)}
        </div>
      </div>
    </>
  );
}
