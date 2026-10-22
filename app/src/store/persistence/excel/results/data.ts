/** @calc-zone exports */
import type { Ctx } from '@/domain';
import { economicsView, type EconomicsView } from '@/domain/economics';

/** The one-time investment lines of the Financial tab, in the legacy order (label, input id). */
export const SETUP_LINES: [string, string][] = [['Tooling & Infrastructure', 'setupTooling'], ['Training', 'setupTraining'], ['Coaching', 'setupCoaching'], ['Governance', 'setupGov']];

/** Everything the results workbook reads: the money view of the case plus the setup lines. Pure data, no formatting. */
export interface ResultsData { v: EconomicsView; setupLines: [string, number][] }

/** Sheets that may carry a chart picture (when a Chart.js canvas is mounted). */
export type ImageKey = 'ROI' | 'Operating costs' | 'Savings' | 'P&L' | 'Workforce shift';
/** Base64 PNG (no `data:` prefix) per sheet. */
export type SheetImages = Partial<Record<ImageKey, string>>;

export function resultsData(c: Ctx, v: EconomicsView = economicsView(c)): ResultsData {
  return { v, setupLines: SETUP_LINES.map(([label, id]) => [label, c.inp.p(id)]) };
}
