import { roadmapStages } from '@/domain/frame';
import { useCtx } from '@/store/hooks';
import { goSection } from '@/ui/uiState';
import { Panel } from '@/ui/widgets/cards';

/** The five gated stages on the calendar; each card jumps to the section that produces its evidence. */
export function Roadmap() {
  const stages = roadmapStages(useCtx(), new Date());
  return (
    <Panel title="🗺️ Engagement roadmap & gates">
      <p className="ac-muted">The five gated stages on the calendar, from the start date. Each card shows its window and the gate that must clear before the
        next stage opens — click a stage to jump to the section that produces its evidence.</p>
      <div className="ac-roadmap">
        {stages.map((s) => (
          <button key={s.name} type="button" className={s.current ? 'ac-roadmap-stage is-current' : 'ac-roadmap-stage'} onClick={() => goSection(s.section)}
            aria-current={s.current ? 'step' : undefined}>
            <div className="ac-roadmap-name">{s.name}{s.current ? ' ◀ now' : ''}</div>
            <div className="ac-roadmap-label">{s.label}</div>
            <div className="ac-roadmap-dates">{s.from}{s.to ? ` → ${s.to}` : ' → open'}</div>
            <div className="ac-roadmap-gate">Gate: {s.gate}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
