/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import type { CostModel } from '@/domain/portfolio';
import type { ExcelJS } from '../lazy';
import { withPrint } from '../print';
import type { ThemeValues } from '@/domain/theme';
import { writeParams, writeRateBlocks } from './blocks';
import { formulaText } from './formulas';
import { writeHeader, writeTable, type Meta } from './layout';

export type { Meta } from './layout';
export const SHEETS = ['Values', 'Rate cards', 'Other costs'] as const;

const NOTES = {
  values:
    'Days = human FTE of the month x working days per year / 12, spread over the AS-IS team lines in proportion to their FTE. Days x applied rate (Rate ' +
      'cards) + other cost lines (Other costs) = the app cost. Subtotals are formulas.',
  rates:
    'Applied rate = day rate of the line grade and location (rate card). The engine prices the TO-BE team at ONE blended target rate: the Blending ' +
      'adjustment row makes the totals tie. Team cost = SUMPRODUCT(days, rates) + adjustment; Difference = 0.',
  other: 'TOTAL TO-BE COST = team cost (days x rate, from Rate cards) + the lines below (savings negative). '
    + 'The pilot (Program & Completeness sizing, spread from the product month 1) is included in the totals; '
    + 'the app headline does not count it (setup and run cost exclude the pilot), so the check row is the engine total plus the pilot. Parameters are ' +
      'listed under the table.',
};

/**
 * The cost-model workbook: exactly three sheets, in order, "Values" (days), "Rate cards" (applied day rates and the team-cost check) and "Other costs"
 * (every other cost line, the total and the parameters). Subtotals, checks, links between the sheets and the discount factors are live Excel formulas
 * with their cached results; no external link, no macro. `print`: the base theme of the export (controllers/exportTheme.ts).
 */
export function buildCostModelWorkbook(xl: ExcelJS, m: CostModel, meta: Meta, print: Readonly<ThemeValues>): Workbook {
  const wb = withPrint(new xl.Workbook(), print);
  wb.creator = 'AgentCase'; wb.created = meta.generated;
  const values = wb.addWorksheet(SHEETS[0]), rates = wb.addWorksheet(SHEETS[1]), other = wb.addWorksheet(SHEETS[2]);
  const anchors = { mixStart: 0, rateRow: 0 };
  writeHeader(values, m, meta, 'Values (days)', NOTES.values);
  writeTable(values, m, m.values, [10, 11, 14, 22, 26, 10, 12], (r, c, n) => formulaText(r.f!, c, n, anchors));
  writeHeader(rates, m, meta, 'Rate cards', NOTES.rates);
  anchors.mixStart = writeRateBlocks(rates, m);
  writeTable(rates, m, m.rates, [10, 11, 14, 22, 52, 10, 12], (r, c, n) => formulaText(r.f!, c, n, anchors));
  writeHeader(other, m, meta, 'Other costs', NOTES.other);
  anchors.rateRow = writeParams(other, m);
  writeTable(other, m, m.other, [10, 11, 14, 22, 58, 44, 12], (r, c, n) => formulaText(r.f!, c, n, anchors));
  return wb;
}
