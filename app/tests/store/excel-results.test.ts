import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { makeCtx } from '@/domain';
import { economicsView } from '@/domain/economics';
import { investmentLines, setupBreakdown } from '@/domain/tuneB/setup';
import { appStore } from '@/store/instance';
import { f1, r0 } from '@/store/persistence/excel/results/style';
import { dumpBuffer, loadCase, readJson, sheetDiffs, type SheetDump } from '../helpers/xlsxDump';
import { THEME_DEFAULT } from '@/domain/theme';

// Fixtures recorded by tools/excel-results-oracle.mjs: the LEGACY "Export financial to Excel" of each case, dumped cell by cell.
const IDS = ['golden', 'ctx-msi', 'curve-logistic', 'curve-gompertz', 'curve-bass', 'industry-med', 'horizon-1', 'horizon-5', 'econ-horizon-7', 'horizon-10',
  'scope-reduced', 'hri-on', 'vtax-on', 'kh-high', 'econ-no-setup', 'econ-roi-low', 'econ-roi-mid'];

/**
 * The legacy workbook with the owners' figures: DEV-SETUP-BREAKDOWN (the Investment sheet lists the HRI change cost and the hub setup before its unchanged
 * total, so the lines add up to it) and DEV-FTE-ONE-DEF (the Savings sheet "Human FTE freed" is the FTE owner's: delivery + agentic run team).
 */
function ownersShown(legacy: SheetDump[]): SheetDump[] {
  const c = makeCtx(appStore().getState().doc), v = economicsView(c), extra = investmentLines(setupBreakdown(c)).slice(4), pad = v.years.slice(1).map(() => 0);
  return legacy.map((s) => {
    if (s.name === 'Investment') {
      const rows = [...s.rows.slice(0, -1), ...extra.map(([l, x]) => [l, r0(x), ...pad, r0(x)]), s.rows.at(-1)!];
      return { ...s, rows, rowCount: rows.length };
    }
    if (s.name === 'Savings') return { ...s, rows: s.rows.map((r) => (r[0] === 'Human FTE freed' ? [r[0], ...v.freed.map(f1)] : r)) };
    return s;
  });
}

describe('results workbook reproduces the legacy export', () => {
  it.each(IDS)('%s: same sheets, headers and numbers', async (id) => {
    loadCase(id);
    const { blob, filename } = await exportResultsWorkbook();
    expect(filename).toMatch(/^AgentCase_v[\w-]+_Financial_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$/);
    expect(sheetDiffs(ownersShown(readJson<SheetDump[]>(`fixtures/xlsx-results/${id}.json`)), await dumpBuffer(await blob.arrayBuffer()))).toEqual([]);
  });
  it('has the six legacy sheets in order', async () => {
    loadCase('golden');
    expect((await dumpBuffer(await (await exportResultsWorkbook()).blob.arrayBuffer())).map((s) => s.name))
      .toEqual(['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift']);
  });
  it('embeds a chart picture only where one was captured, and survives a broken one', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    loadCase('golden');
    const X = await loadExcelJS(), data = resultsData(makeCtx((await import('@/store/instance')).appStore().getState().doc));
    const wb = buildResultsWorkbook(X, data, THEME_DEFAULT, { ROI: png, 'P&L': '@@not-base64@@' });
    expect(wb.getWorksheet('ROI')!.getImages().length).toBe(1);
    expect(wb.getWorksheet('Savings')!.getImages().length).toBe(0);
    await expect(wb.xlsx.writeBuffer()).resolves.toBeDefined();
  });
});
