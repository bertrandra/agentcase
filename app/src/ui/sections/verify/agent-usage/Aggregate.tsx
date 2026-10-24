import { usageAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../../verifyA/SimpleTable';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';

const help = (
  <>
    <p>How intensively agents are used across the <strong>selection</strong>: runs, tokens and cost per product, and the agent effort by phase and authorization
      level, added up over the planned products.</p>
    <p>Token and infrastructure costs by year are the consolidated calendar series. Choose a product in “Show” for the single-product page.</p>
  </>
);

/** Agent usage — aggregate view (R-conso): the products' agent consumption added up, by calendar year, phase and authorization level. */
export default function AgentUsageAggregate() {
  const a = useVerifyView(usageAgg);
  if (!a) return null;
  return (
    <SectionFrame title="📊 Agent usage — consumption for this case" help={help} result={
      <>
        <p className="ac-muted">Agent consumption of {a.label}: the products&apos; own usage added up.</p>
        <Panel title="By product"><VerifyTable table={a.table} caption="Agent usage by product" /></Panel>
        <Panel title="🔢 Agent vFTE and cost by calendar year">
          <SimpleTable caption={`Calendar years — ${a.label}`} align={['left', 'right', 'right', 'right']}
            head={['Year', 'Agent vFTE (year end)', 'Token €/year', 'Infra €/year']}
            rows={a.years.map((y) => ({ key: y.label, cells: [<b>{y.label}</b>, fmt1(y.vfte), fmtE(y.tokenCost), fmtE(y.infra)] }))} />
        </Panel>
        <Panel title="🤖 Agent effort by phase (in scope)">
          <SimpleTable caption={`Agent effort by phase — ${a.label}`} align={['left', 'center', 'right']} head={['Phase', 'Artifacts', 'Relative agent effort']}
            rows={a.phases.map((p) => ({ key: p.id, cells: [<><b>{p.id}</b> {p.name}</>, p.n, p.effort.toFixed(1)] }))} />
        </Panel>
        <Panel title="🔐 Agent effort by authorization level">
          <SimpleTable caption={`Agent effort by authorization level — ${a.label}`} align={['left', 'center', 'right', 'center']}
            head={['Authorization', 'Artifacts', 'Relative agent effort', 'Share of agent effort']}
            rows={a.auth.map((x) => ({ key: x.level, cells: [<b>{x.level}</b>, x.n, x.effort.toFixed(1), <b>{Math.round(x.share)}%</b>] }))} />
        </Panel>
        <ExcludedNote />
      </>
    } />
  );
}
