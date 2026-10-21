import type { GanttView } from '@/domain/verifyB';
import { Bar, Row } from './bars';

const FAMILY: Record<string, string> = { adoption: '#0058AB', maturity: '#71609E', financial: '#BE4D00', workforce: '#00828E' };
const SUB = { fontSize: 11, fontWeight: 700, color: '#5a6785', textTransform: 'uppercase' as const, letterSpacing: '.04em', margin: '.7rem 0 .2rem' };

/** Calendar header, the transformation program rows and the engine-derived milestone markers. */
export function Program({ v }: { v: GanttView }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', height: 18, marginBottom: 2 }}>
        <div style={{ width: 260, flex: 'none', fontSize: 10, color: '#888' }}>Calendar →</div>
        <div style={{ position: 'relative', flex: 1, height: 18 }}>
          {v.ticks.map((t) => (
            <div key={t.left} style={{ position: 'absolute', left: `${t.left.toFixed(2)}%`, top: 0, bottom: 0, borderLeft: '1px solid #d5dae6' }}>
              <span style={{ position: 'absolute', top: -16, left: 2, fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={SUB}>Transformation program</div>
      {v.program.map((r) => <Row key={r.name} height={21} label={r.name} title={`${r.name} — ${r.meta}`}><Bar left={r.left} width={r.w} color={r.color} title={`${r.name} — ${r.meta}`} /></Row>)}
      <div style={SUB}>Generated milestones — derived from the adoption model, not typed</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 46 }}>
        <div style={{ width: 260, flex: 'none', fontSize: 11, paddingTop: 2 }}>🎯 Model milestones <span style={{ color: '#aaa', fontSize: 9.5 }}>(engine-derived)</span></div>
        <div style={{ position: 'relative', flex: 1, minHeight: 46 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 4, borderTop: '1px dashed #d5dae6' }} />
          {v.markers.length === 0 && <div style={{ fontSize: 10, color: '#aaa', paddingTop: 4 }}>no crossings in horizon</div>}
          {v.markers.map((m) => {
            const col = FAMILY[m.family] ?? '#5a6785';
            return (
              <div key={`${m.month}:${m.label}`} title={m.title} style={{ position: 'absolute', left: `${m.left.toFixed(2)}%`, top: m.lift ? 0 : 16, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, border: '2px solid #fff', boxShadow: `0 0 0 1px ${col}` }} />
                <div style={{ fontSize: 8.5, lineHeight: 1.1, color: col, whiteSpace: 'nowrap', marginTop: 1, maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                <div style={{ fontSize: 8, color: '#888' }}>{m.date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
export { SUB };
