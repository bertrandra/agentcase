import { describe, expect, it } from 'vitest';
import { applyDdPackEntries, exportDdPack, importDdPack } from '@/controllers/excelDd';
import { makeCtx } from '@/domain';
import type { DdState } from '@/domain/pdc/dd';
import { computeDdSensitivity, type DdSens } from '@/domain/pdc/ddSens';
import { appStore } from '@/store/instance';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import sections from '@/ui/zones/data/sectionCatalog.json';
import { dumpBuffer, editPack, loadCase, readJson, sheetDiffs, type DdEdits, type SheetDump } from '../helpers/xlsxDump';

interface DdFixture {
  id: string; withSens: boolean; exportState: DdState; preState: DdState; sens: DdSens | null; sheets: SheetDump[]; edits: DdEdits;
  imported: { state: DdState; message: string }; notAWorkbook: { message: string; state: DdState }; noSheet: { message: string; state: DdState };
}
const IDS = ['golden', 'ctx-msi', 'industry-med', 'horizon-5', 'hri-on', 'scope-reduced', 'curve-gompertz', 'kh-high'];
const fx = (id: string) => readJson<DdFixture>(`fixtures/xlsx-results/dd-${id}.json`);
const labels = new Map((sections as { id: string; label: string }[]).map((s) => [s.id, s.label]));
const label = (id: string) => labels.get(id) ?? id;
const buf = async (f: { blob: Blob }) => f.blob.arrayBuffer();
const stateOf = () => (appStore().getState().doc.DD_STATE ?? {}) as DdState;
/** the document of a legacy fixture holding the recorded register states */
const open = (f: DdFixture, state: DdState) => loadCase(f.id, (d) => { d.DD_STATE = JSON.parse(JSON.stringify(state)); });

describe('due-diligence pack reproduces the legacy export', () => {
  it.each(IDS)('%s: the four sheets match the legacy cell by cell', async (id) => {
    const f = fx(id);
    const sens = f.withSens ? computeDdSensitivity(makeCtx(loadCase(id).getState().doc), '2026-01-01T00:00:00.000Z') : null;
    if (sens) for (const [k, w] of Object.entries(f.sens!.w)) expect(Math.abs((sens.w[k] ?? NaN) - w)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(w)));
    loadCase(id, (d) => { d.DD_STATE = JSON.parse(JSON.stringify(f.exportState)); if (sens) d.DD_SENS = sens; });
    const out = await exportDdPack(label), dump = await dumpBuffer(await buf(out));
    expect(out.filename).toMatch(/^AgentCase_v[\w-]+_DueDiligence_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$/);
    // since legacy v18.12 the regulatory scope changes re-fit the potential, so the stored case already holds the fitted value (46 on industry-med)
    const legacy = f.sheets;
    expect(sheetDiffs(legacy, dump)).toEqual([]);
  }, 30000);
});

describe('due-diligence re-import reproduces the legacy', () => {
  it.each(IDS)('%s: the hand-edited pack gives the legacy register state and message, as ONE undoable step', async (id) => {
    const f = fx(id);
    open(f, f.exportState);
    const edited = await editPack(await buf(await exportDdPack(label)), f.edits);
    const s = open(f, f.preState), before = JSON.stringify(stateOf()), undo = s.getState().history.undo.length;
    const res = await importDdPack({ size: edited.byteLength, arrayBuffer: async () => edited });
    expect(res).toEqual({ ok: true, message: f.imported.message });
    expect(stateOf()).toEqual(f.imported.state);
    expect(s.getState().history.undo.length).toBe(undo + 1);
    expect(s.undo()).toBe(true);
    expect(JSON.stringify(stateOf())).toBe(before);
    expect(s.redo()).toBe(true);
    expect(stateOf()).toEqual(f.imported.state);
  });
  it('a file that is not a workbook, or has no DD_Register sheet, leaves the case untouched with the legacy message', async () => {
    const f = fx('golden'), s = open(f, f.preState), undo = s.getState().history.undo.length;
    const bad = await importDdPack({ arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer });
    expect(bad.ok).toBe(false);
    expect(bad.message.startsWith('Import failed: ')).toBe(true);
    expect(f.notAWorkbook.message.startsWith('Import failed: ')).toBe(true);
    const X = await loadExcelJS(), wb = new X.Workbook();
    wb.addWorksheet('Other').addRow(['x']);
    const none = await importDdPack({ arrayBuffer: async () => (await wb.xlsx.writeBuffer()) as ArrayBuffer });
    expect(none).toEqual({ ok: false, message: f.noSheet.message });
    expect(stateOf()).toEqual(f.preState);
    expect(s.getState().history.undo.length).toBe(undo);
  });
  it('is hardened: oversized files, hostile ids, formulas, errors and cyclic-looking cells never write outside the register', async () => {
    const f = fx('golden'), s = open(f, {});
    expect((await importDdPack({ size: 99 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) })).ok).toBe(false);
    const X = await loadExcelJS(), wb = new X.Workbook(), ws = wb.addWorksheet('DD_Register');
    ws.addRow(['ID', 'u', 'r', 'g', 'e', 'v', 'ed', 'c', 'w', 'ask', 'State', 'Owner', 'Due', 'Note']);
    ws.addRow(['__proto__', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'confirmed']);
    ws.addRow(['constructor', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'confirmed']);
    ws.addRow(['cf-perfrel-cap', 0, 0, 0, 0, 0, 0, 0, 0, 0, 'constructor']);
    ws.addRow(['cf-perfuplift', 0, 0, 0, 0, 0, 0, 0, 0, 0, { error: '#N/A' }, { formula: 'A1', result: { error: '#REF!' } }, { text: { richText: [{ text: 'deep' }] }, hyperlink: 'http://x' }, '<img src=x onerror=alert(1)>']);
    const res = await importDdPack({ arrayBuffer: async () => (await wb.xlsx.writeBuffer()) as ArrayBuffer });
    expect(res.message).toContain('1 row(s) applied · 1 unchanged · 2 unknown id(s) ignored');
    expect(Object.keys(stateOf())).toEqual(['cf-perfuplift']);
    expect(stateOf()['cf-perfuplift']).toEqual({ st: 'open', owner: '', dueDate: 'deep', note: '<img src=x onerror=alert(1)>' });
    expect(({} as Record<string, unknown>).confirmed).toBeUndefined();
    expect(s.getState().history.undo.length).toBe(1);
  });
  it('applying no rows adds no history entry', () => {
    const s = open(fx('golden'), {});
    applyDdPackEntries([]);
    expect(s.getState().history.undo.length).toBe(0);
  });
});
