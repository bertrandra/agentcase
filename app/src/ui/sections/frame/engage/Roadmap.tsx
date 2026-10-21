import { roadmapStages } from '@/domain/frame';
import { useCtx } from '@/store/hooks';
import { goSection } from '@/ui/uiState';
import { Panel } from '@/ui/widgets/cards';

/** The five gated stages on the calendar; each card jumps to the section that produces its evidence. */
export function Roadmap() {
  const stages = roadmapStages(useCtx(), new Date());
  return (
    <Panel title="🗺️ Engagement roadmap & gates">
      <p className="ac-muted">The five gated stages on the calendar, from the start date. Each card shows its window and the gate that must clear before the next stage opens — click a stage to jump to the section that produces its evidence.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stages.map((s) => (
          <button key={s.name} type="button" onClick={() => goSection(s.section)} aria-current={s.current ? 'step' : undefined}
            style={{ flex: 1, minWidth: 150, textAlign: 'left', cursor: 'pointer', border: `2px solid ${s.current ? '#FEB100' : 'var(--ac-line)'}`, borderRadius: 8, padding: '8px 10px', background: 'var(--ac-surface)' }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}{s.current ? ' ◀ now' : ''}</div>
            <div style={{ fontSize: 11 }}>{s.label}</div>
            <div style={{ fontSize: 10 }}>{s.from}{s.to ? ` → ${s.to}` : ' → open'}</div>
            <div style={{ fontSize: 10, color: 'var(--ac-teal)' }}>Gate: {s.gate}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
