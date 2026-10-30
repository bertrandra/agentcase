/** @calc-zone rate-card-team */
import type { CaseState } from '../types/state';
import type { Artefact } from '../types/catalog';
import { caseSkillMap } from '../process/engineInputs';
import { scopeOf } from '../process/scope';

export { REG_TEAM_SKILLS, SKILL_MAP_DEFAULT, SKILLS_EXIST } from '../catalog/skills';

export const GRADES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'F'];
export const BANDS: [string, string][] = [['A', 'A — Junior'], ['B', 'B — Mid'], ['C', 'C — Senior'], ['D', 'D — Expert/Lead'], ['F', 'F — Out-of-class']];

/** Grade/location a skill is staffed at when a new auto line is added for it. */
export const SKILL_DEFAULT_GL: Record<string, [string, string]> = {
  'Functional Safety': ['C2', 'France'], 'Clinical Affairs': ['C2', 'France'], 'Regulatory Affairs': ['C1', 'France'],
  'Audit / Certification': ['C2', 'France'], 'Software Quality Assurance (SQA)': ['C1', 'France'],
};
export const defaultGradeLoc = (skill: string): [string, string] => SKILL_DEFAULT_GL[skill] ?? ['C1', 'France'];

/** The case's skill map (the role → team-skill map of its process document, legacy `skillMap`), falling back to the default; custom roles included. */
export const skillMapOf = (s: CaseState): Record<string, string> => caseSkillMap(s, scopeOf(s).skillMap);

/** THE resolver: every artefact maps to exactly one team skill (regulatory ones through their industry). */
export function artTeamSkill(a: Artefact & { teamSkill?: string }, map: Record<string, string>): string {
  if (a.isReg) return a.teamSkill || 'Regulatory Affairs';
  return map[a.skill] || a.skill;
}
