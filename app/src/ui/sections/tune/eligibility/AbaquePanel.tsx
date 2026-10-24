import { ACTIVITY_LABEL, PHASE_LABEL, abaqueRows, pillarApplyOn, taxExplain } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { CheckInput, NumberInput, SelectInput } from '@/ui/widgets/fields';
import { CoefInput, Note, fmtK } from '@/ui/widgets/tuneA';

const MODES = [
  { value: 'overlay', label: 'Case 1 — Overlay: on top of retained supervision' },
  { value: 'net', label: 'Case 2 — Net of retained supervision (precise)' },
];
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Explain() {
  const t = taxExplain(useCtx()), b = Math.round(t.base * 100), h = Math.round(t.avgHuman * 100);
  return t.mode === 'net' ? (
    <p><strong>Case 2 — Net of retained supervision (precise).</strong> The review <em>need</em> is {b}% of transferred output; the supervision assumptions
      already retain <strong>{h} pts</strong> of human
      effort in the run (a cost already paid). Only the uncovered excess is deducted: max(0, {b}% − {h}%) = <strong>{pct(t.rateNet)}</strong> of the gross
        saving ({fmtK(t.gross * t.rateNet)}/yr at Y3).
      Nothing is counted twice; if supervision covers the need, the tax is zero.</p>
  ) : (
    <p><strong>Case 1 — Overlay: on top of retained supervision (conservative).</strong> Rate = base {b}% × avg human supervision {h}%
      = <strong>{pct(t.rateOverlay)}</strong> of the gross saving ({fmtK(t.gross * t.rateOverlay)}/yr at Y3),
      deducted <em>in addition to</em> the supervision effort already retained in the run — a deliberate prudence cushion that partially overlaps the retained
        review cost (for comparison, Case 2 would deduct {pct(t.rateNet)} = {fmtK(t.gross * t.rateNet)}/yr).</p>
  );
}

/** EV-27 Abaque A / Abaque B: addressable gain per phase, captured at the reached maturity, minus the verification tax. */
export function AbaquePanel() {
  const c = useCtx(), d = abaqueRows(c), t = taxExplain(c), pillar = pillarApplyOn(c);
  return (
    <Panel title="Abaque A / Abaque B — addressable → net gain" aside={<Badge tone="blue">EV-27</Badge>}>
      <div className="ac-form-row">
        <NumberInput id="vtaxBase" label="Verification-tax base (×human sup.)" min={0} max={1} step={0.05} />
        <CoefInput coef="vtaxCap" id="vtaxCapCoef" label="Verification-tax hard cap" min={0} max={1} step={0.05} />
        <CheckInput id="vtaxApply" label="Deduct the verification tax from savings (feeds the economics)" />
        <SelectInput id="vtaxMode" label="Tax mode" options={MODES} />
      </div>
      <p className="ac-muted">Net gain per phase = <strong>Abaque A</strong> (addressable) × <strong>Abaque B</strong> (maturity capture at
        L{d.lvl} = {pct(d.bCap)}) {pillar ? '× pillar leverage ' : ''}− verification tax.
        Reference 6.1: this is what separates addressable from the ~10% net productivity paradox.</p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Phase</th><th>Abaque A</th><th>Pillar</th><th>Captured (×B)</th><th>Verif. tax</th><th>Net gain</th></tr></thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.ph}>
                <td>{PHASE_LABEL[r.ph]} <small className="ac-muted">({ACTIVITY_LABEL[r.act]})</small></td>
                <td className="ac-c">{pct(r.addressable)}</td><td className="ac-c">{pillar ? `×${r.lever.toFixed(2)}` : '—'}</td><td className="ac-c">{pct(r.captured)}</td>
                <td className="ac-c" style={{ color: r.tax > 0 ? 'var(--ac-brick)' : 'var(--ac-muted)' }}>{r.tax > 0 ? `−${Math.round(r.tax * 100)} pts` : '—'}</td>
                <td className="ac-c"><strong style={{ color: 'var(--ac-teal)' }}>{pct(r.net)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div role="status" className="ac-callout" style={{ borderColor: t.applied ? 'var(--ac-amber)' : undefined }}>
        <strong>Verification tax</strong> — rate {pct(d.vTaxRate)} of gross saving
        {t.applied ? <> · <strong style={{ color: 'var(--ac-amber)' }}>APPLIED</strong>: deducted from savings
          ({fmtK(t.yearly[0] ?? 0)} / {fmtK(t.yearly[1] ?? 0)} / {fmtK(t.yearly[2] ?? 0)} over
            Y1–Y3)</> : ' · informative only — tick the box above to feed it into the economics'}.
        <Explain />
      </div>
      <Note>CC-ABQ-01: net gain never exceeds the Abaque A addressable ceiling. CC-ABQ-02: with the tax applied, net saving ≤ gross saving.</Note>
    </Panel>
  );
}
