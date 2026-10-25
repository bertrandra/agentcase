import { useState } from 'react';
import { addTeamRow } from '@/controllers/team';
import { alignTeam, buildTeam, setTeamTotal } from '@/controllers/baseline';
import { teamWeights } from '@/domain/baseline/teamWeights';
import { useCtx } from '@/store/hooks';
import { TeamOwnerLabel } from '@/ui/widgets/ProductBanner';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CommitNumber } from '../CommitNumber';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { MixBanner } from './MixBanner';
import { PinEditor } from './PinEditor';
import { TeamRows } from './TeamRows';
import { TeamCharts, TeamSummary } from './TeamSummary';

const help = (
  <>
    <p>Builds the current (AS-IS) team line by line. This total effort and cost is the <b>baseline</b> every saving is measured against.</p>
    <p><b>Baseline FTE</b> = Σ FTE of each line · <b>Baseline cost</b> = Σ (FTE × day rate × working days). The day rate is never typed here: it is looked up
      from the Rate Card at rate[location][grade band].</p>
    <p>The team must be <i>dedicated to the selected scope</i>. Pin a line to specific artefacts to make it dedicated; the skill mix also drives the TO-BE
      composition.</p>
  </>
);

/** Input team (AS-IS) — the baseline team row by row, its artefact-implied sizing and its pins. */
export default function TeamInSection() {
  const c = useCtx(), W = teamWeights(c);
  const [open, setOpen] = useState<number | null>(null);
  const total = Math.round(W.totalFTE * 100) / 100;
  const input = (
    <>
      <TeamOwnerLabel />
      <div className="ac-callout" role="note">Build the current team row by row: skill, grade, location, number of FTE. Day rate and annual cost are computed
        from the Rate Card. This is the AS-IS baseline.</div>
      <div className="ac-form-row">
        <FieldNumber native="number" label="Total AS-IS team (FTE)" step={0.5} min={0.5} value={total} onCommit={setTeamTotal}>
          <label className="ac-field"><span className="ac-field-l">Total AS-IS team (FTE)</span>
            <CommitNumber label="Total AS-IS team (FTE)" step={0.5} min={0.5} className="ac-team-total" value={total} onCommit={setTeamTotal} /></label>
        </FieldNumber>
        <small className="ac-muted">Editing this total scales <b>every AS-IS resource pro-rata</b> (same skill / grade / location mix, FTE rounded to 0.5). Row
          edits below update the total automatically.</small>
      </div>
      <TeamRows c={c} W={W} openRow={open} onPin={(i) => setOpen(open === i ? null : i)} />
      <MixBanner c={c} W={W} />
      <div className="ac-form-row">
        <button type="button" onClick={() => addTeamRow()}>+ Add a resource</button>
        <button type="button" title="Rebuild the auto rows from the artefact skill mix. Pinned rows are preserved." onClick={buildTeam}>
          ⚙ Build from artefacts
        </button>
        <button type="button" title="Set every row's FTE to its artefact-implied value." onClick={alignTeam}>⇢ Align FTE to mix</button>
      </div>
      {open != null && <PinEditor c={c} W={W} row={open} onClose={() => setOpen(null)} />}
    </>
  );
  const result = <><TeamSummary c={c} /><TeamCharts c={c} /></>;
  return <SectionFrame title="Input team (AS-IS) — breakdown by resource" help={help} input={input} result={result} />;
}
