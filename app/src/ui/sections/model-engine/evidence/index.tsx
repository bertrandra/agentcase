import { enableEvl, setEvlStage } from '@/controllers/modelEvidence';
import { mcsRunStore, runMcsAsync } from '@/controllers/modelRun';
import { useEvalDate } from '@/ui/evalDate';
import { evlModel, EVL_STAGE_LABEL, EVL_STAGES } from '@/domain/model/evidence';
import { useCtx } from '@/store/hooks';
import { toast } from '@/ui/uiState';
import { ChoiceField } from '@/ui/widgets/CommitField';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { PhaseBanner, PhaseSwitch } from '../shared';
import { useMcsRun } from '../useMcsRun';
import { DriverTable } from './DriverTable';
import { Grade } from './Grade';

const help = (
  <p>Tags the provenance of the 7 drivers P4 already quantifies, grades the whole case&apos;s confidence (A–D) weighted by each driver&apos;s tornado
    influence, benchmarks the grade against the case&apos;s own stage and ranks which assumption is worth instrumenting first — turning the business case into
    a living instrument re-openable at every gate. A MEASURED tier without a source, or older than 18 months, counts as BENCHMARK (CC-EV-02). Purely a
    report: nothing here feeds a euro figure.</p>
);

/** P6 — evidence ledger: tier / source / as-of / owner per driver, the confidence grade and the upgrade path. */
export default function ModelEvidenceSection() {
  const c = useCtx(), { last } = useMcsRun(), em = evlModel(c, last?.tornado ?? null, useEvalDate());
  const runP4 = () => {
    runMcsAsync(500).then(() => { const l = mcsRunStore.getState().last; if (l) toast(`✓ P4 run · ${l.n} draws`); }).catch(() => toast('✕ Simulation failed'));
  };
  return (
    <SectionFrame title="📋 Evidence ledger · P6 · v16.10 · cross-cutting" help={help}
      input={<>
        <p className="ac-muted">Tags the provenance of the 7 drivers P4 already quantifies the influence of, grades the whole case&apos;s confidence (A–D)
          weighted by that influence, benchmarks the grade against the case&apos;s own stage, and ranks which assumption is worth instrumenting first.
          Converts the business case from a one-shot artifact into a living instrument re-openable at every gate. (AME-SPEC v0.2, P6)</p>
        <div className="ac-form-row">
          <PhaseSwitch on={em.on} phase="P6" onToggle={() => enableEvl(!em.on)} />
          <ChoiceField
            label="Case stage"
            value={em.stage}
            onChange={setEvlStage}
            options={EVL_STAGES.map((s) => ({ value: s, label: EVL_STAGE_LABEL[s] as string }))}
          />
          {!em.hasTornado && <button
            type="button"
            title="Run P4 to get real influence weights instead of the equal-weight fallback"
            onClick={runP4}
          >▶ Run P4 for real weights</button>}
        </div>
        <PhaseBanner on={em.on} off=" - purely a report; nothing here feeds a euro figure.">
          Grades the whole case&apos;s confidence from the evidence tier of the 7 P1/P3/P4 drivers, weighted by how much each one actually moves the outcome
          (P4&apos;s own tornado).
        </PhaseBanner>
      </>}
      result={<><Grade em={em} /><DriverTable em={em} /></>} />
  );
}
