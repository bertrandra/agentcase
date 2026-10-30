/** @calc-zone process-model */
import type { ActivityView, ProcessView } from './readTypes';
import { TYPE_OF_TASK, type CatArtefact } from './types';

/**
 * Parameters of a task imported without `ac:` data (F-B8: "parameters to review"): taken from the case's activities of the same phase and type
 * (else of the phase, else of the whole process): mean effort and supervision split, the most frequent value class, AI authority and agent
 * capability. A foreign service task is an agent task only when the phase has an agent capability to give it; otherwise it is a human task.
 */
const mode = (xs: string[]): string | undefined => {
  const n = new Map<string, number>();
  for (const x of xs) if (x) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
};
const mean = (xs: number[], dflt: number): number => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : dflt);

export type ImportedArtefact = Omit<CatArtefact, 'id' | 'name' | 'deliverable'>;

export function activityDefaults(v: ProcessView, phase: string, element: string, role: string | undefined): ImportedArtefact {
  const sdlc = v.activities.filter((a) => !a.regulatory), inPhase = sdlc.filter((a) => a.phase === phase);
  const want = TYPE_OF_TASK[element] ?? 'Human', cap = mode(inPhase.filter((a) => a.type === 'Agent').map((a) => a.capability ?? ''));
  const type = want === 'Agent' && !cap ? 'Human' : want;
  const pool: ActivityView[] = [inPhase.filter((a) => a.type === type), inPhase, sdlc].find((xs) => xs.length) ?? [];
  const phaseRole = v.phases.find((p) => p.id === phase)?.role;
  const roleOf = new Map(v.actors.map((r) => [r.id, r.name]));
  const skill = role ?? mode(pool.map((a) => roleOf.get(a.humanPerformer ?? '') ?? '')) ?? phaseRole ?? 'Dev';
  const out: ImportedArtefact = {
    phase, skill, agentActivityType: type, value: mode(pool.map((a) => a.value)) ?? 'Medium', aiAuth: mode(pool.map((a) => a.aiAuthority)) ?? 'Assistance',
    effort: mean(pool.map((a) => a.effort), 1), humanSup: mean(pool.map((a) => a.human), 100), agentSup: mean(pool.map((a) => a.agent), 0),
  };
  if (type === 'Agent' && cap) out.capability = cap;
  return out;
}
