import type { ScopeParamsRow } from '@/domain/portfolio';
import { useScopeParams } from '@/store/selectionHooksScope';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const pct = (x: number) => `${x.toFixed(0)}%`;
const COLS: AggColumn<ScopeParamsRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'potential', header: 'Automation potential', align: R, render: (r) => pct(r.potential),
    title: 'Target automation potential (%) before the glass ceiling' },
  { key: 'fit', header: 'Fit to scope', render: (r) => (r.fitted ? 'fitted to the scope' : 'manual') },
  { key: 'cap', header: 'Technical cap', align: R, render: (r) => pct(r.cap) },
  { key: 'ceiling', header: 'Glass ceiling', align: R, title: 'Irreducible human share (%)', render: (r) => pct(r.ceiling) },
  { key: 'src', header: 'Ceiling source', render: (r) => (r.forced ? 'forced' : 'computed from the scope') },
  { key: 'eff', header: 'Effective automation', align: R, render: (r) => pct(r.effective),
    title: 'Potential × posture × context × hub, capped by the headroom 100 × (1 − ceiling)' },
];

const help = <p>Aggregate view of the two levers that set how deep automation can go, product by product: the <strong>automation potential</strong> and
  the <strong>glass ceiling</strong>. Nothing is typed here; the last line gives the lowest and highest value across the selection.</p>;

/** Automation & Glass ceiling — Aggregate view: potential, ceiling and effective automation of each product, with the range across the selection. */
export default function ParamsAggregate() {
  const a = useScopeParams(), vs = useViewScope();
  const cells = { potential: fmtRange(a.potential, 0, '%'), ceiling: fmtRange(a.ceiling, 0, '%'), eff: fmtRange(a.effective, 0, '%') };
  return (
    <InputAggregate title="🎯 Automation & Glass ceiling" help={help} intro="the automation potential and the glass ceiling belong to each product.">
      <StatRow>
        <Stat label="Potential (min – max)" value={fmtRange(a.potential, 0, '%')} />
        <Stat label="Glass ceiling (min – max)" value={fmtRange(a.ceiling, 0, '%')} tone="brick" />
        <Stat label="Effective automation (min – max)" value={fmtRange(a.effective, 0, '%')} tone="teal" />
      </StatRow>
      <AggregateTable caption={`Automation and glass ceiling by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Range (min – max) — ${vs.label}`, cells }} />
    </InputAggregate>
  );
}
