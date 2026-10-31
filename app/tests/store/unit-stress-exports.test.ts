import { beforeEach, describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { pfDecision, selectionStress, type GroupScope } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { pfSimStore } from '@/store/portfolioSimulation';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { portfolioReportData } from '@/store/persistence/report/portfolio/data';
import { renderStress } from '@/store/persistence/report/portfolio/stress';
import { unitTreeThree } from '../helpers/unitScope';
import { rows } from '../helpers/xlsxRows';

/** F-B83 / D-B40 (phase B10d): the report's stress section and the results workbook under a Unit scope. */
const unit = (id: string): GroupScope => ({ kind: 'unit', id });
const NOW = new Date('2026-10-31T10:00:00Z');
beforeEach(() => { pfSimStore.setState({ run: null, progress: null, params: null }); });

describe('report and results workbook per unit', () => {
  it('the report\'s stress section speaks for the unit; the workbook leads with "Unit <name>" and the unit\'s verdict', async () => {
    const { pf } = unitTreeThree();
    await runPortfolioSimulation({ draws: 150, seed: 2 });
    const run = pfSimStore.getState().run!, d = pfDecision(pf(), run, unit('bu'))!, sel = selectionStress(run, unit('bu'), pf())!;
    const data = portfolioReportData(pf(), unit('bu'), NOW, { run, stale: false })!;
    expect(data.stress!.stats).toEqual(sel.stats); expect(data.stress!.verdict).toEqual({ verdict: d.verdict, confidence: d.confidence });
    expect(data.stress!.reduction).toBe(sel.diversification.reduction); expect(data.stress!.waves).toEqual([]);
    expect(data.stress!.products.map((p) => p.id)).toEqual(sel.products.map((p) => p.id));
    expect(renderStress(data.stress, 'Unit: Retail BU')).toContain('Decision Intelligence verdict for Unit: Retail BU');
    const out = await exportResultsWorkbook(undefined, NOW, unit('bu')), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(await out.blob.arrayBuffer());
    expect(wb.worksheets[0]!.name).toBe('Unit Retail BU');
    expect(rows(wb, 'Unit Retail BU').find((r) => r[0] === 'Scope')![1]).toBe('Unit: Retail BU');
    const st = rows(wb, 'Portfolio stress');
    expect(st.find((r) => r[0] === 'Retail BU' && r[1] === sel.stats.p10)).toBeTruthy();
    expect(st.find((r) => r[0] === 'Retail BU' && r[1] === VERDICT_META[d.verdict].short)![2]).toBe(d.confidence);
    expect(st.filter((r) => r[0] === 'Payments' || r[0] === 'Lending')).toHaveLength(2);
  });
  it('outside a unit scope the workbook has no unit sheet', async () => {
    unitTreeThree();
    await runPortfolioSimulation({ draws: 100, seed: 2 });
    const out = await exportResultsWorkbook(undefined, NOW, { kind: 'portfolio' }), wb = new (await loadExcelJS()).Workbook();
    await wb.xlsx.load(await out.blob.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name).filter((n) => n.startsWith('Unit '))).toEqual([]);
  });
});
