import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Ctx } from '@/domain';
import { blendedDayRate, fteBySkill, locationMix, teamInCost } from '@/domain/location';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { CLASS_TONE } from '../ClassBadge';
import { fmtK } from '../fmtK';
import { useTheme } from '@/ui/themeContext';

/** Total FTE, annual cost, blended day rate and number of lines. */
export function TeamSummary({ c }: { c: Ctx }) {
  const t = teamInCost(c.s, c.inp), rate = blendedDayRate(c.s, c.inp);
  return (
    <StatRow>
      <Stat label="Total FTE" value={t.etp.toFixed(1)} />
      <Stat label="Annual cost" value={fmtK(t.cost)} />
      <Stat label="Blended day-rate" value={rate > 0 ? `€${Math.round(rate)}` : '—'} />
      <Stat label="# resource lines" value={String(c.s.teamIn.length)} />
    </StatRow>
  );
}

/** FTE by location classification (doughnut) and by skill (bars). */
export function TeamCharts({ c }: { c: Ctx }) {
  const s = c.s, { tok } = useTheme();
  const [byClass, bySkill] = useMemo(() => {
    const cls = locationMix(s).byClass, sk = fteBySkill(s);
    const a: ChartConfiguration = {
      type: 'doughnut',
      data: { labels: Object.keys(cls), datasets: [{ data: Object.values(cls), backgroundColor: Object.values(CLASS_TONE).map(tok) }] },
      options: { plugins: { legend: { position: 'right' } } },
    };
    const b: ChartConfiguration = {
      type: 'bar',
      data: { labels: Object.keys(sk), datasets: [{ label: 'FTE', data: Object.values(sk), backgroundColor: tok('primary-700') }] },
      options: { plugins: { legend: { display: false } } },
    };
    return [a, b];
  }, [s, tok]);
  return (
    <>
      <h2>Breakdown by location classification</h2>
      <ChartPanel config={byClass} label="FTE by location classification" height={200} />
      <h3>Breakdown by skill</h3>
      <ChartPanel config={bySkill} label="FTE by skill" height={200} />
    </>
  );
}
