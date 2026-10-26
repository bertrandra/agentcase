import type { evlModel } from '@/domain/model/evidence';
import { EVL_STAGE_LABEL } from '@/domain/model/evidence';
import { Panel } from '@/ui/widgets/cards';


/** The case confidence grade (its colour is the `data-grade` rule of sections-b.css) against what the stage expects. */
export function Grade({ em }: { em: ReturnType<typeof evlModel> }) {
  if (em.grade == null || em.score == null) return <Panel title="Case confidence">
    <p className="ac-muted">No influence weight anywhere yet - run P4 or wait for a driver to matter.</p></Panel>;
  return (
    <Panel title="Case confidence">
      <div className="ac-form-row ac-center-items">
        <div className="ac-grade" data-grade={em.grade}>
          <div className="ac-grade-v">{em.grade}</div><div className="ac-muted">score {(em.score * 100).toFixed(0)}%</div>
        </div>
        <div>
          Expected at <strong>{EVL_STAGE_LABEL[em.stage]}</strong>: grade <strong>{em.expectedGrade}</strong> or better.
          {em.meetsExpectation === false && <div className="ac-value" data-ink="brick">Below expectation - see the upgrade path below, not a blocker.</div>}
          {em.meetsExpectation === true && <div className="ac-value" data-ink="teal">Meets or exceeds expectation for this stage.</div>}
        </div>
        {!em.hasTornado && <div className="ac-warn-ink">Using equal weighting - no P4 run yet, so this is a placeholder, not a considered grade.</div>}
      </div>
    </Panel>
  );
}
