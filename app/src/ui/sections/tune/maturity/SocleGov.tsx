import { GOV_GATES, socleView } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { Note } from '@/ui/widgets/tuneA';

/** EV-20 / EV-29 measurement socle: DORA, SPACE, AI signals and human early-warning indicators. */
export function SoclePanel() {
  const s = socleView(useCtx());
  return (
    <Panel title="Measurement socle — DORA · SPACE · AI signals · human" aside={<Badge tone="blue">EV-20/29</Badge>}>
      <p>Reference 3.3/6.3: DORA alone is no longer enough at L{s.level}. Steer four families together; measure before committing (T0/T1/T2), and move beyond billable-staffing rate as the sole performance metric.</p>
      {s.families.map((f) => (
        <section key={f.title}>
          <h3 style={{ color: `var(--ac-${f.tone})`, textTransform: 'uppercase', fontSize: 'var(--ac-font-size-md)' }}>{f.title}</h3>
          <table className="ac-table">
            <tbody>{f.rows.map(([name, kind, text]) => <tr key={name}><td>{name}</td><td className="ac-c ac-muted">{kind}</td><td className="ac-muted">{text}</td></tr>)}</tbody>
          </table>
        </section>
      ))}
      <Note>The socle is analytical (target bands &amp; guardrails). Values feed from the model where available (verification tax, HRI); the rest are steering targets. CC-SOCLE-01.</Note>
    </Panel>
  );
}

/** EV-24 governance gates, enlarged Definition of Done and AI-BOM. */
export function GovPanel() {
  return (
    <Panel title="Governance gates · enlarged DoD · AI-BOM" aside={<Badge tone="blue">EV-24</Badge>}>
      <table className="ac-table">
        <thead><tr><th>Gate / artifact</th><th>Definition</th></tr></thead>
        <tbody>{GOV_GATES.map(([g, d]) => <tr key={g}><td><strong>{g}</strong></td><td>{d}</td></tr>)}</tbody>
      </table>
      <Note>Reference 5.1: the CI is the wall that does not move. These gates are mandatory and non-bypassable before merge; the enlarged DoD and the AI-BOM are exported in the Critical &amp; Regulated report (EV-11). CC-GATE-01.</Note>
    </Panel>
  );
}
