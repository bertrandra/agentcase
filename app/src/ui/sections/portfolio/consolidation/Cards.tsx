import type { PortfolioHeadline } from '@/domain/portfolio';
import { fmtEurK, fmtPct } from '@/ui/format';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { CoreStats, type CoreHints } from './CoreStats';

const HINTS: CoreHints = {
  net: 'Cumulative savings minus setup, over the calendar horizon', roi: 'Net / setup of the consolidated portfolio (n/a without setup)',
  payback: 'First calendar month the consolidated cumulative cash is positive or zero',
  npv: 'Each calendar month is discounted at the common rate from month 1 of the portfolio; the sum of the products is the portfolio NPV',
};

/** The portfolio headline as cards: every figure is read from the domain headline of the consolidated series (nothing is added up here). */
export function Cards({ h }: { h: PortfolioHeadline }) {
  const e = h.endYear, cr = h.costReduction;
  return (
    <StatRow>
      <Stat label={`Savings Y${e.index}`} value={fmtEurK(e.savings)} tone="teal" hint="Savings of the last calendar year of the horizon, summed over the planned products shifted to their start" />
      <Stat label={`Run cost Y${e.index}`} value={fmtEurK(e.run)} tone="amber" hint="To-be run cost of the last calendar year" />
      <Stat label="Setup" value={fmtEurK(h.setup)} tone="grey" hint="Sum of the setup investments, placed on their months (knowledge transfer preparation included)" />
      <CoreStats h={h} hints={HINTS} />
      <Stat label={`Savings over ${cr.years} years`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'} hint="(Savings − setup) / reference cost, components summed over the planned products" />
      <Stat label="Velocity" value={`${h.velocityPct >= 0 ? '+' : ''}${Math.round(h.velocityPct)}%`} hint="Average velocity increase weighted by the entry headcount of each product" />
    </StatRow>
  );
}
