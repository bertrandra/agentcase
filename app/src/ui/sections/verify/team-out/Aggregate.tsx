import { targetTeamAgg } from '@/domain/portfolio';
import { useVerifyView } from '@/store/selectionHooksVerify';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../../verifyA/SimpleTable';
import { ExcludedNote, VerifyTable } from '../aggregate/Rollup';

const help = (
  <>
    <p>The target team of the <strong>selection</strong>: each planned product&apos;s own target team (residual dev, supervision, agentic run, setup), added up. FTE and annual costs are additive; percentages are recomputed from the sums.</p>
    <p>Choose a product in “Show” for the single-product breakdown.</p>
  </>
);

/** Target team (TO-BE) — aggregate view (R-conso): the poles and the location split of the selection, with a table per product. */
export default function TeamOutAggregate() {
  const a = useVerifyView(targetTeamAgg);
  if (!a) return null;
  return (
    <SectionFrame title="Target team (TO-BE Y3) — computed breakdown" help={help} result={
      <>
        <p className="ac-muted">The target team of {a.label}: the products&apos; own target teams added up by pole and by location.</p>
        <Panel title="By product"><VerifyTable table={a.table} caption="Target team by product" /></Panel>
        <Panel title="Target team poles">
          <SimpleTable caption={`Target team poles — ${a.label}`} align={['left', 'left', 'center', 'right', 'right']} head={['Group', 'Composition', 'Type', 'FTE', 'Annual cost']}
            rows={a.groups.map((g) => ({ key: g.group, cells: [<b>{g.group}</b>, g.composition, g.kind, fmt1(g.fte), fmtE(g.cost)] }))}
            foot={{ key: 'tot', cells: [`Total — ${a.label}`, '', '', fmt1(a.groupsTotal.fte), fmtE(a.groupsTotal.cost)] }} />
        </Panel>
        <Panel title="🌍 Distribution by location — input vs target">
          <SimpleTable caption={`Location split — ${a.label}`} align={['left', 'center', 'right', 'center', 'right']} head={['Location', '% AS-IS', 'FTE AS-IS', 'Target %', 'Target FTE (estimated)']}
            rows={a.locs.map((r) => ({ key: r.name, cells: [r.name, `${r.asisPct.toFixed(0)}%`, fmt1(r.asisFte), `${r.tgtPct.toFixed(0)}%`, fmt1(r.tgtFte)] }))}
            foot={{ key: 'tot', cells: [`Total — ${a.label}`, '', fmt1(a.locsTotal.asisFte), '', fmt1(a.locsTotal.tgtFte)] }} />
        </Panel>
        <ExcludedNote />
      </>
    } />
  );
}
