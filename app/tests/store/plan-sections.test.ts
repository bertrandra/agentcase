import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { criticalReport } from '@/controllers/report';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { PLAN_SHEET_NAMES } from '@/store/persistence/excel/results/plan';
import { currentPlanViews } from '@/store/planHooks';
import { loadFixture } from '../helpers/fixtures';
import { fourProducts } from '../helpers/portfolioFixtures';

/**
 * SPEC_FIXES FX-D15: the 📅 Plan sheets and pages are optional sections of the Financial workbook and of the report; off (the default), both are
 * the exports as before.
 */
const NOW = new Date('2026-10-22T10:00:00Z');
const sheets = async (plan: boolean): Promise<string[]> => {
  const out = await exportResultsWorkbook(undefined, NOW, undefined, { plan }), wb = new (await loadExcelJS()).Workbook();
  await wb.xlsx.load(await out.blob.arrayBuffer());
  return wb.worksheets.map((w) => w.name);
};

describe('plan as an optional section (FX-D15)', () => {
  it('the Financial workbook of a case gets the five plan sheets after its own, only when asked', async () => {
    loadFixture('industry-med');
    const off = await sheets(false), on = await sheets(true);
    expect(off.some((n) => (PLAN_SHEET_NAMES as readonly string[]).includes(n))).toBe(false);
    expect(on).toEqual([...off, ...PLAN_SHEET_NAMES]);
  });
  it('the portfolio workbook too', async () => {
    fourProducts();
    const off = await sheets(false), on = await sheets(true);
    expect(on).toEqual([...off, ...PLAN_SHEET_NAMES]);
  });
  it('the report gets the plan pages before its end, only when asked; the plan is the Plan screen\'s', () => {
    loadFixture('industry-med');
    const off = criticalReport(NOW), on = criticalReport(NOW, undefined, undefined, { plan: true });
    if (!off.ok || !on.ok) throw new Error('report refused');
    expect(off.html).not.toContain('Transformation programme plan');
    expect(on.html).toContain('Transformation programme plan');
    expect(on.html.endsWith(off.html.slice(off.html.lastIndexOf('</body>')))).toBe(true);
    for (const d of currentPlanViews().dictionary.slice(0, 3)) expect(on.html).toContain(d.code);
  });
});
