import { fmtRoiPct } from '@/domain/economics/roi';
import { useStrategiesAggregate } from '@/store/selectionHooksVerdict';
import { useViewScope } from '@/store/viewScope';
import { fmtEurK } from '@/ui/format';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout } from '@/ui/widgets/cards';
import { ProductDrill } from '@/ui/widgets/ProductDrill';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';
import StrategiesSection from './index';

const help = (
  <p>The seven delivery strategies are evaluated for each planned product of the <strong>selection</strong> on that product&apos;s own case, then ranked with its own weights. This table shows the strategy each product
    ranks first, with its ROI, TCO and net benefit, and rolls those recommendations up. The strategies do not add up across products: open a product to see its full comparison.</p>
);
const R = 'right' as const;

/** Strategy comparison — aggregate view (R-rollup): the recommended strategy of each product of the Portfolio / Wave with its ROI and TCO, the roll-up, and the full section per product. */
export default function StrategiesAggregate() {
  const a = useStrategiesAggregate(), vs = useViewScope();
  if (!a) return null;
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave }, { key: 'rec', header: 'Recommended strategy', render: (r) => `${r.icon} ${r.label}` },
    { key: 'score', header: 'Score', align: R, title: 'Weighted composite score, 0 to 100', render: (r) => r.score },
    { key: 'roi', header: 'ROI', align: R, render: (r) => fmtRoiPct(r.roi) }, { key: 'tco', header: 'TCO', align: R, title: 'Setup plus run cost over the product horizon', render: (r) => fmtEurK(r.tco) },
    { key: 'net', header: 'Net', align: R, render: (r) => fmtEurK(r.net) }, { key: 'pay', header: 'Payback', align: R, render: (r) => (r.payback == null ? 'n/a' : `Year ${r.payback}`) },
  ];
  const t = a.totals;
  return (
    <SectionFrame title={`🏆 Strategy comparison — ${a.label}`} help={help}
      result={<>
        <AggregateTable caption={`Recommended strategy by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Roll-up — ${a.label}`, cells: { tco: fmtEurK(t.tco), net: fmtEurK(t.net), roi: fmtRoiPct(t.roi) } }} />
        <Callout kind="blue"><strong>Recommendations:</strong> {a.mix.map((m) => `${m.label} for ${m.count} product${m.count > 1 ? 's' : ''}`).join(' · ') || 'none'}. Each product is evaluated on its own case
          and horizon; the roll-up line adds up the recommended strategies, with the ROI of the summed net and setup.</Callout>
        <ProductDrill Section={StrategiesSection} productIds={vs.productIds} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
