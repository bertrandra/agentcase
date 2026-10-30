import { useMemo } from 'react';
import { plannedQuarters, trackStatus, type TrackActual } from '@/domain/frame';
import { useCtx, useDoc } from '@/store/hooks';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { TrackerTable } from './TrackerTable';
import { trackerCharts } from './trackerCharts';
import { useTheme } from '@/ui/themeContext';
import { toggleTracker, useTrackerOpen } from './trackerOpen';

function TrackerBody() {
  const ctx = useCtx(), actuals = useDoc((d) => (d.trackActuals ?? {}) as Record<string, TrackActual | undefined>);
  const plan = useMemo(() => plannedQuarters(ctx), [ctx]);
  const { tok } = useTheme(), st = trackStatus(plan, actuals), charts = useMemo(() => trackerCharts(plan, actuals, tok), [plan, actuals, tok]);
  return (
    <>
      <p className="ac-muted">The plan columns are derived from the adoption curve, so they always match the current horizon — one row per quarter, for every
        year of the case. Leave a cell blank until you have the real number.</p>
      <StatRow>
        <Stat label="Overall status" value={st.head} tone={st.tone as 'grey'} />
        <Stat label="Quarters reported" value={`${st.filled} / ${st.total}`} />
        <Stat label="Latest planned adoption" value={`${st.latest}%`} tone="teal" />
      </StatRow>
      <TrackerTable plan={plan} actuals={actuals} />
      <div className="ac-tracker-charts">
        <div>
          <h3 className="ac-muted">Adoption — planned vs actual</h3>
          <ChartPanel config={charts.adoption} label="Adoption, planned versus actual, per quarter" height={260} />
        </div>
        <div>
          <h3 className="ac-muted">Cumulative savings — planned vs actual</h3>
          <ChartPanel config={charts.savings} label="Cumulative savings, planned versus actual, per quarter" height={260} />
        </div>
      </div>
    </>
  );
}

/** Quarterly plan-vs-actual tracker, collapsed by default: it only earns its place once delivery is under way. */
export function Tracker() {
  const open = useTrackerOpen();
  const toggle = <button type="button" aria-expanded={open} onClick={toggleTracker}>{open ? '▾ Hide tracker' : '▸ Show tracker'}</button>;
  return (
    <Panel title="📈 Plan vs actual — quarterly tracking" aside={toggle}>
      <p className="ac-muted">Record what actually happened each quarter against what the case predicted. Hidden by default — it only earns its place once
        delivery is under way.</p>
      <ActivityRefs kinds={['valueTracking']} />
      {open && <TrackerBody />}
    </Panel>
  );
}
