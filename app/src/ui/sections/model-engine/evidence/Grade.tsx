import type { evlModel } from '@/domain/model/evidence';
import { EVL_STAGE_LABEL } from '@/domain/model/evidence';
import { Panel } from '@/ui/widgets/cards';

const COLOR: Record<string, string> = { A: 'var(--ac-teal)', B: 'var(--ac-blue)', C: 'var(--ac-amber)', D: 'var(--ac-brick)' };

/** The case confidence grade against what the stage expects. */
export function Grade({ em }: { em: ReturnType<typeof evlModel> }) {
  if (em.grade == null || em.score == null) return <Panel title="Case confidence"><p className="ac-muted">No influence weight anywhere yet - run P4 or wait for a driver to matter.</p></Panel>;
  const color = COLOR[em.grade];
  return (
    <Panel title="Case confidence">
      <div className="ac-form-row" style={{ alignItems: 'center' }}>
        <div style={{ border: `2px solid ${color}`, borderRadius: 'var(--ac-radius-2xl)', padding: '14px 24px', textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: 'var(--ac-font-size-8xl)', fontWeight: 'var(--ac-font-weight-extrabold)', color }}>{em.grade}</div><div className="ac-muted">score {(em.score * 100).toFixed(0)}%</div>
        </div>
        <div>
          Expected at <strong>{EVL_STAGE_LABEL[em.stage]}</strong>: grade <strong>{em.expectedGrade}</strong> or better.
          {em.meetsExpectation === false && <div style={{ color: 'var(--ac-brick)', fontWeight: 'var(--ac-font-weight-semibold)' }}>Below expectation - see the upgrade path below, not a blocker.</div>}
          {em.meetsExpectation === true && <div style={{ color: 'var(--ac-teal)', fontWeight: 'var(--ac-font-weight-semibold)' }}>Meets or exceeds expectation for this stage.</div>}
        </div>
        {!em.hasTornado && <div style={{ color: 'var(--ac-amber)' }}>Using equal weighting - no P4 run yet, so this is a placeholder, not a considered grade.</div>}
      </div>
    </Panel>
  );
}
