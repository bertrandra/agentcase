import type { TokenRow } from '@/domain/portfolio';
import { useTokenAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';
import { eur, fix, int } from '../../tuneB/fmt';
import { RollupAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';
import TokenEconSection from './index';

const R = 'right' as const;
const COLS: AggColumn<TokenRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'runs', header: 'Agent runs, last year', align: R, title: 'At the end of the product’s own horizon', render: (r) => int(r.runs) },
  { key: 'tok', header: 'Tokens, last year (M)', align: R, render: (r) => int(r.tokensM) },
  { key: 'blended', header: 'Blended €/1M', align: R, render: (r) => eur(r.blended) },
  { key: 'end', header: 'Token cost, last year', align: R, render: (r) => eur(r.costEnd) },
  { key: 'horizon', header: 'Token cost, whole horizon', align: R, title: 'Sum of the product’s monthly token cost on the portfolio calendar', render: (r) => eur(r.horizonCost) },
];

/** Token economics & FinOps — Aggregate view: usage and token cost of each product, the consolidated token cost of the selection (`token` series) and the common price catalogue. */
export default function TokenEconAggregate() {
  const a = useTokenAgg(), vs = useViewScope();
  const items: SpreadItem[] = [{ id: 'cost', name: 'Token cost over the horizon', s: a.cost, f: eur }];
  return (
    <RollupAggregate title="Token economics & FinOps" Section={TokenEconSection}
      note="Volumes and costs are those of each product; the whole-horizon total is the consolidated token series of the selection. Prices and the model mix are common to all products.">
      <AggregateTable caption={`Token usage and cost by product — ${vs.label}`} rows={a.rows} columns={COLS} edit={false}
        totals={{ label: `Total — ${vs.label}`, cells: { horizon: eur(a.totals.horizonCost) } }} />
      <SpreadTable caption={`Spread of the token cost — ${vs.label}`} items={items} />
      <Panel title="Common price catalogue">
        <DataTable rowKey={(m) => m.name} caption="Model mix and prices (common to all products)" rows={a.models} columns={[
          { key: 'n', header: 'Model', render: (m) => m.name }, { key: 'mix', header: 'Mix (%)', align: 'right', render: (m) => fix(m.mix, 0) },
          { key: 'in', header: 'Price in (€/1M)', align: 'right', render: (m) => fix(m.priceIn, 2) }, { key: 'out', header: 'Price out (€/1M)', align: 'right', render: (m) => fix(m.priceOut, 2) },
        ]} />
      </Panel>
    </RollupAggregate>
  );
}
