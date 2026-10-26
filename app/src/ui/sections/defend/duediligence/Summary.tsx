import { computeSensitivity } from '@/controllers/pdc';
import { belowAdvisoryFloor, ceilCoverBand, DD_ADVISORY_FLOOR_PCT } from '@/domain/pdc/ddGauges';
import { Callout } from '@/ui/widgets/cards';
import { PackButtons } from './PackButtons';
import type { DdModel } from './useDd';

/** The tone of a gauge (its top edge and figure): the `data-tone` rule of sections-b.css. */
type Tone = 'blue' | 'brick' | 'teal' | 'amber' | 'grey' | '';
const COVER_TONE = { ok: 'teal', partial: 'amber', uncovered: 'brick' } as const;
const Card = ({ label, value, tone, sub }: { label: string; value: string; tone: Tone; sub?: string }) => (
  <div className="ac-dd-gauge" data-tone={tone}>
    <div className="ac-dd-gauge-l">{label}</div>
    <div className="ac-dd-gauge-v">{value}</div>
    {sub && <div className="ac-dd-gauge-sub">{sub}</div>}
  </div>
);

/** Intro, confirmation gauges (items, € weight, glass ceiling), the € sensitivity control and its explanation. */
export function Summary({ m }: { m: DdModel }) {
  const { wPct, ceilCover, sens, fresh, zeroEur } = m, wTone: Tone = wPct == null ? 'grey' : belowAdvisoryFloor(wPct) ? 'amber' : 'teal';
  const cc = ceilCover === null ? null : Math.round(ceilCover * 100);
  const ccTone: Tone = ceilCover === null ? '' : COVER_TONE[ceilCoverBand(ceilCover)];
  return (
    <>
      <Callout>This register lists what a client must <strong>confirm</strong> for the model to be defensible — not what the model computes. It deliberately
        surfaces <strong>{m.invisible} coefficients that are hardcoded in the calculation path and editable nowhere in the interface</strong>. They materially
        drive the euro result, so until now the question <em>“where does that number come from?”</em> had no answer, even internally. Surfacing them is not a
        criticism of the model — every model has coefficients; the defect was that they were unseeable.</Callout>
      <Callout kind="warn"><strong>Where these values come from.</strong> AgentCase ships with defaults for the metric anchors and for the model’s internal
        coefficients. These are engineering estimates: no study, dataset or delivery record is cited for them, and they are not benchmarks. That is what this
        register is for — each becomes a confirmed input once validated against the client’s own records. Rows marked <b>PC4 unvalidated</b> and <b>PC5
        embedded</b> are the ones still awaiting that confirmation.</Callout>
      <div className="ac-form-row">
        <Card label="Items to confirm" value={String(m.rows.length)} tone="blue" />
        <Card label="Editable nowhere (PC5)" value={String(m.invisible)} tone="brick" />
        <Card label="Confirmed / waived (items)" value={`${m.pct}%`} tone="teal" />
        <Card label="Confirmed by € weight" value={wPct == null ? '—' : `${wPct}%`} tone={wTone} />
      </div>
      {cc !== null && (
        <div className="ac-form-row">
          <Card label="Glass ceiling confirmed" value={`${cc}%`} tone={ccTone} sub={`of the ${m.ceiling}% ceiling’s weight`} />
          <p className="ac-dd-gauges-note"><strong>Two gauges, two questions.</strong> € coverage says
            how much of the <em>figure</em> rests on unverified values. Ceiling coverage says how much of the <em>thesis</em> does — the
            artefact-by-artefact claim that a human signature is irreducible.
            Telemetry cannot measure this and a simulation cannot validate it: only the people who sign the certification can.</p>
        </div>
      )}
      {belowAdvisoryFloor(wPct)
        && <Callout kind="warn">{m.endLabel} savings rest on <strong>{100 - (wPct as number)}% unconfirmed input weight</strong>. Below
          the {DD_ADVISORY_FLOOR_PCT}% advisory floor — this is a banner,
        not a gate (spec Q11).</Callout>}
      <PackButtons />
      <div className="ac-form-row">
        <button type="button" className="ac-btn" onClick={computeSensitivity}>{fresh ? '↻ Recompute € sensitivity' : '⚖️ Compute € sensitivity'}</button>
        <span className="ac-muted">{fresh && sens
          ? <>Measured {sens.at.slice(0, 10)} by +20% one-at-a-time perturbation on {m.endLabel} savings.{zeroEur ? <> <strong>{zeroEur}</strong> element(s)
            measured €0 <em>in this configuration</em> — either display-only, or their module is switched off for this
            case.</> : null}{sens.unmeasurable.length ? ` ${sens.unmeasurable.length} not reachable without a refactor.` : ''}</>
          : 'Not yet measured. Runs ~50 model evaluations; cached until an input changes.'}</span>
      </div>
      <p className="ac-muted ac-italic">{fresh
        ? <>Weighted coverage answers the only question that matters: <strong>how much of the euro result rests on something nobody has
          checked.</strong> Item count is shown alongside because a high item percentage with low weighted coverage means the easy things were
          confirmed and the load-bearing ones were not.</>
        : 'Item count over-credits cheap confirmations. Run the sensitivity measurement to weight this by euro impact — until then, read it as progress, ' +
          'not as model confidence.'}</p>
    </>
  );
}
