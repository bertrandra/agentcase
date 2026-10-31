import type { ReactNode } from 'react';
import { usePlanViews } from '@/store/planHooks';
import { Tabs } from '@/ui/widgets/Tabs';
import { HistogramTab } from './HistogramTab';
import { ObsTab } from './ObsTab';
import { PlanExports } from './PlanExports';
import { ProgrammeGantt } from './ProgrammeGantt';
import { WbsTab } from './WbsTab';

/**
 * The tabs of the 📅 Plan screen (docs/SPEC_BPMN.md § 19.8 F-B78; phase B9d): Gantt (the calendar of the case and the programme's Gantt), WBS,
 * OBS / RAM and Histogram, all views of the plan of the display scope (`usePlanViews`, computed once here); the selected tab is view state.
 */
export function PlanTabs({ gantt }: { gantt: ReactNode }) {
  const v = usePlanViews();
  return (
    <>
      <PlanExports v={v} />
      <Tabs label="Plan views" tabs={[
        { id: 'gantt', label: '📅 Gantt', render: () => <>{gantt}<ProgrammeGantt v={v} /></> },
        { id: 'wbs', label: '🧱 WBS', render: () => <WbsTab v={v} /> },
        { id: 'obs', label: '🏢 OBS / RAM', render: () => <ObsTab v={v} /> },
        { id: 'hist', label: '📊 Histogram', render: () => <HistogramTab v={v} /> },
      ]} />
    </>
  );
}
