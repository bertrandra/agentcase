import { useMemo } from 'react';
import { assumptionRegister, benchmarkBase, STATUS_LABEL, type AssumptionStatus, type Validated } from '@/domain/pdc/assumptions';
import { setAssumptValidated } from '@/controllers/pdc';
import { useCtx, useDoc } from '@/store/hooks';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { Badge } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const help = (
  <p>The single auditable list of every assumption feeding the business case: current value vs benchmark default, adjustment status, client validation, and the measured impact of the uncertain ones on the net outcome. This is the answer to “what is this number based on?”.</p>
);
const TONE: Record<AssumptionStatus, 'grey' | 'amber' | 'teal'> = { def: 'grey', adj: 'amber', ok: 'teal' };
const base = benchmarkBase(defaultDoc), NONE: Validated = {};
const Group = ({ label }: { label: string }) => <tr style={{ background: 'var(--ac-primary-80)' }}><td colSpan={6} style={{ fontWeight: 'var(--ac-font-weight-bold)', color: 'var(--ac-blue)', fontSize: 'var(--ac-font-size-sm)' }}>{label}</td></tr>;
const Check = ({ id, on, label }: { id: string; on: boolean; label: string }) => (
  <input type="checkbox" aria-label={label} title="Mark as validated with the client" checked={on} onChange={(e) => setAssumptValidated(id, e.target.checked)} />
);

/** Assumptions register — every editable input vs its default, structured-state edits and client validation. */
export default function AssumptionsSection() {
  const c = useCtx(), ok = useDoc((d) => (d.assumptValidated as Validated | undefined) ?? NONE);
  const r = useMemo(() => assumptionRegister(c, base, ok), [c, ok]);
  let group: string | null = null;
  return (
    <SectionFrame title="📒 Assumptions register" help={help}
      result={<>
        <div className="ac-form-row"><span>🔵 <strong>{r.nDefault}</strong> at default</span><span>🟠 <strong>{r.nAdjusted}</strong> adjusted</span><span>🟢 <strong>{r.nValidated}</strong> validated with client</span>
          <span className="ac-muted"><em>Run the Monte Carlo to populate the impact column.</em></span></div>
        <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
          <thead><tr><th>Assumption</th><th>Current</th><th>Default</th><th>Status</th><th>Impact (r)</th><th>Client ✓</th></tr></thead>
          <tbody>
            {r.inputs.flatMap((x) => {
              const head = x.def.g !== group ? <Group key={`g-${x.def.g}`} label={x.def.g} /> : null;
              group = x.def.g;
              const hot = Math.abs(x.impact ?? 0) > 0.4;
              return [head, <tr key={x.def.id}><td>{x.def.l}</td><td style={{ fontWeight: 'var(--ac-font-weight-semibold)' }}>{x.current ?? '—'}</td><td className="ac-muted">{x.dflt ?? '—'}</td>
                <td><Badge tone={TONE[x.status]}>{STATUS_LABEL[x.status]}</Badge></td>
                <td style={{ color: hot ? 'var(--ac-blue)' : undefined, fontWeight: hot ? 'var(--ac-font-weight-bold)' : 'var(--ac-font-weight-regular)' }}>{x.impact === undefined ? '—' : `${x.impact > 0 ? '+' : ''}${x.impact}`}</td>
                <td><Check id={x.def.id} on={x.status === 'ok'} label={`${x.def.l} validated`} /></td></tr>];
            })}
            <Group label="Structured state" />
            {r.state.map((s) => (
              <tr key={s.key}><td>{s.label}</td><td colSpan={2} className="ac-muted">{s.detail}</td><td><Badge tone={TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge></td><td className="ac-muted">—</td>
                <td><Check id={s.key} on={s.status === 'ok'} label={`${s.label} validated`} /></td></tr>
            ))}
          </tbody>
        </table></div>
        <p className="ac-muted">Every editable variable of the model in one auditable place. <strong>Status</strong>: default benchmark · adjusted in this simulation · validated with the client. <strong>Impact</strong>: Pearson correlation with the net outcome from the last Monte Carlo run (uncertain parameters only). No hidden assumptions.</p>
      </>} />
  );
}
