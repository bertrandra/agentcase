/** @calc-zone delivery-views */
import { artTeamSkill, skillMapOf } from '../baseline/skills';
import type { Ctx } from '../ctx';
import { loopExternalReworkEffort } from '../model/loops';
import { caseLoopPairs, caseViews, customActors, isCustomActivity } from '../process/engineInputs';
import { readProcess } from '../process/read';
import { activeArtefacts } from '../scope';

/**
 * The process of a case as the outputs print it (spec F-B22, B5): one row per activity the engine reads (catalogue and custom), its actors and its
 * rework loops. Every value is the engine's own (working artefacts, selection, team-skill resolver, rework effort): no output recomputes one.
 */
export interface ProcessActivityRow {
  phase: string; id: string; name: string; type: string; custom: boolean; regulatory: boolean; inScope: boolean; role: string; teamSkill: string;
  agent: string; effort: number; w: number; value: string; aiAuth: string; humanSup: number; agentSup: number;
}
export interface ProcessActorRow { id: string; name: string; kind: string; teamSkill: string; capability: string; custom: boolean; activities: number }
export interface ProcessLoopRow {
  id: string; label: string; from: string; to: string; probability: number; costShare: number; addedW: number; boundary: boolean;
}
export interface ProcessSummary {
  activities: ProcessActivityRow[]; actors: ProcessActorRow[]; loops: ProcessLoopRow[];
  /** custom content: activities, actors and rework boundary events the catalogue does not hold (the outputs add their process pages only then) */
  custom: { activities: number; actors: number; reworks: number };
}

/** The process summary of a case (empty actor and boundary lists for a version 2 object without a document). */
export function processSummary(c: Ctx): ProcessSummary {
  const v = caseViews(c.s), doc = v ? readProcess(c.s.BPMN) : null, map = skillMapOf(c.s), on = new Set(activeArtefacts(c.a, c.s).map((a) => a.id));
  const names = new Map((doc?.actors ?? []).map((a) => [a.id, a.name])), byId = new Map((doc?.activities ?? []).map((a) => [a.id, a]));
  const activities = [...c.a.sdlc, ...c.a.reg].map((a): ProcessActivityRow => {
    const p = byId.get(a.id), x = a as typeof a & { agentActivityType?: string };
    return {
      phase: a.phase, id: a.id, name: a.name, type: x.agentActivityType ?? 'Human', custom: isCustomActivity(a.id), regulatory: !!a.isReg,
      inScope: on.has(a.id), role: names.get(p?.humanPerformer ?? '') ?? a.skill, teamSkill: artTeamSkill(a, map), agent: names.get(p?.performer ?? '') ?? '',
      effort: +a.effort || 0, w: +a.w || 0, value: a.value, aiAuth: a.aiAuth, humanSup: a.humanSup, agentSup: a.agentSup,
    };
  });
  const custom = new Set(customActors(c.s).map((a) => a.id)), uses = (id: string) => (doc?.activities ?? []).filter((a) =>
    a.performer === id || a.humanPerformer === id).length;
  const actors = (doc?.actors ?? []).map((a): ProcessActorRow => ({ id: a.id, name: a.name, kind: a.kind, teamSkill: a.teamSkill ?? '',
    capability: a.capability ?? '', custom: custom.has(a.id), activities: uses(a.id) }));
  const added = new Map(loopExternalReworkEffort(c).map((l) => [l.id, l.rawAddedW])), boundary = new Set((doc?.reworks ?? []).map((b) => b.pair ?? b.id));
  const loops = caseLoopPairs(c.s).map((l): ProcessLoopRow => ({ id: l.id, label: l.label, from: l.extFrom ?? '', to: l.extTo ?? '',
    probability: l.extReworkPct, costShare: l.extCostShare, addedW: added.get(l.id) ?? 0, boundary: boundary.has(l.id) }));
  return { activities, actors, loops, custom: { activities: activities.filter((a) => a.custom).length, actors: custom.size, reworks: boundary.size } };
}

/** True when the case's process holds anything the catalogue does not (the outputs then add their process pages; else they stay the legacy ones). */
export const hasCustomProcess = (p: ProcessSummary): boolean => p.custom.activities + p.custom.actors + p.custom.reworks > 0;
