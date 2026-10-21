import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { factoryTasks, type KpiData } from '@/domain/factory/kpi';
import { fgParams } from '@/domain/factory/params';
import type { FactoryData } from '@/domain/factory/types';
import { useCtx, useDoc } from '@/store/hooks';
import type { Doc } from '@/store/types';
import type { Opt } from '@/ui/widgets/LazySelect';
import type { Rec } from './RecordTable';

const NONE: never[] = [];
/** One collection of the case by its state key (a stable empty list when an old snapshot lacks it). */
export const useList = <T,>(key: string): T[] => useDoc((d: Doc) => ((d as Record<string, unknown>)[key] ?? NONE) as T[]);
export const useRecs = (key: string): Rec[] => useList<Rec>(key);

/** Select options linking to other records. */
export const nameOptions = (rows: { id: string; name?: string }[]): Opt[] => rows.map((r) => ({ value: r.id, label: r.name ?? r.id }));

/** Every task (SDLC then regulatory artefact) in the composite "sdlc:<id>" / "reg:<id>" form commits point at. */
export const TASK_OPTIONS: Opt[] = [
  ...SDLC_ARTEFACTS.map((a) => ({ value: `sdlc:${a.id}`, label: `📄 ${a.id} · ${a.name}` })),
  ...REG_ARTEFACTS.map((a) => ({ value: `reg:${a.id}`, label: `⚖️ ${a.id} · ${a.name}` })),
];

/** KPI input of the current case: the factory arrays plus the tasks in scope. */
export function useKpiData(): { data: KpiData; params: ReturnType<typeof fgParams> } {
  const c = useCtx(), s = c.s as unknown as Partial<FactoryData> & { FG_PARAMS?: Parameters<typeof fgParams>[0] };
  const data = { DEPLOYMENTS: s.DEPLOYMENTS ?? NONE, ENVIRONMENTS: s.ENVIRONMENTS ?? NONE, RELEASE_CANDIDATES: s.RELEASE_CANDIDATES ?? NONE, MONITORING_EVENTS: s.MONITORING_EVENTS ?? NONE,
    APPROVALS: s.APPROVALS ?? NONE, QUALITY_GATES: s.QUALITY_GATES ?? NONE, COMMITS: s.COMMITS ?? NONE, BUILDS: s.BUILDS ?? NONE, FEEDBACK_ITEMS: s.FEEDBACK_ITEMS ?? NONE, tasks: factoryTasks(c) } as KpiData;
  return { data, params: fgParams(s.FG_PARAMS) };
}
