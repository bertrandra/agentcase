import type { SensiRow } from '@/domain/pdc/verifSensi';
import type { VerifCheck } from '@/domain/pdc/verifChecks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';

const NOTES = [
  ['Effort conservation', ': Agent vFTE = exactly the replaced human effort (Human FTE + Agent vFTE = baseline). The productivity factor (×1.4) is isolated in yearAgentCapacity (indicative); it no longer inflates the vFTE.'],
  ['Day-rate consistency', ': the annual summary AND the monthly detail use the same target day rate (location strategy). No more divergence.'],
  ['No double counting in target team', ': Dev + Supervision = residual FTE (supervision is a part of the residual). The agentic run is the only added team (new, external to the project).'],
  ['Scope vs unit cost', ': headcount reduction comes from automation (× phase weight); the location strategy acts only on the day rate. Separate levers, no double counting.'],
  ['Baseline', ': cost of the AS-IS team alone. AI costs (tokens, infra, run-team) are incremental and subtracted from benefits.'],
  ['ROI', ': (cumulative net benefits over the horizon) ÷ (Setup investment €). Agentic run costs are already net in the benefits.'],
  ['Setup FTE', ': transitional headcount whose € cost is included in the Setup budget (coaching/training), not recounted in the Run.'],
];

/** The consistency checks (expected vs observed), the calculation chain, the model conventions and the directional sensitivity test. */
export function Checks({ checks }: { checks: VerifCheck[] }) {
  return (
    <>
      <h3>✅ Automatic consistency checks</h3>
      <DataTable rows={checks} rowKey={(r) => r.name} columns={[
        { key: 'n', header: '#', render: (_r, i) => i + 1 }, { key: 'c', header: 'Check', render: (r) => <strong>{r.name}</strong> },
        { key: 'e', header: 'Expected', align: 'center', render: (r) => r.exp }, { key: 'o', header: 'Observed', align: 'center', render: (r) => r.got },
        { key: 's', header: 'Status', align: 'center', render: (r) => <Badge tone={r.ok ? 'teal' : 'brick'}>{r.ok ? '✓ OK' : '✗ GAP'}</Badge> }]} />
    </>
  );
}
export function Chain({ rows }: { rows: string[][] }) {
  return (
    <>
      <h3>🔗 Calculation chain (current values)</h3>
      <DataTable rows={rows} rowKey={(r) => r[0]!} columns={[
        { key: 's', header: 'Step', render: (r) => <strong>{r[0]}</strong> }, { key: 'f', header: 'Formula', render: (r) => <code>{r[1]}</code> },
        { key: 'c', header: 'Calculation', render: (r) => r[2] }, { key: 'r', header: 'Result', align: 'right', render: (r) => <b>{r[3]}</b> }]} />
    </>
  );
}
export function Conventions() {
  return <><h3>📐 Model conventions (V7 fixes)</h3><ul>{NOTES.map(([k, t]) => <li key={k}><strong>{k}</strong>{t}</li>)}</ul></>;
}
export function Sensi({ rows }: { rows: SensiRow[] }) {
  return (
    <>
      <h3>🧪 Instant sensitivity test (directional validation)</h3>
      <DataTable rows={rows} rowKey={(r) => r.variation} columns={[
        { key: 'v', header: 'Variation', render: (r) => <strong>{r.variation}</strong> }, { key: 'e', header: 'Expected effect', render: (r) => r.expected },
        { key: 'o', header: 'Observed effect (FTE Y3 / ROI)', render: (r) => r.observed },
        { key: 's', header: 'Status', align: 'center', render: (r) => (r.ok === null ? <Badge>n/a (at limit)</Badge> : <Badge tone={r.ok ? 'teal' : 'brick'}>{r.ok ? '✓ Consistent' : '✗ Abnormal'}</Badge>) }]} />
    </>
  );
}
