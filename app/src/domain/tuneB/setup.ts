/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { programmeLines, type ProgrammeLineId } from '../programme/profile';

/** Engagement change cost (HRI): its owner is the programme cost profile (the change-management activity keeps its engine formula). */
export { convChangeCost } from '../programme/profile';

export type SetupLineId = ProgrammeLineId;
/**
 * One line of the setup: an activity of the transformation programme, priced by the programme's cost profile (`domain/programme/profile.ts`,
 * SPEC_BPMN § 19.3, phase B9b), whose description and parameters are held by the programme, not here. `input`: the euro input of a non-labour
 * line (tooling), null for a line derived from resources, a curve or an engine formula.
 */
export interface SetupLine { id: SetupLineId; label: string; input: string | null; amount: number; h1: string; h2: string }
const HINTS: Partial<Record<SetupLineId, [string, string]>> = {
  tooling: ['€20K', '€15K'], training: ['€15K', '€30K'], coaching: ['€10K', '€25K'], governance: ['€8K', '€12K'],
};
const CORE = new Set<SetupLineId>(['tooling', 'training', 'coaching', 'governance']);

/** The setup of a case: every component line, the four core lines' subtotal and the total. */
export interface SetupBreakdown {
  /** tooling, training, coaching, governance, the HRI change cost and the Knowledge hub setup when those modules are on, the opt-in activities on */
  lines: SetupLine[];
  /** sum of the four core lines (tooling + training + coaching + governance) */
  base: number;
  /** HRI change cost and Knowledge hub setup (0 when their module is off) */
  change: number; knowledge: number;
  /** the opt-in activities switched on (0 by default, D-B31) */
  optIn: number;
  /** the setup total: every line. The model reads it (`model().setupTotal`, the ROI denominator) and the engine spends it month by month */
  total: number;
}

/**
 * The one setup breakdown: the programme's cost lines in the euro result (`programmeLines`) and their total. The model's drivers read it
 * (`model().setupTotal` = `total`), and every table that prints setup lines and a total (Agentic Setup, Investment & Setup, the Excel workbooks, the
 * portfolio Setup view) reads it, so its lines add up to its total.
 */
export function setupBreakdown(c: Ctx): SetupBreakdown {
  const lines: SetupLine[] = programmeLines(c).map((l) => ({ id: l.id, label: l.label, input: l.id === 'tooling' ? 'setupTooling' : null,
    amount: l.amount, h1: HINTS[l.id]?.[0] ?? '—', h2: HINTS[l.id]?.[1] ?? '—' }));
  const sum = (f: (id: SetupLineId) => boolean) => lines.filter((l) => f(l.id)).reduce((a, l) => a + l.amount, 0);
  return { lines, base: sum((id) => CORE.has(id)), change: sum((id) => id === 'change'), knowledge: sum((id) => id === 'knowledge'),
    optIn: sum((id) => !CORE.has(id) && id !== 'change' && id !== 'knowledge'), total: sum(() => true) };
}

/** The line names of the Financial "Investment & Setup" table and the results workbook (legacy wording of the four core lines). */
export const INVESTMENT_LABEL: Partial<Record<SetupLineId, string>> = {
  tooling: 'Tooling & Infrastructure', training: 'Training', coaching: 'Coaching', governance: 'Governance', change: 'Change management (HRI)',
  knowledge: 'Knowledge hub setup',
};
/** The investment lines (label, amount) of a setup breakdown, in order: they add up to its total (an opt-in activity under its own name). */
export const investmentLines = (b: SetupBreakdown): [string, number][] => b.lines.map((l) => [INVESTMENT_LABEL[l.id] ?? l.label, l.amount]);

/** The amount of one line (0 when the line is not part of the case). */
export const setupLineAmount = (b: SetupBreakdown, id: SetupLineId): number => b.lines.find((l) => l.id === id)?.amount ?? 0;
