/** @calc-zone exports */
import type { Ctx } from '@/domain';
import { economicsView, type EconomicsView } from '@/domain/economics';
import { investmentLines, setupBreakdown } from '@/domain/tuneB/setup';

/** Everything the results workbook reads: the money view of the case plus the setup lines (`setupBreakdown`: they add up to `v.setup`). */
export interface ResultsData { v: EconomicsView; setupLines: [string, number][] }

/** Sheets that may carry a chart picture (when a Chart.js canvas is mounted). */
export type ImageKey = 'ROI' | 'Operating costs' | 'Savings' | 'P&L' | 'Workforce shift';
/** Base64 PNG (no `data:` prefix) per sheet. */
export type SheetImages = Partial<Record<ImageKey, string>>;

export function resultsData(c: Ctx, v: EconomicsView = economicsView(c)): ResultsData {
  return { v, setupLines: investmentLines(setupBreakdown(c)) };
}
