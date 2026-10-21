import type { Ctx } from '../ctx';

export interface SetupLine { id: 'tooling' | 'training' | 'coaching' | 'governance'; label: string; input: string; amount: number; h1: string; h2: string; text: string }
const LINES: Omit<SetupLine, 'amount'>[] = [
  { id: 'tooling', label: 'Tooling & infra', input: 'setupTooling', h1: '€20K', h2: '€15K', text: 'Claude API, monitoring, security, CI/CD' },
  { id: 'training', label: 'Training & change', input: 'setupTraining', h1: '€15K', h2: '€30K', text: 'Workshops, champion certification' },
  { id: 'coaching', label: 'Coaching', input: 'setupCoaching', h1: '€10K', h2: '€25K', text: 'Pair programming, deliverable review' },
  { id: 'governance', label: 'Governance', input: 'setupGov', h1: '€8K', h2: '€12K', text: 'Compliance audit, IP, agentic charter' },
];

/** The four editable setup lines and their total (legacy renderSetup; HRI change cost and hub setup are added by the model). */
export function setupBreakdown(c: Ctx): { lines: SetupLine[]; total: number } {
  const lines = LINES.map((l) => ({ ...l, amount: c.inp.p(l.input) }));
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
