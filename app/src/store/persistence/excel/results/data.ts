/** @calc-zone exports */
import type { Ctx } from '@/domain';
import { economicsView, type EconomicsView } from '@/domain/economics';
import { processSummary, type ProcessSummary } from '@/domain/verifyA/processSummary';
import { investmentLines, setupBreakdown } from '@/domain/tuneB/setup';
import { evalDay, type EvalDate } from '@/domain/model/evidenceTiers';
import { resultsAudit, type ResultsAudit } from './audit';

/**
 * Everything the results workbook reads: the money view of the case plus the setup lines (`setupBreakdown`: they add up to `v.setup`) and the
 * process the engine read (`processSummary`, its Process sheet).
 */
export interface ResultsData {
  v: EconomicsView; setupLines: [string, number][]; process: ProcessSummary;
  /** the case's audit (B7: Audit and Tooling sheets), absent or null when it holds none */
  audit?: ResultsAudit | null;
}

/** Sheets that may carry a chart picture (when a Chart.js canvas is mounted). */
export type ImageKey = 'ROI' | 'Operating costs' | 'Savings' | 'P&L' | 'Workforce shift';
/** Base64 PNG (no `data:` prefix) per sheet. */
export type SheetImages = Partial<Record<ImageKey, string>>;

/** `now`: the evaluation date of the audit's evidence-ledger block (the export day). */
export function resultsData(c: Ctx, v: EconomicsView = economicsView(c), now: EvalDate = evalDay(new Date())): ResultsData {
  return { v, setupLines: investmentLines(setupBreakdown(c)), process: processSummary(c), audit: resultsAudit(c.s.BPMN, now) };
}
