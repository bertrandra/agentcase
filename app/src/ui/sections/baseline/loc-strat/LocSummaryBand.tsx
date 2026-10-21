import { locSummary } from '@/domain/baseline/locStrat';
import { useCtx } from '@/store/hooks';
import { Stat, StatRow } from '@/ui/widgets/cards';

/** Blended rate AS-IS / target, rate gap and the Local / Offshore shares AS-IS → target. */
export function LocSummaryBand() {
  const m = locSummary(useCtx());
  return (
    <StatRow>
      <Stat label="Blended rate AS-IS" value={`€${Math.round(m.asisTJM)}`} />
      <Stat label="Blended rate target" value={`€${Math.round(m.tgtTJM)}`} />
      <Stat label="Rate gap" value={m.gap} tone={m.gap.startsWith('-') ? 'teal' : 'brick'} />
      <Stat label="% Local AS-IS→target" value={`${m.local[0]}% → ${m.local[1]}%`} />
      <Stat label="% Offshore AS-IS→target" value={`${m.offshore[0]}% → ${m.offshore[1]}%`} />
    </StatRow>
  );
}
