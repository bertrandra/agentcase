/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { hriCostPerFTE, hriEnabled } from '../engagement';
import { khEnabled, khSetupCost } from '../knowledge';
import { teamInCost } from '../location';

/** Engagement change cost (HRI): entry headcount x cost per FTE of the readiness intensity, 0 when the HRI module is off. Part of the setup. */
export const convChangeCost = (c: Ctx): number => (hriEnabled(c) ? teamInCost(c.s, c.inp).etp * hriCostPerFTE(c) : 0);

export type SetupLineId = 'tooling' | 'training' | 'coaching' | 'governance' | 'change' | 'knowledge';
/**
 * One line of the setup: an editable input line, or a line the model adds (`input` null). Each line is an activity of the transformation
 * programme, whose description is held by the programme (`domain/programme/catalogue.ts`, SPEC_BPMN § 19.7; phase B9a), not here.
 */
export interface SetupLine { id: SetupLineId; label: string; input: string | null; amount: number; h1: string; h2: string }
const LINES: Omit<SetupLine, 'amount'>[] = [
  { id: 'tooling', label: 'Tooling & infra', input: 'setupTooling', h1: '€20K', h2: '€15K' },
  { id: 'training', label: 'Training & change', input: 'setupTraining', h1: '€15K', h2: '€30K' },
  { id: 'coaching', label: 'Coaching', input: 'setupCoaching', h1: '€10K', h2: '€25K' },
  { id: 'governance', label: 'Governance', input: 'setupGov', h1: '€8K', h2: '€12K' },
];
const CHANGE: Omit<SetupLine, 'amount'> = { id: 'change', label: 'Change management (HRI)', input: null, h1: '—', h2: '—' };
const KNOWLEDGE: Omit<SetupLine, 'amount'> = { id: 'knowledge', label: 'Knowledge hub setup', input: null, h1: '—', h2: '—' };

/** The setup of a case: every component line, the four editable lines' subtotal and the total. */
export interface SetupBreakdown {
  /** the four editable lines, then the HRI change cost and the Knowledge hub setup when those modules are on */
  lines: SetupLine[];
  /** sum of the four editable lines (tooling + training + coaching + governance) */
  base: number;
  /** HRI change cost and Knowledge hub setup (0 when their module is off) */
  change: number; knowledge: number;
  /** the setup total: base + change + knowledge. The model reads it (`model().setupTotal`, the ROI denominator), so the lines add up to it */
  total: number;
}

/**
 * The one setup breakdown: the four editable lines, the HRI change cost and the Knowledge hub setup (when those modules are on), and their total.
 * The model's drivers read it (`model().setupTotal` = `total`), and every table that prints setup lines and a total (Agentic Setup, Investment &
 * Setup, the Excel workbooks, the portfolio Setup view) reads it, so its lines add up to its total.
 */
export function setupBreakdown(c: Ctx): SetupBreakdown {
  const inputs = LINES.map((l) => ({ ...l, amount: c.inp.p(l.input as string) }));
  const base = inputs.reduce((s, l) => s + l.amount, 0), change = convChangeCost(c), knowledge = khSetupCost(c);
  const lines: SetupLine[] = [...inputs, ...(hriEnabled(c) ? [{ ...CHANGE, amount: change }] : []),
    ...(khEnabled(c) ? [{ ...KNOWLEDGE, amount: knowledge }] : [])];
  return { lines, base, change, knowledge, total: base + change + knowledge };
}

/** The line names of the Financial "Investment & Setup" table and the results workbook (legacy wording of the four editable lines). */
export const INVESTMENT_LABEL: Record<SetupLineId, string> = {
  tooling: 'Tooling & Infrastructure', training: 'Training', coaching: 'Coaching', governance: 'Governance', change: 'Change management (HRI)',
  knowledge: 'Knowledge hub setup',
};
/** The investment lines (label, amount) of a setup breakdown, in order: they add up to its total. */
export const investmentLines = (b: SetupBreakdown): [string, number][] => b.lines.map((l) => [INVESTMENT_LABEL[l.id], l.amount]);

/** The amount of one line (0 when the line is not part of the case). */
export const setupLineAmount = (b: SetupBreakdown, id: SetupLineId): number => b.lines.find((l) => l.id === id)?.amount ?? 0;
