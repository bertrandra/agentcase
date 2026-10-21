/** AI Readiness Index: 10 dimensions x 3 statements, answered No (0) / Partial (50) / Yes (100) or left blank (null). */
export interface ReadinessDim { key: string; label: string; q: [string, string, string] }
export type ReadinessAns = Record<string, (number | null)[]>

export const READINESS_DIMS: ReadinessDim[] = [
  { key: 'doc', label: 'Documentation', q: ['Requirements, designs and APIs are documented in a consistent, discoverable format', 'Documentation is kept current with code changes (docs-as-code / reviews)', 'Domain knowledge is captured rather than held by individuals'] },
  { key: 'proc', label: 'Process Maturity', q: ['Engineering processes are defined, repeatable and not ad-hoc', 'Delivery metrics are tracked (lead time, throughput, defect rates)', 'Retrospectives and continuous improvement are embedded'] },
  { key: 'devops', label: 'DevOps', q: ['CI/CD is automated for build, test and deployment', 'Environments are provisioned as code (IaC)', 'Release frequency is high with automated rollback'] },
  { key: 'cloud', label: 'Cloud', q: ['Workloads run on cloud / containerized platforms', 'Infrastructure is elastic and consumption-based', 'Cloud cost and resource usage are actively managed (FinOps)'] },
  { key: 'sec', label: 'Security', q: ['Security is integrated in the SDLC (SAST/DAST, secure coding)', 'Secrets, identities and access are centrally managed', 'Vulnerability management and incident response are in place'] },
  { key: 'data', label: 'Data Quality', q: ['Data is cataloged, owned and governed', 'Data quality is measured and monitored', 'Data is accessible and well-structured for automation/AI'] },
  { key: 'gov', label: 'Governance', q: ['Decision rights, standards and compliance controls are defined', 'There is oversight for AI/tooling adoption and risk', 'Policies are enforced and auditable'] },
  { key: 'sdlc', label: 'SDLC', q: ['The software lifecycle is standardized across teams', 'Artifacts are version-controlled and traceable end-to-end', 'Testing is automated across levels (unit → system)'] },
  { key: 'arch', label: 'Architecture', q: ['The architecture is modular, documented and standardized', 'Interfaces/APIs are well-defined and reusable', 'Technical debt is visible and actively managed'] },
  { key: 'skills', label: 'Skills', q: ['Teams have AI / agentic tooling literacy', 'A training / enablement path is in place', 'Champions / change agents are identified'] },
];

/** A blank questionnaire (legacy initial state). */
export const blankReadiness = (): ReadinessAns => Object.fromEntries(READINESS_DIMS.map((d) => [d.key, [null, null, null]]));

/** Average of the answered statements of a dimension (null when none is answered). */
export function dimScore(ans: ReadinessAns, key: string): number | null {
  const a = (ans[key] ?? []).filter((v): v is number => v != null);
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
}

/** Average of the scored dimensions (equal weight), null when nothing is answered. */
export function readinessIndex(ans: ReadinessAns): number | null {
  const scores = READINESS_DIMS.map((d) => dimScore(ans, d.key)).filter((v): v is number => v != null);
  return scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
}

export interface Band { label: string; color: string }
export function readinessBand(idx: number | null): Band {
  if (idx == null) return { label: 'Not assessed', color: '#8A94A6' };
  if (idx <= 20) return { label: 'Nascent', color: '#8F3237' };
  if (idx <= 40) return { label: 'Emerging', color: '#BE4D00' };
  if (idx <= 60) return { label: 'Developing', color: '#1DB8F2' };
  if (idx <= 80) return { label: 'Established', color: '#4e8f2e' };
  return { label: 'Leading', color: '#00828E' };
}

export interface DimRow { key: string; label: string; score: number | null; band: Band }
export const dimRows = (ans: ReadinessAns): DimRow[] =>
  READINESS_DIMS.map((d) => { const score = dimScore(ans, d.key); return { key: d.key, label: d.label, score, band: readinessBand(score) }; });

/** "Documentation (12), …" — the three weakest scored dimensions (null when nothing is scored). */
export function weakestDims(ans: ReadinessAns, n = 3): string | null {
  const scored = dimRows(ans).filter((r) => r.score != null).sort((a, b) => (a.score as number) - (b.score as number));
  return scored.length ? scored.slice(0, n).map((r) => `${r.label} (${Math.round(r.score as number)})`).join(', ') : null;
}
