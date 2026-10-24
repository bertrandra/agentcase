// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '@/store/instance';
import Io from '@/ui/sections/refshare/io';
import { legacyXlsx } from '../../helpers/excelParams';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/** jsdom's File has no arrayBuffer(): add it, as browsers do. */
const xlsxFile = (name: string, bytes: ArrayBuffer): File => Object.defineProperty(new File([bytes], name), 'arrayBuffer', { value: async () => bytes });
const openTab = () => { render(<Io />); fireEvent.click(screen.getByRole('tab', { name: '⬇️ Export / Import current settings' })); };
const industry = () => appStore().getState().doc.dom.values.industry;
function captureDownloads() {
  const blobs: Blob[] = [], names: string[] = [];
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:x'; }, revokeObjectURL: () => undefined }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
  return { blobs, names };
}

describe('Excel parameters panel (Import / Export → settings)', () => {
  it('offers the three exports and the import, all enabled', () => {
    openTab();
    for (const label of ['⬇️ Export all', '⬇️ Export all except Factory', '⬇️ Export persona config only', '⬆️ Import parameters…']) expect((screen.getByRole('button', { name: label }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/available in a later release/)).toBeNull();
    expect((screen.getByLabelText('Settings workbook (.xlsx)') as HTMLInputElement).accept).toBe('.xlsx');
  });
  it('Export all downloads the legacy-named workbook', async () => {
    const d = captureDownloads();
    openTab();
    fireEvent.click(screen.getByRole('button', { name: '⬇️ Export all' }));
    await screen.findByText(/^✓ Exported AgentCase_/, undefined, { timeout: 15000 });
    expect(d.names).toHaveLength(1);
    expect(d.names[0]).toMatch(/^AgentCase_v20_12_Parameters_\d{4}-\d\d-\d\d-\d\d-\d\d-\d\d\.xlsx$/);
    expect(d.blobs[0]?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
  it('the persona-only export also downloads the JSON copy', async () => {
    const d = captureDownloads();
    openTab();
    fireEvent.click(screen.getByRole('button', { name: '⬇️ Export persona config only' }));
    await waitFor(() => expect(d.names).toHaveLength(2), { timeout: 15000 });
    expect(d.names.map((n) => n.split('.').pop())).toEqual(['xlsx', 'json']);
    expect(d.names[0]).toMatch(/_PersonaConfig_/);
  });
  it('imports a workbook: the case changes, the notes are listed, and one Ctrl+Z undoes it all', async () => {
    openTab();
    expect(industry()).toBe('NONE');
    fireEvent.change(screen.getByLabelText('Settings workbook (.xlsx)'), { target: { files: [xlsxFile('aero.xlsx', legacyXlsx('industry-aero'))] } });
    const status = await screen.findByText(/Imported successfully/, undefined, { timeout: 15000 });
    expect(status.textContent).toContain('Ctrl+Z undoes the whole import');
    const box = within(screen.getByRole('status'));
    expect(box.getByText('Glass ceiling (%) clamped down to 50')).toBeTruthy();
    expect(box.getByText(/Dependencies: imported 148 edge\(s\)/)).toBeTruthy();
    expect(industry()).toBe('AERO');
    expect(appStore().getState().history.undo.map((h) => h.label)).toEqual(['Import parameters']);
    act(() => { appStore().undo(); });
    expect(industry()).toBe('NONE');
  });
  it('a bad file is reported, the case is untouched and nothing is on the undo stack', async () => {
    openTab();
    fireEvent.change(screen.getByLabelText('Settings workbook (.xlsx)'), { target: { files: [xlsxFile('bad.xlsx', new TextEncoder().encode('definitely not a workbook').buffer as ArrayBuffer)] } });
    expect(await screen.findByText(/✗ Import failed: .*The case was not changed\./, undefined, { timeout: 15000 })).toBeTruthy();
    expect(appStore().getState().history.undo).toHaveLength(0);
    expect(industry()).toBe('NONE');
  });
});
