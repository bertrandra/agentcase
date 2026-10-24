import { qualityView } from '@/domain/tuneB/risk';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { CoefInput } from '@/ui/widgets/CoefInput';
import { CheckInput, Field, SelectInput } from '@/ui/widgets/fields';

const SEVERITY = [
  { value: 'security', label: 'Security (×1.57)' }, { value: 'maintainability', label: 'Maintainability (×1.64)' }, { value: 'correctness', label: 'Correctness (×1.75)' },
];

/** AI code-quality risk premium (EV-23): severity anchor, SDD mitigation, caps and the resulting verification-tax factor. */
export function QualityCard() {
  const q = qualityView(useCtx());
  const rows: [string, string, boolean][] = [
    ['Anchor multiplier vs human code', `×${q.anchor.m.toFixed(2)} (${q.anchor.l})`, true], ['SDD maturity mitigation', `${q.sdd}%`, false],
    ['Effective quality premium', `${Math.round(q.premium * 100)}%`, true], ['Verification-tax factor', `×${q.factor.toFixed(2)}`, true],
    ['DI bar contribution', `+${Math.round(q.bar * 100)} pts`, true], ['Status in the model', q.applied ? 'APPLIED' : 'informative only', true],
  ];
  return (
    <Panel title="AI code-quality risk premium" aside={<Badge tone="blue">EV-23</Badge>}>
      <div className="ac-form-row">
        <SelectInput id="qualSeverity" label="Severity anchor" options={SEVERITY} />
        <Field label="SDD maturity (set in Maturity & Measurement)"><strong>{q.sdd}%</strong></Field>
        <CheckInput id="qualApply" label="Apply the premium (raises verification tax + DI bar)" />
      </div>
      <div className="ac-form-row">
        <CoefInput coef="qualPremiumCap" domId="riskQualCap" label="Quality premium cap ×" step={0.05} />
        <CoefInput coef="qualBarFactor" domId="riskQualBarFactor" label="Decision-bar quality weight" step={0.05} />
        <p className="ac-muted">Cap on the rework multiplier above, and how strongly it converts into the DI-bar penalty (capped at 0.15 pts). Also editable
          from the Due-diligence register.</p>
      </div>
      <table className="ac-table" style={{ maxWidth: 560 }}><tbody>
        {rows.map(([l, v, b]) => <tr key={l}><td>{l}</td><td style={{ textAlign: 'center' }}>{b ? <strong>{v}</strong> : v}</td></tr>)}
      </tbody></table>
      <p className="ac-muted">Reference 5.1: AI code shows correctness ×1.75, maintainability ×1.64, security ×1.57 issues vs human; ≥62% of generated
        programs carry a known weakness. The premium raises the verification tax and the DI bar, and is mitigated by SDD maturity (EV-16,
        forthcoming). CC-QUAL-01.</p>
    </Panel>
  );
}
