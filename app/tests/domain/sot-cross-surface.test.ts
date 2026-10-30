import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exportResultsWorkbook } from '@/controllers/excelResults';
import { makeCtx, type CaseState } from '@/domain';
import { fteByYear } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { appStore } from '@/store/instance';
import { fteSurfaces, moneySurfaces, setupSurfaces } from '../helpers/sotChecks';
import { dumpBuffer, loadCase as loadIntoStore } from '../helpers/xlsxDump';

/**
 * One source of truth, guarded (lot 10): every business figure is computed once in `src/domain` and every surface that shows it (screens' views,
 * aggregate inputs, the registry variables, the calculation package, the report and the Excel results workbook) prints that value. A surface that
 * recomputes a figure on its own breaks one of these equalities on some fixture.
 * Owners: setup (`setupBreakdown`, read by the model's drivers), FTE before / after / freed (`fteBeforeAfter`), net / ROI / payback / total benefit
 * (`headline`), savings and run cost per year (the Time Engine year rows). The equalities live in tests/helpers/sotChecks.ts (also run on the B5
 * process cases: sot-cross-surface-process.test.ts).
 */
const ALL = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const load = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;

describe('one source of truth: the same figure on every surface (all fixtures)', () => {
  it('has the 107 oracle cases', () => expect(ALL.length).toBe(107));
  it.each(ALL)('%s: the setup breakdown lines add up to model().setupTotal, which every setup surface prints', (id) => setupSurfaces(load(id)));
  it.each(ALL)('%s: FTE before / after / freed / reduction come from fteBeforeAfter on every surface', (id) => fteSurfaces(load(id)));
  it.each(ALL)('%s: net, ROI, payback, total benefit and the end-year savings are the owner values on every surface', (id) => moneySurfaces(load(id)));
});

describe('one source of truth: the Excel results workbook prints the owners (four fixtures)', () => {
  it.each(['golden', 'ctx-msi', 'horizon-5', 'hri-on'])('%s', async (id) => {
    loadIntoStore(id);
    const c = makeCtx(appStore().getState().doc), h = headline(c), f = fteByYear(c);
    const sheets = await dumpBuffer(await (await exportResultsWorkbook()).blob.arrayBuffer());
    const sheet = (n: string) => sheets.find((s) => s.name === n)!.rows, row = (n: string, label: string) => sheet(n).find((r) => r[0] === label)!;
    expect(row('Savings', 'Human FTE freed').slice(1)).toEqual(f.map((x) => +x.freed.toFixed(1)));
    expect(row('Investment', 'Total one-time investment')[1]).toBe(Math.round(h.setup));
    const inv = sheet('Investment').slice(1, -1).reduce((a, r) => a + (r[1] as number), 0);
    expect(Math.abs(inv - h.setup)).toBeLessThanOrEqual(sheet('Investment').length);   // the lines are rounded one by one
    expect(row('ROI', 'Setup investment')[1]).toBe(Math.round(h.setup));
    expect(String(sheet('ROI').find((r) => String(r[0]).startsWith('Net profit'))![1])).toBe(String(Math.round(h.net)));
    expect(sheet('P&L').find((r) => String(r[0]).startsWith('Net'))!.at(-1)).toBe(Math.round(h.net));
  });
});
