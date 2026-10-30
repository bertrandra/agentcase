/** @calc-zone foundation */
/** The skill vocabulary of the catalogues (read by the default process and by the team views). */
/** Compliance skills are first-class team skills (legacy REG_TEAM_SKILLS). */
export const REG_TEAM_SKILLS = ['Functional Safety', 'Clinical Affairs', 'Regulatory Affairs', 'Audit / Certification', 'Software Quality Assurance (SQA)'];
export const SKILLS_EXIST = ['Analysis/PO', 'Arch/Design', 'Dev', 'Test/QA', 'Ops/Run', 'Data', 'Sec/Quality', 'Lead', ...REG_TEAM_SKILLS];
/** Artefact skill label → team skill label (legacy SKILL_MAP default). */
export const SKILL_MAP_DEFAULT: Record<string, string> = {
  Analysis: 'Analysis/PO', 'Analysis/PO': 'Analysis/PO', PO: 'Analysis/PO', 'PO/Dev': 'Analysis/PO', 'PO/Lead': 'Analysis/PO', 'Dev/PO': 'Dev',
  Arch: 'Arch/Design', 'Arch/Dev': 'Arch/Design', 'Archi/Ops': 'Arch/Design', 'Test/Archi': 'Test/QA',
  Dev: 'Dev', 'Dev/Test': 'Dev', Lead: 'Lead', 'Lead/QA': 'Lead', 'Lead/Quality': 'Lead',
  Ops: 'Ops/Run', 'Ops/Dev': 'Ops/Run', 'Ops/Quality': 'Ops/Run', 'Ops/Run': 'Ops/Run', 'Data/Ops': 'Ops/Run',
  QA: 'Test/QA', 'Test/QA': 'Test/QA', 'Data/Test': 'Test/QA', Quality: 'Sec/Quality', Sec: 'Sec/Quality',
};
