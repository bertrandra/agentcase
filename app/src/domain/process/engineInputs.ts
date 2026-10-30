/** @calc-zone process-model */
import { LOOP_PAIRS } from '../catalog';
import { SKILL_MAP_DEFAULT } from '../catalog/skills';
import { catalogueProcess } from './defaultProcess';
import { readProcess } from './read';
import type { ActivityView, ActorView } from './readTypes';
import type { CatLoopPair } from './types';
import { viewsOf, type ProcessViews } from './views';
import type { XDocument } from './xml';

/**
 * The engine's inputs read from the case's process (spec § 7 phase 2, B5): one owner, `domain/process`. Every activity of the document (catalogue
 * or custom, F-B18) enters the per-activity computations with its own parameters; the rework loops come from the model (D-B20); a custom role
 * maps to its team skill and a custom agent joins the agent directory. A case without a document (a version 2 object handed to the engine by a
 * test or a tool) reads the catalogues, as before schema v3.
 */
type WithDoc = { BPMN?: XDocument };

/** The views of the case's document, or null for a version 2 object. */
export function caseViews(s: WithDoc): ProcessViews | null {
  const d = s.BPMN as unknown;
  return d && typeof d === 'object' ? viewsOf(d as XDocument) : null;
}

/** The rework loops of the case (back flows, or the error boundary events that replace them). */
export const caseLoopPairs = (s: WithDoc): CatLoopPair[] => caseViews(s)?.loopPairs ?? (LOOP_PAIRS as CatLoopPair[]);

type Ids = { acts: Set<string>; actors: Set<string> };
const catalogueIds = new WeakMap<XDocument, Ids>();
/** The activity and actor ids of the shipped catalogue process. */
const catalogue = (): Ids => {
  const d = catalogueProcess();
  let ids = catalogueIds.get(d);
  if (!ids) {
    const v = readProcess(d);
    ids = { acts: new Set(v.activities.map((a) => a.id)), actors: new Set(v.actors.map((a) => a.id)) };
    catalogueIds.set(d, ids);
  }
  return ids;
};
/** True for an activity id the shipped catalogue does not hold (a custom activity, F-B18). */
export const isCustomActivity = (id: string): boolean => !catalogue().acts.has(id);

/** The actors of the case's process the catalogue does not hold (custom roles and agents). */
export function customActors(s: WithDoc): ActorView[] {
  const d = s.BPMN as unknown;
  if (!d || typeof d !== 'object') return [];
  return readProcess(d as XDocument).actors.filter((a) => !catalogue().actors.has(a.id));
}

/**
 * The role → team-skill map of the case: its own (legacy `skillMap`) or the default, plus each custom role the map does not name (its
 * `ac:actor teamSkill`), so an activity performed by a custom role is staffed by that team skill.
 */
export function caseSkillMap(s: WithDoc, own: Record<string, string> | undefined): Record<string, string> {
  const base = own ?? SKILL_MAP_DEFAULT, extra = customActors(s).filter((a) => a.kind === 'role' && a.teamSkill && !Object.hasOwn(base, a.name));
  return extra.length ? { ...Object.fromEntries(extra.map((a) => [a.name, a.teamSkill as string])), ...base } : base;
}

/** The activities a custom agent performs (`performer` → the agent resource), in document order. */
export function activitiesOfActor(s: WithDoc, actorId: string): ActivityView[] {
  const d = s.BPMN as unknown;
  if (!d || typeof d !== 'object') return [];
  return readProcess(d as XDocument).activities.filter((a) => a.performer === actorId);
}
