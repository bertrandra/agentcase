import { SKILLS_EXIST } from '@/domain/baseline/skills';

const ROLE: Record<string, string> = {
  'Functional Safety': 'Compliance (safety case)', 'Clinical Affairs': 'Compliance (clinical)', 'Regulatory Affairs': 'Compliance (regulatory)',
  'Audit / Certification': 'Compliance (audit)', 'Software Quality Assurance (SQA)': 'Compliance (SQA)', 'Analysis/PO': 'Dev (PO/analysis)',
  'Arch/Design': 'Dev (architecture)', Dev: 'Dev (production)', 'Test/QA': 'Dev (QA)', 'Ops/Run': 'Run', Data: 'Dev (data)', 'Sec/Quality': 'Supervision', Lead: 'Supervision',
};
const AGENTIC = ['AI/Agent Engineer', 'Skill/Prompt Engineer', 'Agent Supervisor', 'AI-FinOps', 'AI-QA'];

/** Read-only reference list of the team skills (collapsed by default). */
export function SkillsCatalogue() {
  const rows = [...SKILLS_EXIST.map((s) => ['Existing skill', s, ROLE[s] ?? '—']), ...AGENTIC.map((s) => ['Agentic skill', s, 'Agentic run'])];
  return (
    <details style={{ marginTop: '1.2rem' }}>
      <summary>Skills — catalogue (loaded reference) <small className="ac-muted">(click to expand)</small></summary>
      <table className="ac-table"><thead><tr><th>Category</th><th>Skill</th><th>Role in target</th></tr></thead>
        <tbody>{rows.map(([cat, skill, role]) => <tr key={skill}><td>{cat}</td><td><strong>{skill}</strong></td><td>{role}</td></tr>)}</tbody></table>
    </details>
  );
}
