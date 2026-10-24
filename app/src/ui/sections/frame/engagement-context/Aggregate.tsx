import type { EngagementRow } from '@/domain/portfolio';
import { useFrameEngagement } from '@/store/selectionHooksFrame';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const COLS: AggColumn<EngagementRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'ctx', header: 'Engagement context', title: 'MSC: managed service on Capgemini infrastructure; MSI: client infrastructure; STA: staff augmentation', render: (r) => r.label },
  { key: 'src', header: 'Source', render: (r) => (r.own ? 'own context' : 'inherited from common') },
  { key: 'mat', header: 'Maturity cap', align: R, render: (r) => `L${r.maturityCap}` },
  { key: 'ramp', header: 'Ramp speed', align: R, render: (r) => `×${r.rampSpeed}` },
  { key: 'glass', header: 'Glass factor', align: R, render: (r) => `×${r.glassFactor}` },
  { key: 'setup', header: 'Setup billable', align: R, render: (r) => `${Math.round(r.setupBillable * 100)}%` },
  { key: 'auth', header: 'AI authority', align: R, render: (r) => `≤ A${r.authorityCap}` },
  { key: 'risk', header: 'Risk bar', align: R, render: (r) => `+${r.riskPremium} pts` },
  { key: 'hub', header: 'Hub up to', align: R, render: (r) => `CC${r.khMaxCC}` },
  { key: 'rate', header: 'Discount rate', align: R, render: (r) => `${(r.discountRate * 100).toFixed(1)}%` },
];

const help = <p>Aggregate view of the contractual frame (MSC / MSI / STA) of each product and the coefficients it implies. The last line counts the products under each context and gives the range of the case discount rate.</p>;

/** Engagement context — Aggregate view: the contractual frame and coefficients of each product, the products per context and the discount-rate range. */
export default function EngagementContextAggregate() {
  const a = useFrameEngagement(), vs = useViewScope();
  return (
    <InputAggregate title="🧭 Engagement context" help={help} intro="the engagement context belongs to each product (the customer name is common to all).">
      <StatRow>
        {a.contexts.map((c) => <Stat key={c.key} label={`Context ${c.key}`} value={`${c.count} product${c.count > 1 ? 's' : ''}`} />)}
        <Stat label="Case discount rate (min – max)" value={fmtRange(a.discountPct, 1, '%')} tone="teal" />
      </StatRow>
      <AggregateTable caption={`Engagement context by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { ctx: a.contexts.map((c) => `${c.count} ${c.key}`).join(' · ') } }} />
    </InputAggregate>
  );
}
