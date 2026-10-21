import { flowModel } from '@/domain/model/flow';
import { useCtx } from '@/store/hooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CycleCard } from './CycleCard';
import { ValueCard } from './ValueCard';

const help = (
  <>
    <p>Stops pricing agentic delivery purely as unit-cost reduction: agents change cycle time (Little&apos;s Law), and the value of arriving earlier is usually larger than the value of costing less.
      Cycle time comes from the app&apos;s DORA lead-time anchor, interpolated by automation depth and throttled by the supervision cap — a faster generator does not shorten cycle time if the queue is at the reviewer.</p>
    <p>The time-to-market value is sponsor-owned: hidden, not zero, until a real margin per month is provided. Only the declared throughput-in share of the compression counts, so the same freed capacity is never counted twice (CC-FL-01). Nothing here feeds the financial model.</p>
  </>
);

/** P5 — flow and value: lead time, compression θ and WIP (Little's Law), then the sponsor-owned time-to-market value. */
export default function ModelFlowSection() {
  const fm = flowModel(useCtx());
  return (
    <SectionFrame title="⏱️ Flow & value · P5 · v16.9 · strategic bet" help={help}
      input={<Callout>Stops pricing agentic delivery purely as unit-cost reduction. Agents change cycle time via Little&apos;s Law - and the value of arriving earlier is usually larger than the value of costing less. Cycle-time compression is throttled by P3&apos;s own supervision
        cap (&quot;a faster generator does not shorten cycle time if the queue is at the reviewer&quot;), and an explicit cost-out/throughput-in split keeps the same freed capacity from ever being counted twice. (AME-SPEC v0.2, P5)</Callout>}
      result={<><CycleCard fm={fm} /><ValueCard fm={fm} /></>} />
  );
}
