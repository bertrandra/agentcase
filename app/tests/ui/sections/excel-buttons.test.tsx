// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportDdPack } from '@/controllers/excelDd';
import { appStore } from '@/store/instance';
import Dd from '@/ui/sections/defend/duediligence';
import { ResultsExcelPanel } from '@/ui/sections/refshare/io/ResultsExcelPanel';
import { editPack, loadCase, type DdEdits } from '../../helpers/xlsxDump';

afterEach(cleanup);
let saved: Blob[] = [];
beforeEach(() => {
  saved = [];
  // jsdom's Blob has no arrayBuffer() (every browser does)
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((res) => { const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.readAsArrayBuffer(this); });
  };
  URL.createObjectURL = (b: Blob | MediaSource) => { saved.push(b as Blob); return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('Excel buttons', () => {
  it('the Due-diligence section exports the pack and re-imports an annotated copy as one undoable step', async () => {
    const s = loadCase('golden');
    render(<Dd />);
    fireEvent.click(screen.getByText('📤 Export pack (Excel)'));
    await waitFor(() => expect(saved.length).toBe(1), { timeout: 15000 });
    expect(screen.getByText(/^Saved AgentCase_v.*_DueDiligence_.*\.xlsx$/)).toBeTruthy();
    const edits: DdEdits = { rows: [{ id: 'cf-perfrel-cap', st: 'confirmed', owner: 'Ann', note: 'ok' }], append: [] };
    const edited = await editPack(await (await exportDdPack()).blob.arrayBuffer(), edits);
    const file = new File([edited], 'pack.xlsx'), input = screen.getByLabelText('Annotated due-diligence pack (.xlsx)');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(document.querySelector("[role=status]")?.textContent).toMatch(/row\(s\) applied/), { timeout: 15000 });
    expect(appStore().getState().doc.DD_STATE).toMatchObject({ 'cf-perfrel-cap': { st: 'confirmed', owner: 'Ann', note: 'ok' } });
    expect(s.undo()).toBe(true);
    expect((appStore().getState().doc.DD_STATE as Record<string, unknown> | undefined)?.['cf-perfrel-cap']).toBeUndefined();
  });
  it('a file that is not a workbook is reported and changes nothing', async () => {
    loadCase('golden');
    render(<Dd />);
    fireEvent.change(screen.getByLabelText('Annotated due-diligence pack (.xlsx)'), { target: { files: [new File([new Uint8Array([1, 2, 3])], 'bad.xlsx')] } });
    await waitFor(() => expect(screen.getByText(/^Import failed: /)).toBeTruthy(), { timeout: 15000 });
    expect(appStore().getState().doc.DD_STATE ?? {}).toEqual({});
  });
  it('the results export downloads the workbook and says that no chart picture was available outside a browser canvas', async () => {
    loadCase('golden');
    render(<ResultsExcelPanel />);
    fireEvent.click(screen.getByText(/Export financial to Excel/));
    await waitFor(() => expect(saved.length).toBe(1), { timeout: 15000 });
    expect(saved[0]!.size).toBeGreaterThan(1000);
    expect(screen.getByText(/_Financial_.*no chart pictures/)).toBeTruthy();
  });
});
