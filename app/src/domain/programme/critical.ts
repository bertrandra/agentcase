/** @calc-zone delivery-views */
/**
 * The critical path of the programme Gantt (docs/SPEC_BPMN.md § 19.8 F-B73; phase B9d). The bars keep the placement of the timing owner
 * (`timing.ts`): nothing is rescheduled here (D-B37, no levelling). A backward pass over the finish-to-start links (with their lag) gives each bar
 * its latest finish; the total float is latest finish − finish, and a bar with no float is critical.
 */
export interface Link { id: string; lag: number }
export interface Schedulable { id: string; start: number; dur: number; preds: Link[] }

const EPS = 1e-6;

/** Total float of every bar (months), by id. Bars without a successor may finish as late as the project's end. */
export function totalFloat(tasks: readonly Schedulable[]): Map<string, number> {
  const end = Math.max(0, ...tasks.map((t) => t.start + t.dur)), succ = new Map<string, { t: Schedulable; lag: number }[]>();
  for (const t of tasks) for (const p of t.preds) succ.set(p.id, [...(succ.get(p.id) ?? []), { t, lag: p.lag }]);
  const lf = new Map<string, number>(), seen = new Set<string>();
  const latestFinish = (t: Schedulable): number => {
    const hit = lf.get(t.id);
    if (hit !== undefined) return hit;
    if (seen.has(t.id)) return end;   // a cycle (never built by the programme): stop there
    seen.add(t.id);
    const ss = succ.get(t.id) ?? [];
    const v = ss.length ? Math.min(...ss.map((s) => latestFinish(s.t) - s.t.dur - s.lag)) : end;
    lf.set(t.id, v);
    return v;
  };
  return new Map(tasks.map((t) => [t.id, latestFinish(t) - (t.start + t.dur)]));
}

/** The ids of the critical bars (no float). */
export function criticalIds(tasks: readonly Schedulable[]): Set<string> {
  const f = totalFloat(tasks);
  return new Set(tasks.filter((t) => Math.abs(f.get(t.id) ?? 1) <= EPS).map((t) => t.id));
}
