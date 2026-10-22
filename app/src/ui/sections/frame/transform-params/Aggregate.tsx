import type { IndustryRow } from '@/domain/portfolio';
import { useFrameIndustry } from '@/store/selectionHooksFrame';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const COLS: AggColumn<IndustryRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'industry', header: 'Industry profile', render: (r) => r.label },
  { key: 'use', header: 'Regulatory catalog', render: (r) => (r.regUse ? 'on' : 'off') },
  { key: 'norms', header: 'Norms', align: R, title: 'Ticked norms (industry and cross-cutting)', render: (r) => r.norms },
  { key: 'art', header: 'Regulatory artefacts', align: R, render: (r) => r.regArtefacts },
  { key: 'cross', header: 'Cross-cutting', render: (r) => (r.cross.length ? r.cross.join(', ') : 'none') },
  { key: 'ceil', header: 'Regulatory ceiling', align: R, title: 'Weight-averaged human supervision of the selected regulatory artefacts', render: (r) => `${r.regCeiling.toFixed(0)}%` },
  { key: 'src', header: 'Source', render: (r) => (r.own ? 'own profile' : 'inherited from common') },
];

const help = <p>Aggregate view of the industry / regulatory profile of each product: the profile, whether the regulatory catalog is on, the norms and cross-cutting concerns ticked and the regulatory artefacts they add to the scope.</p>;

/** Industry / regulatory profile — Aggregate view: the profile, norms and cross-cutting concerns of each product and the number of regulated products. */
export default function TransformParamsAggregate() {
  const a = useFrameIndustry(), vs = useViewScope();
  return (
    <InputAggregate title="🏛️ Industry / regulatory profile" help={help} intro="the regulatory profile belongs to each product.">
      <StatRow>
        <Stat label="Regulated products" value={`${a.regulated}/${a.rows.length}`} tone={a.regulated ? 'amber' : 'teal'} />
        {a.industries.map((i) => <Stat key={i.code} label={`Profile: ${i.label}`} value={`${i.count} product${i.count > 1 ? 's' : ''}`} />)}
      </StatRow>
      <AggregateTable caption={`Industry profile by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { use: `${a.regulated} regulated` } }} />
    </InputAggregate>
  );
}
