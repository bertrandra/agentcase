import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { LOCATIONS, type Ctx } from '@/domain';
import { teamInCost } from '@/domain/location';
import { locClass } from '@/domain/baseline/locStrat';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { CLASS_COLOR } from '../ClassBadge';
import { fmtK } from '../fmtK';

/** Total FTE, annual cost, blended day rate and number of lines. */
export function TeamSummary({ c }: { c: Ctx }) {
  const t = teamInCost(c.s, c.inp), wd = c.inp.p('workdays');
  return (
    <StatRow>
      <Stat label="Total FTE" value={t.etp.toFixed(1)} />
      <Stat label="Annual cost" value={fmtK(t.cost)} />
      <Stat label="Blended day-rate" value={t.etp * wd > 0 ? `€${Math.round(t.cost / (t.etp * wd))}` : '—'} />
      <Stat label="# resource lines" value={String(c.s.teamIn.length)} />
    </StatRow>
  );
}

/** FTE by location classification (doughnut) and by skill (bars). */
export function TeamCharts({ c }: { c: Ctx }) {
  const rows = c.s.teamIn;
  const [byClass, bySkill] = useMemo(() => {
    const cls: Record<string, number> = { Local: 0, Nearshore: 0, Offshore: 0 }, sk: Record<string, number> = {};
    rows.forEach((r) => { const k = LOCATIONS.some((l) => l.name === r.loc) ? locClass(r.loc) : 'Local'; cls[k] = (cls[k] ?? 0) + r.etp; sk[r.skill] = (sk[r.skill] || 0) + r.etp; });
    const a: ChartConfiguration = { type: 'doughnut', data: { labels: Object.keys(cls), datasets: [{ data: Object.values(cls), backgroundColor: Object.values(CLASS_COLOR) }] }, options: { plugins: { legend: { position: 'right' } } } };
    const b: ChartConfiguration = { type: 'bar', data: { labels: Object.keys(sk), datasets: [{ label: 'FTE', data: Object.values(sk), backgroundColor: '#0058AB' }] }, options: { plugins: { legend: { display: false } } } };
    return [a, b];
  }, [rows]);
  return (
    <>
      <h3>Breakdown by location classification</h3>
      <ChartPanel config={byClass} label="FTE by location classification" height={200} />
      <h3>Breakdown by skill</h3>
      <ChartPanel config={bySkill} label="FTE by skill" height={200} />
    </>
  );
}
