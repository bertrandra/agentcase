import { setInput } from '@/controllers/inputs';
import { RISK_REGISTER, riskBand, riskBar, riskImpact, riskProb, riskScore, type RiskDef } from '@/domain/tuneB/risk';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { CheckInput } from '@/ui/widgets/fields';

const LEVELS = [{ v: 1, l: 'Low' }, { v: 2, l: 'Med' }, { v: 3, l: 'High' }];
const scoreColor = (s: number) => (s >= 6 ? '#8F3237' : s >= 4 ? '#BE4D00' : '#00828E');

function Level({ id, which, value, label }: { id: string; which: 'p' | 'i'; value: number; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => setInput(`risk_${which}_${id}`, e.target.value)}>
      {LEVELS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

/** Agentic risk register (EV-17): probability × impact per risk, consolidated score and its optional effect on the DI bar. */
export function RiskRegisterCard() {
  const c = useCtx(), score = riskScore(c), band = riskBand(score), applied = c.inp.c('riskApply');
  return (
    <Panel title="Agentic risk register" aside={<Badge tone="blue">EV-17</Badge>}>
      <CheckInput id="riskApply" label="Feed the consolidated risk score into the Decision Intelligence bar" />
      <DataTable rows={RISK_REGISTER} rowKey={(r: RiskDef) => r.id} columns={[
        { key: 'r', header: 'Agentic risk', render: (r) => <><strong>{r.label}</strong><div className="ac-muted">{r.evidence}</div></> },
        { key: 'p', header: 'Prob.', align: 'center', render: (r) => <Level id={r.id} which="p" value={riskProb(c, r)} label={`Probability of ${r.label}`} /> },
        { key: 'i', header: 'Impact', align: 'center', render: (r) => <Level id={r.id} which="i" value={riskImpact(c, r)} label={`Impact of ${r.label}`} /> },
        { key: 's', header: 'Score', align: 'center', render: (r) => { const s = riskProb(c, r) * riskImpact(c, r); return <strong style={{ color: scoreColor(s) }}>{s}</strong>; } },
        { key: 'm', header: 'Mitigation', render: (r) => r.mitigation },
      ]} />
      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: `${band.color}18`, border: `1px solid ${band.color}` }}>
        <strong style={{ color: band.color }}>Consolidated risk: {band.label} ({Math.round(score * 100)}/100)</strong>
        {applied ? ` · +${Math.round(riskBar(c) * 100)} pts on the DI bar` : ' · informative only — tick the box above to feed Decision Intelligence'}
      </div>
      <p className="ac-muted">Reference 5.2 agentic risk register. Probability×Impact on a 1–3 scale; the consolidated score can raise the Decide & Scale verdict bar. CC-RISK-01.</p>
    </Panel>
  );
}
