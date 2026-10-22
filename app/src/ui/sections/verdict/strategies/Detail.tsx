import { useMemo } from 'react';
import { evaluateStrategies, stratNormalize, strategyDefsOf, strategyLocSplits, stratWeightsOf } from '@/domain/verdict';
import { useCaseResult, useCtx } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { LocSplit } from './LocSplit';
import { MetricTable } from './MetricTable';
import { Ranking } from './Ranking';

/** The comparison of one product (metrics, location split, weighted ranking) without the strategy configuration editor: what the aggregate view opens per product, read-only. */
export default function StrategiesDetail() {
  const c = useCtx(), horizon = useCaseResult().model.horizon, defs = strategyDefsOf(c.s), W = stratWeightsOf(c.s);
  const R = useMemo(() => evaluateStrategies(c, defs), [c, defs]);
  const N = useMemo(() => stratNormalize(R, W), [R, W]), splits = useMemo(() => strategyLocSplits(c, defs), [c, defs]);
  return (
    <SectionFrame title="Strategy comparison" result={<>
      <MetricTable R={R} horizon={horizon} s={c.s} />
      <Panel title="Location split"><LocSplit rows={splits} /></Panel>
      <Panel title="Weighted ranking & profiles"><Ranking N={N} W={W} /></Panel>
    </>} />
  );
}
