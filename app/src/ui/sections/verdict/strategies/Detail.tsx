import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Comparison } from './Comparison';

/** The comparison of one product (metrics, location split, weighted ranking) without the strategy configuration editor: what the aggregate view opens per product, read-only. */
export default function StrategiesDetail() {
  return <SectionFrame title="Strategy comparison" result={<Comparison />} />;
}
