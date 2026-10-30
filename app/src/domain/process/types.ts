/** @calc-zone process-model */
import type { Artefact, LoopPair, Phase } from '../types/catalog';
import type { ArtefactEdit } from '../types/state';

/** A catalogue artefact with every field the JSON catalogues carry (the engine sees these objects as they are). */
export interface CatArtefact extends Artefact {
  _agent0?: number; w?: number; capability?: string; agentActivityType?: string; storyId?: string | null; purpose?: string; teamSkill?: string;
}
export interface Norm { industry: string; name: string; count: number; body?: string; scope?: string }
export interface CatLoopPair extends Omit<LoopPair, 'extFrom' | 'extTo'> {
  artA: string; artB: string; internalNote?: string; extFrom?: string | null; extTo?: string | null;
}
export type CatPhase = Phase & { featureIds?: unknown[] };

/** What the default process is built from (today's catalogues, spec § 3). */
export interface ProcessCatalogue {
  phases: CatPhase[]; crossCutting: Phase; sdlc: CatArtefact[]; reg: CatArtefact[]; norms: Norm[]; loops: CatLoopPair[];
  /** artefact skill → team skill (legacy SKILL_MAP default) */
  skillMap: Record<string, string>;
  /** team-skill order of the diagram lanes */
  laneOrder: string[];
}

/** BPMN element of each AgentCase activity type (spec § 4.2). */
export const TASK_OF_TYPE: Record<string, string> = { Human: 'userTask', Manual: 'manualTask', Agent: 'serviceTask', Review: 'userTask',
  Script: 'scriptTask', Send: 'sendTask', Receive: 'receiveTask', BusinessRule: 'businessRuleTask' };
/** The type a task kind gives (F-B53, B5b): a script task is already automated (D-B23: no AI saving), send / receive tasks are hand-offs. */
export const TYPE_OF_TASK: Record<string, string> = { userTask: 'Human', manualTask: 'Manual', serviceTask: 'Agent', scriptTask: 'Script',
  sendTask: 'Send', receiveTask: 'Receive', businessRuleTask: 'BusinessRule' };
export const CROSS_ID = 'Cross-cutting';

/** The version 2 case keys the process document replaces (spec § 3, § 6.2): what `processFromCase` reads and `viewsOf` gives back. */
export interface ScopeKeys {
  selectedArtefacts: string[]; artefactsEdited: ArtefactEdit[]; selectedRegArtefacts: string[]; regArtefactsEdited: ArtefactEdit[];
  phaseOff: string[]; selectedNorms: string[]; phaseSeq?: { id: string; seq: number | null }[]; regInclude: boolean;
  skillMap?: Record<string, string>;
}
export const EDIT_FIELDS = ['agentSup', 'humanSup', 'effort', 'seq'] as const;
