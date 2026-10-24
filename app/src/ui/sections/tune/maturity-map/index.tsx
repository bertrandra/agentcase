import { maturityInfo } from '@/domain/tune';
import { useCtx } from '@/store/hooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { LevelTable } from './LevelTable';

const help = (
  <>
    <p>The single definition of the four maturity levels L1–L4 — the only place these thresholds are set. Every L1–L4 marker in the app (the adoption curve,
      the automation graph, the FTE/vFTE chart) and every maturity read-out (registry KPIs, operating-model topology) reads these bounds live.</p>
    <p><strong>Adoption level</strong> = highest L whose adoption threshold the case’s adoption % has cleared; <strong>share level</strong> = highest L whose
      agent-vFTE-share threshold the agent share has cleared. <strong>Maturity level</strong> = min(adoption level, share level), then capped by the engagement
      context (MSC allows L4, MSI L3, STA L2).</p>
    <p>Values are kept non-decreasing automatically; the label is free text and appears on maturity read-outs. Reset restores adoption 0/25/55/80 and agent
      share 0/10/25/45.</p>
  </>
);

/** What the case reaches with the thresholds above: the lower of the two axes, capped by the engagement context. */
function ReachedLevel() {
  const mi = maturityInfo(useCtx());
  return (
    <Callout>
      This case reaches <strong>L{mi.capped}</strong> — adoption axis <strong>L{mi.lr}</strong> ({Math.round(mi.rampY3)}% adoption), agent-share axis{' '}
      <strong>L{mi.ls}</strong> ({Math.round(mi.share)}% share), engagement-context cap L{mi.cap}. The level is the lower of the two axes.
    </Callout>
  );
}

/** Maturity levels (L1–L4): the editable thresholds that drive every maturity marker and the engine's level. */
export default function MaturityMapSection() {
  return (
    <SectionFrame title="📐 Maturity levels (L1–L4)" help={help}
      input={<><p>Edit the thresholds below and every L1–L4 marker and maturity read-out across the app follows — one source of truth. A level is the lower of
        the two axes (adoption and agent share); the engagement context can still cap the reachable level.</p><LevelTable /></>}
      result={<ReachedLevel />} />
  );
}
