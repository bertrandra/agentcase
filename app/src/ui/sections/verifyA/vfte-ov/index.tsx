import { periodRows, valueRows } from '@/domain/verifyA';
import { fmt1 } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';

const help = (
  <>
    <p>Human / agent breakdown per period. Total effort (FTE-eq) = human FTE + agent vFTE and is conserved: it always equals the AS-IS team.</p>
    <p>The second table reads the in-scope artefacts by value category (VA core value-adding, NVA, NVA-N) with their average supervision and automatable
      share.</p>
  </>
);

/** vFTE overview — the period table of human FTE vs agent vFTE, and the agent effort by artefact value category. */
export default function VfteOverviewSection() {
  const live = useLive(), rows = periodRows(live), cats = valueRows(live);
  return (
    <SectionFrame title="vFTE Overview" help={help}
      result={<>
        <p className="ac-muted">Total effort (FTE-eq) = combined human + agent effort (conserved). Human/agent breakdown per period, contextual to your
          team.</p>
        <SimpleTable align={['left', 'right', 'right', 'right', 'center', 'center']} head={['Period', 'Human FTE', 'Agent vFTE', 'Total effort (FTE-eq)',
          'Adoption %', 'Reduction vs AS-IS']}
          rows={rows.map((r) => ({ key: r.label, cells: [r.label, fmt1(r.human), fmt1(r.agent), fmt1(r.total), `${Math.round(r.ramp)}%`,
            `${fmt1(r.freed)} FTE`] }))} />
        <Panel title="Agent effort by artifact category (reference)">
          <SimpleTable align={['left', 'center', 'center', 'center']} head={['Artifact value', '# artifacts', 'Avg human sup.', 'Avg automatable']}
            rows={cats.map((v) => ({ key: v.value, cells: [<b>{v.value}</b>, v.n, `${v.human}%`, `${v.agent}%`] }))} />
        </Panel>
      </>} />
  );
}
