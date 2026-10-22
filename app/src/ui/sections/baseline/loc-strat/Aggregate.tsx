import type { LocMixLine, LocStratRow } from '@/domain/portfolio';
import { useLocStratAggregate } from '@/store/selectionHooksBaseline';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { fmtRange, InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const;
const eur = (x: number) => `€${Math.round(x)}`;
const COLS: AggColumn<LocStratRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'fte', header: 'Entry FTE', align: R, render: (r) => r.fte.toFixed(1) },
  { key: 'asis', header: 'Blended rate AS-IS', align: R, render: (r) => eur(r.asisTJM) },
  { key: 'tgt', header: 'Blended rate target', align: R, render: (r) => eur(r.targetTJM) },
  { key: 'gap', header: 'Rate gap', align: R, render: (r) => r.gap },
  { key: 'local', header: '% Local AS-IS → target', align: R, render: (r) => `${r.localAsis.toFixed(0)}% → ${r.localTarget.toFixed(0)}%` },
  { key: 'off', header: '% Offshore AS-IS → target', align: R, render: (r) => `${r.offshoreAsis.toFixed(0)}% → ${r.offshoreTarget.toFixed(0)}%` },
  { key: 'src', header: 'Target mix', render: (r) => (r.own ? 'own mix' : 'derived from AS-IS') },
];
const MIX: AggColumn<LocMixLine & { id: string }>[] = [
  { key: 'cls', header: 'Class', render: (r) => r.cls },
  { key: 'fte', header: 'Entry FTE', align: R, render: (r) => r.fte.toFixed(1) },
  { key: 'asis', header: 'AS-IS share', align: R, render: (r) => `${r.asisPct.toFixed(0)}%` },
  { key: 'tgt', header: 'Target share', align: R, title: 'Each product’s target mix weighted by its entry FTE', render: (r) => `${r.targetPct.toFixed(0)}%` },
];

const help = <p>Aggregate view of the location strategy: the AS-IS and target mix and blended day rates of each product, and the location mix of the whole selection weighted by entry FTE. The target mix of a product is its own intention; it prices its residual team.</p>;

/** Location strategy — Aggregate view: the location mix and blended rates of each product, and the location mix of the selection by FTE. */
export default function LocStratAggregate() {
  const a = useLocStratAggregate(), vs = useViewScope();
  return (
    <InputAggregate title="Location strategy" help={help} intro="the target location mix belongs to each product.">
      <StatRow>
        <Stat label="Entry FTE of the selection" value={a.fte.toFixed(1)} />
        <Stat label="Target % Local (min – max)" value={fmtRange(a.localTarget, 0, '%')} tone="teal" />
        <Stat label="Target % Offshore (min – max)" value={fmtRange(a.offshoreTarget, 0, '%')} tone="amber" />
      </StatRow>
      <AggregateTable caption={`Location strategy by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { fte: a.fte.toFixed(1), local: fmtRange(a.localTarget, 0, '%'), off: fmtRange(a.offshoreTarget, 0, '%') } }} />
      <Panel title="Location mix of the selection">
        <AggregateTable caption={`Location mix by entry FTE — ${vs.label}`} first="Location" rows={a.mix.map((m) => ({ ...m, id: m.name }))} columns={MIX} edit={false}
          totals={{ label: `Total — ${vs.label}`, cells: { fte: a.fte.toFixed(1) } }} />
      </Panel>
    </InputAggregate>
  );
}
