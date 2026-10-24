import type { GanttView } from '@/domain/verifyB';
import { CalendarHeader, Row } from './bars';
import { ProgramBar } from './ProgramBar';
import { tok } from '@/domain/theme';

const FAMILY: Record<string, string> = { get adoption() { return tok('chart-cat-1'); }, get maturity() { return tok('chart-cat-4'); }, get financial() { return tok('chart-cat-3'); }, get workforce() { return tok('chart-cat-2'); } };
const SUB = { fontSize: 'var(--ac-font-size-sm)', fontWeight: 'var(--ac-font-weight-bold)', get color() { return tok('slate-650'); }, textTransform: 'uppercase' as const, letterSpacing: '.04em', margin: '.7rem 0 .2rem' };

/** Calendar header, the transformation program rows and the engine-derived milestone markers. */
export function Program({ v }: { v: GanttView }) {
  return (
    <>
      <CalendarHeader ticks={v.ticks} />
      <div style={SUB}>Transformation program</div>
      {v.program.map((r) => <Row key={r.name} height={21} label={r.name} title={`${r.name} — ${r.meta}`}><ProgramBar r={r} /></Row>)}
      <div style={SUB}>Generated milestones — derived from the adoption model, not typed</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 46 }}>
        <div style={{ width: 260, flex: 'none', fontSize: 'var(--ac-font-size-sm)', paddingTop: 2 }}>🎯 Model milestones <span style={{ color: 'var(--ac-neutral-700)', fontSize: 'var(--ac-font-size-2xs-plus)' }}>(engine-derived)</span></div>
        <div style={{ position: 'relative', flex: 1, minHeight: 46 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 4, borderTop: '1px dashed var(--ac-slate-200)' }} />
          {v.markers.length === 0 && <div style={{ fontSize: 'var(--ac-font-size-xs)', color: 'var(--ac-neutral-700)', paddingTop: 4 }}>no crossings in horizon</div>}
          {v.markers.map((m) => {
            const col = FAMILY[m.family] ?? tok('slate-650');
            return (
              <div key={`${m.month}:${m.label}`} title={m.title} style={{ position: 'absolute', left: `${m.left.toFixed(2)}%`, top: m.lift ? 0 : 16, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: 9, height: 9, borderRadius: 'var(--ac-radius-round)', background: col, border: '2px solid var(--ac-neutral-0)', boxShadow: `var(--ac-shadow-ring-offset) ${col}` }} />
                <div style={{ fontSize: 'var(--ac-font-size-3xs-plus)', lineHeight: 'var(--ac-leading-tight)', color: col, whiteSpace: 'nowrap', marginTop: 1, maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                <div style={{ fontSize: 'var(--ac-font-size-3xs)', color: 'var(--ac-neutral-700)' }}>{m.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
export { SUB };
