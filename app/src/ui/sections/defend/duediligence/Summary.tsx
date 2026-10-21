import { computeSensitivity } from '@/controllers/pdc';
import { Callout } from '@/ui/widgets/cards';
import { PackButtons } from './PackButtons';
import type { DdModel } from './useDd';

const Card = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1px solid #e5e5e5', borderTop: `3px solid ${color}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#636363', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: '#636363' }}>{sub}</div>}
  </div>
);

/** Intro, confirmation gauges (items, € weight, glass ceiling), the € sensitivity control and its explanation. */
export function Summary({ m }: { m: DdModel }) {
  const { wPct, ceilCover, sens, fresh, zeroEur } = m, wColor = wPct == null ? '#566074' : wPct >= 60 ? '#006e79' : '#b04600';
  const cc = ceilCover === null ? null : Math.round(ceilCover * 100), ccColor = ceilCover === null ? '' : ceilCover >= 0.85 ? '#006e79' : ceilCover >= 0.4 ? '#b04600' : '#8F3237';
  return (
    <>
      <Callout>This register lists what a client must <strong>confirm</strong> for the model to be defensible — not what the model computes. It deliberately surfaces <strong>{m.invisible} coefficients that are hardcoded in the calculation path and editable nowhere in the interface</strong>.
        They materially drive the euro result, so until now the question <em>“where does that number come from?”</em> had no answer, even internally. Surfacing them is not a criticism of the model — every model has coefficients; the defect was that they were unseeable.</Callout>
      <Callout kind="warn"><strong>Where these values come from.</strong> AgentCase ships with defaults for the metric anchors and for the model’s internal coefficients. These are engineering estimates: no study, dataset or delivery record is cited for them, and they are not benchmarks.
        That is what this register is for — each becomes a confirmed input once validated against the client’s own records. Rows marked <b>PC4 unvalidated</b> and <b>PC5 embedded</b> are the ones still awaiting that confirmation.</Callout>
      <div className="ac-form-row">
        <Card label="Items to confirm" value={String(m.rows.length)} color="#0058AB" />
        <Card label="Editable nowhere (PC5)" value={String(m.invisible)} color="#8F3237" />
        <Card label="Confirmed / waived (items)" value={`${m.pct}%`} color="#006e79" />
        <Card label="Confirmed by € weight" value={wPct == null ? '—' : `${wPct}%`} color={wColor} />
      </div>
      {cc !== null && (
        <div className="ac-form-row">
          <Card label="Glass ceiling confirmed" value={`${cc}%`} color={ccColor} sub={`of the ${m.ceiling}% ceiling’s weight`} />
          <p style={{ flex: 2, minWidth: 260, fontSize: 11.5 }}><strong>Two gauges, two questions.</strong> € coverage says how much of the <em>figure</em> rests on unverified values. Ceiling coverage says how much of the <em>thesis</em> does — the artefact-by-artefact claim that a human signature is irreducible.
            Telemetry cannot measure this and a simulation cannot validate it: only the people who sign the certification can.</p>
        </div>
      )}
      {wPct != null && wPct < 60 && <Callout kind="warn">Y3 savings rest on <strong>{100 - wPct}% unconfirmed input weight</strong>. Below the 60% advisory floor — this is a banner, not a gate (spec Q11).</Callout>}
      <PackButtons />
      <div className="ac-form-row">
        <button type="button" className="ac-btn" onClick={computeSensitivity}>{fresh ? '↻ Recompute € sensitivity' : '⚖️ Compute € sensitivity'}</button>
        <span className="ac-muted">{fresh && sens
          ? <>Measured {sens.at.slice(0, 10)} by +20% one-at-a-time perturbation on Y3 savings.{zeroEur ? <> <strong>{zeroEur}</strong> element(s) measured €0 <em>in this configuration</em> — either display-only, or their module is switched off for this case.</> : null}{sens.unmeasurable.length ? ` ${sens.unmeasurable.length} not reachable without a refactor.` : ''}</>
          : 'Not yet measured. Runs ~50 model evaluations; cached until an input changes.'}</span>
      </div>
      <p className="ac-muted" style={{ fontStyle: 'italic' }}>{fresh
        ? <>Weighted coverage answers the only question that matters: <strong>how much of the euro result rests on something nobody has checked.</strong> Item count is shown alongside because a high item percentage with low weighted coverage means the easy things were confirmed and the load-bearing ones were not.</>
        : 'Item count over-credits cheap confirmations. Run the sensitivity measurement to weight this by euro impact — until then, read it as progress, not as model confidence.'}</p>
    </>
  );
}
