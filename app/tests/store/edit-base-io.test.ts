import { describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { exportDdPack, importDdPack } from '@/controllers/excelDd';
import { importParamsWorkbook } from '@/controllers/excelParams';
import { setInput } from '@/controllers/inputs';
import { setProductOverride } from '@/controllers/productOverrides';
import { runSimulation } from '@/controllers/stress';
import { resolveProduct } from '@/domain/portfolio';
import { activeDoc, editBase } from '@/store/editBase';
import { EMPTY_HISTORY } from '@/store/history';
import { appStore } from '@/store/instance';
import { ddPackData } from '@/store/persistence/excel/dd/data';
import { fingerprintOf, simStore } from '@/store/simulation';
import type { Doc } from '@/store/types';
import { ENV } from '../helpers/excelParams';
import { docOnly, threeProducts } from '../helpers/portfolioStore';
import { editPack } from '../helpers/xlsxDump';
import { asFile, editXlsx, ourXlsx, setByLabel } from '../helpers/xlsxEdit';

/** EDIT BASE for the file imports (docs/ARCHITECTURE.md § 4): the import is interpreted against the case it will be written to. */
const pf = () => appStore().getState().portfolio;
function commonView() {
  const t = threeProducts();
  setInput('y1Ramp', 14);
  setProductOverride(t.ids[0], 'values.y1Ramp', '30');   // the ACTIVE product keeps its own year-1 ramp
  setDisplayScope({ kind: 'portfolio' });
  t.s.setHistory(EMPTY_HISTORY);
  return t;
}
/** A single-case workbook without the "Year 1 ramp" row (the customer deleted it) and with another ramp changed. */
const partialWorkbook = async () => editXlsx(await ourXlsx(), (wb) => {
  const ws = wb.getWorksheet('Parameters')!;
  setByLabel(wb, 'Parameters', 'Year 2 ramp (%)', 60);
  ws.eachRow((r, i) => { if (String(r.getCell(1).value) === 'Year 1 ramp (%)') ws.spliceRows(i, 1); });
});

describe('file imports follow the edit base', () => {
  it('excelParams: a workbook imported in the common editor keeps the COMMON value of a row it lacks (not the active product\'s); undo exact', async () => {
    const { s, ids } = commonView(), before = docOnly(s);
    await importParamsWorkbook(asFile('p.xlsx', await partialWorkbook()), ENV);
    expect(pf().common.dom.values.y2Ramp).toBe('60');
    expect(pf().common.dom.values.y1Ramp).toBe('14');
    expect((resolveProduct(pf(), ids[0]) as Doc).dom.values.y1Ramp).toBe('30');
    expect(s.getState().history.undo).toHaveLength(1);
    s.undo(); expect(docOnly(s)).toBe(before);
  });
  it('excelParams: in a Product view the import still edits the active product as before', async () => {
    const { s, ids } = commonView();
    setDisplayScope({ kind: 'product' }); s.setHistory(EMPTY_HISTORY);
    await importParamsWorkbook(asFile('p.xlsx', await partialWorkbook()), ENV);
    expect((resolveProduct(pf(), ids[0]) as Doc).dom.values.y1Ramp).toBe('30');
    expect((resolveProduct(pf(), ids[0]) as Doc).dom.values.y2Ramp).toBe('60');
  });
  it('excelDd: the annotations are validated against the case they go to and land in the common register; undo exact', async () => {
    const { s } = commonView(), before = docOnly(s);
    const id = ddPackData(editBase()).rows[0]!.id;
    const pack = await editPack(await (await exportDdPack()).blob.arrayBuffer(), { rows: [{ id, st: 'confirmed', owner: 'Ann' }], append: [] });
    const r = await importDdPack({ arrayBuffer: async () => pack });
    expect(r.ok).toBe(true);
    const st = (pf().common as Record<string, unknown>).DD_STATE as Record<string, { st: string; owner: string }>;
    expect(st[id]).toMatchObject({ st: 'confirmed', owner: 'Ann' });
    s.undo(); expect(docOnly(s)).toBe(before);
  });
  it('read-only runs stay on the ACTIVE product (activeDoc), whatever is edited: the Monte Carlo of the results', () => {
    const { s } = commonView(), before = docOnly(s);
    runSimulation(100);
    expect(simStore.getState().run!.fingerprint).toBe(fingerprintOf(activeDoc()));
    expect(docOnly(s)).toBe(before);
  });
});
