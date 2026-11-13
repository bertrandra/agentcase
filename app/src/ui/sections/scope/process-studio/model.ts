import type { PhaseView } from '@/domain/process';
import { counted, type Row } from '../process/tableModel';

/**
 * What the 🗺️ Process studio reads from the process (pure): the figures of each phase, where each phase sits on the V of the map, and the lanes
 * of a phase in focus. Nothing here is a figure of the business case: the counts are the activities' scope marks, the effort their own points.
 */
export interface PhaseStat {
  id: string; name: string; on: boolean; total: number; inScope: number; effort: number; effortIn: number; agentIn: number;
}
export function phaseStats(phases: readonly PhaseView[], rows: readonly Row[]): PhaseStat[] {
  return phases.map((p) => {
    const mine = rows.filter((r) => r.phase === p.id), on = mine.filter(counted);
    return { id: p.id, name: p.name, on: p.inScope !== false, total: mine.length, inScope: on.length,
      effort: mine.reduce((t, r) => t + r.effort, 0), effortIn: on.reduce((t, r) => t + r.effort, 0), agentIn: on.filter((r) => r.type === 'Agent').length };
  });
}

/**
 * The map's layout: the `V<n>` phases on the V (down to the lowest, then up: row = min(n, k + 1 − n), column = n), the other phases on a rail —
 * those before the first V phase, then those after it — and the cross-cutting phase as a band under the V. A process without V phases has them all
 * on the rail.
 */
export interface MapLayout {
  v: { stat: PhaseStat; row: number; col: number }[]; before: PhaseStat[]; after: PhaseStat[]; band: PhaseStat[]; cols: number; rows: number;
}
const V = /^V(\d+)$/;
export function mapLayout(stats: readonly PhaseStat[]): MapLayout {
  const isBand = (s: PhaseStat) => /cross/i.test(s.id) || /cross-cutting/i.test(s.name);
  const vs = stats.filter((s) => V.test(s.id) && !isBand(s)), k = vs.reduce((m, s) => Math.max(m, Number(V.exec(s.id)![1])), 0);
  const firstV = stats.findIndex((s) => V.test(s.id));
  const rest = stats.filter((s) => !V.test(s.id) && !isBand(s));
  const before = firstV < 0 ? rest : rest.filter((s) => stats.indexOf(s) < firstV), after = firstV < 0 ? [] : rest.filter((s) => stats.indexOf(s) > firstV);
  return {
    v: vs.map((stat) => { const n = Number(V.exec(stat.id)![1]); return { stat, col: n, row: Math.min(n, k + 1 - n) }; }),
    before, after, band: stats.filter(isBand), cols: k, rows: Math.ceil(k / 2),
  };
}

/** A lane of the phase in focus: a role, or an agent, with the activity it does at each step (null: an empty cell). */
export interface Lane { id: string; name: string; kind: 'role' | 'agent'; cells: (Row | null)[] }
/**
 * The phase's activities in document (flow) order, one column each, on the lane of who does them: the agent for an agent task that names one, else
 * the Responsible role (the RACI's first R, else the activity's role). Out-of-scope activities only when asked.
 */
export function phaseLanes(rows: readonly Row[], phase: string, showOff: boolean,
  responsible: (id: string) => string | undefined): { acts: Row[]; lanes: Lane[] } {
  const acts = rows.filter((r) => r.phase === phase && (showOff || counted(r)));
  const lanes: Lane[] = [];
  acts.forEach((r, i) => {
    const agent = r.type === 'Agent' && r.agent ? r.agent : '', name = agent || responsible(r.id) || r.role || 'No role', kind = agent ? 'agent' : 'role';
    let lane = lanes.find((l) => l.name === name && l.kind === kind);
    if (!lane) { lane = { id: `${kind}:${name}`, name, kind, cells: [] }; lanes.push(lane); }
    lane.cells[i] = r;
  });
  for (const l of lanes) l.cells = acts.map((_, i) => l.cells[i] ?? null);
  return { acts, lanes: [...lanes.filter((l) => l.kind === 'role'), ...lanes.filter((l) => l.kind === 'agent')] };
}

export const AUTHORITIES = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous', 'Compliance'] as const;
