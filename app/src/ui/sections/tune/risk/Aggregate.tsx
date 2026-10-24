import type { RiskRow } from '@/domain/portfolio';
import { useRiskAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const yn = (b: boolean): string => (b ? 'yes' : 'no');
const COLS: AggColumn<RiskRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'tier', header: 'AI-Act tier', render: (r) => r.tierLabel },
  { key: 'tapply', header: 'Tier on DI bar', render: (r) => yn(r.tierApplied) },
  { key: 'score', header: 'Register score', align: R, title: 'Mean of probability × impact / 9, 0–1', render: (r) => `${r.score.toFixed(2)} (${r.band})` },
  { key: 'rapply', header: 'Register on DI bar', render: (r) => yn(r.registerApplied) },
  { key: 'prem', header: 'Quality premium', align: R, render: (r) => `${(r.premium * 100).toFixed(1)}%` },
  { key: 'qapply', header: 'Premium on DI bar', render: (r) => yn(r.qualityApplied) },
  { key: 'bar', header: 'DI bar premium (pts)', align: R, render: (r) => (r.diBar * 100).toFixed(1) },
];

/**
 * Risk & Compliance — Aggregate view: AI-Act tier, risk-register score and quality
 * premium of each product, with the Decision-Intelligence bar they add (read-only).
 */
export default function RiskAggregate() {
  const a = useRiskAgg(), vs = useViewScope();
  const items: SpreadItem[] = [
    { id: 'score', name: 'Risk-register score', s: a.score, f: (v) => v.toFixed(2) },
    { id: 'bar', name: 'DI bar premium (pts)', s: a.diBar, f: (v) => (v * 100).toFixed(1) },
  ];
  return (
    <InputAggregate title="🛡️ Risk & Compliance" intro="the AI-Act tier, the risk register and the quality premium belong to each product.">
      <AggregateTable caption={`Risk inputs by product — ${vs.label}`} rows={a.rows} columns={COLS} />
      <p className="ac-muted">{a.counts.highTier} product(s) in a high-risk or prohibited AI-Act tier · {a.counts.highRisk} with a high register score · {a.counts.applied} raising the Decision Intelligence bar.</p>
      <SpreadTable caption={`Spread of the risk inputs — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
