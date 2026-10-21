import type { Ctx } from '../../ctx';
import { factoryTasks, KPIS, type KpiData } from '../../factory/kpi';
import type { FactoryData } from '../../factory/types';
import { v } from './types';

const NONE: never[] = [];
const SCOPE = ['release-pipeline', 'factory-model', 'engineering'] as const;

/** KPI input of the case: the factory arrays (empty when the snapshot lacks them) plus the tasks in scope. */
export function kpiDataOf(c: Ctx): KpiData {
  const s = c.s as unknown as Partial<FactoryData>;
  return { DEPLOYMENTS: s.DEPLOYMENTS ?? NONE, ENVIRONMENTS: s.ENVIRONMENTS ?? NONE, RELEASE_CANDIDATES: s.RELEASE_CANDIDATES ?? NONE, MONITORING_EVENTS: s.MONITORING_EVENTS ?? NONE,
    APPROVALS: s.APPROVALS ?? NONE, QUALITY_GATES: s.QUALITY_GATES ?? NONE, COMMITS: s.COMMITS ?? NONE, BUILDS: s.BUILDS ?? NONE, FEEDBACK_ITEMS: s.FEEDBACK_ITEMS ?? NONE, tasks: factoryTasks(c) } as KpiData;
}

/** The 14 DORA + agentic KPIs and the size of the Factory model, bound to the sections that edit their data. */
export const FACTORY_VARS = [
  ...KPIS.map((k) => v(k.id, k.label, k.format, k.unit, SCOPE[k.group], (c) => k.get(kpiDataOf(c)))),
  v('factoryStoriesCount', 'Stories in the Factory model', 'INT', '', 'factory-timeline', (c) => (c.s as unknown as Partial<FactoryData>).STORIES?.length ?? 0),
];
