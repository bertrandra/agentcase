/** @calc-zone rate-card-team */
import type { CaseState } from '../types/state';
import type { Artefact } from '../types/catalog';

/** Compliance skills are first-class team skills (legacy REG_TEAM_SKILLS). */
export const REG_TEAM_SKILLS = ['Functional Safety', 'Clinical Affairs', 'Regulatory Affairs', 'Audit / Certification', 'Software Quality Assurance (SQA)'];
export const SKILLS_EXIST = ['Analysis/PO', 'Arch/Design', 'Dev', 'Test/QA', 'Ops/Run', 'Data', 'Sec/Quality', 'Lead', ...REG_TEAM_SKILLS];
export const GRADES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'F'];
export const BANDS: [string, string][] = [['A', 'A — Junior'], ['B', 'B — Mid'], ['C', 'C — Senior'], ['D', 'D — Expert/Lead'], ['F', 'F — Out-of-class']];

/** Grade/location a skill is staffed at when a new auto line is added for it. */
export const SKILL_DEFAULT_GL: Record<string, [string, string]> = {
  'Functional Safety': ['C2', 'France'], 'Clinical Affairs': ['C2', 'France'], 'Regulatory Affairs': ['C1', 'France'],
  'Audit / Certification': ['C2', 'France'], 'Software Quality Assurance (SQA)': ['C1', 'France'],
};
export const defaultGradeLoc = (skill: string): [string, string] => SKILL_DEFAULT_GL[skill] ?? ['C1', 'France'];

/** Artefact skill label → team skill label (legacy SKILL_MAP default). */
export const SKILL_MAP_DEFAULT: Record<string, string> = {
  Analysis: 'Analysis/PO', 'Analysis/PO': 'Analysis/PO', PO: 'Analysis/PO', 'PO/Dev': 'Analysis/PO', 'PO/Lead': 'Analysis/PO', 'Dev/PO': 'Dev',
  Arch: 'Arch/Design', 'Arch/Dev': 'Arch/Design', 'Archi/Ops': 'Arch/Design', 'Test/Archi': 'Test/QA',
  Dev: 'Dev', 'Dev/Test': 'Dev', Lead: 'Lead', 'Lead/QA': 'Lead', 'Lead/Quality': 'Lead',
  Ops: 'Ops/Run', 'Ops/Dev': 'Ops/Run', 'Ops/Quality': 'Ops/Run', 'Ops/Run': 'Ops/Run', 'Data/Ops': 'Ops/Run',
  QA: 'Test/QA', 'Test/QA': 'Test/QA', 'Data/Test': 'Test/QA', Quality: 'Sec/Quality', Sec: 'Sec/Quality',
};

/** The case's skill map (persisted as `skillMap`), falling back to the default. */
export const skillMapOf = (s: CaseState): Record<string, string> => {
  const m = (s as unknown as { skillMap?: Record<string, string> }).skillMap;
  return m && typeof m === 'object' ? m : SKILL_MAP_DEFAULT;
};

/** THE resolver: every artefact maps to exactly one team skill (regulatory ones through their industry). */
export function artTeamSkill(a: Artefact & { teamSkill?: string }, map: Record<string, string>): string {
  if (a.isReg) return a.teamSkill || 'Regulatory Affairs';
  return map[a.skill] || a.skill;
}
