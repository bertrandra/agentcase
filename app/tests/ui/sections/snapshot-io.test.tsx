// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setCustomerName } from '@/controllers/persona';
import { snapshotsOf } from '@/domain/snapshots';
import { appStore } from '@/store/instance';
import Io from '@/ui/sections/refshare/io';
import { loadFixture } from '../../helpers/fixtures';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const lib = () => snapshotsOf(appStore().getState().doc);
const withText = (f: File, text: string): File => Object.defineProperty(f, 'text', { value: async () => text });
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
function captureDownloads() {
  const blobs: Blob[] = [], names: string[] = [];
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => { blobs.push(b); return 'blob:x'; }, revokeObjectURL: () => undefined }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
  return { blobs, names };
}
const readBlob = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });

describe('Save HTML tab', () => {
  it('downloads the application with the case embedded, and opens it back', async () => {
    const d = captureDownloads();
    act(() => { setCustomerName('Acme'); });
    render(<Io />);
    fireEvent.click(screen.getByText('💾 Download HTML snapshot'));
    expect(d.names[0]).toMatch(/^AgentCase_Acme_v19_0_0-dev_Snapshot_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.html$/);
    expect(d.blobs[0]!.type).toBe('text/html');
    const html = await readBlob(d.blobs[0]!);
    expect(html).toContain('id="agentcase-snapshot"');
    act(() => { setCustomerName('Changed'); });
    fireEvent.change(screen.getByLabelText('Snapshot file to open'), { target: { files: [withText(new File([html], 'x.html'), html)] } });
    await waitFor(() => expect(appStore().getState().doc.customerName).toBe('Acme'));
    expect(await screen.findByText(/Opened x.html \(HTML snapshot\)/)).toBeTruthy();
    act(() => { appStore().undo(); });
    expect(appStore().getState().doc.customerName).toBe('Changed');
  });
  it('says why a file cannot be opened', async () => {
    render(<Io />);
    fireEvent.change(screen.getByLabelText('Snapshot file to open'), { target: { files: [withText(new File(['<html></html>'], 'p.html'), '<html></html>')] } });
    expect(await screen.findByText(/Cannot open p.html: No AgentCase snapshot found/)).toBeTruthy();
  });
});

describe('Critical & regulated report', () => {
  it('explains the gate on a case without norms, and downloads the report once norms are selected', async () => {
    const d = captureDownloads();
    render(<Io />);
    fireEvent.click(screen.getByText('📄 Export critical-delivery report'));
    expect(screen.getByText(/Enable the Regulatory catalog and select at least one norm/)).toBeTruthy();
    expect(d.blobs).toHaveLength(0);
    cleanup(); loadFixture('industry-med');
    render(<Io />);
    fireEvent.click(screen.getByText('📄 Export critical-delivery report'));
    expect(screen.getByText('Report generated (4 norms, 33 regulatory artifacts).')).toBeTruthy();
    expect(d.names[0]).toMatch(/^AgentCase_Critical_Regulated_Report_\d{8}\.html$/);
    expect(await readBlob(d.blobs[0]!)).toContain('Critical &amp; Regulated Software Delivery Model');
  });
});

describe('Snapshot Manager tab', () => {
  it('captures, activates (undoable), renames, compares and deletes', () => {
    render(<Io />); tab('🗂️ Snapshot Manager');
    expect(screen.getByText(/No snapshots captured yet/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Client X/), { target: { value: 'Baseline case' } });
    fireEvent.click(screen.getByText('📸 Capture current configuration'));
    expect(screen.getByRole('cell', { name: /Baseline case · v19/ })).toBeTruthy();
    expect(lib()).toHaveLength(1);

    act(() => { setAgentSup('A017', 100); setCustomerName('Edited'); });
    const edited = appStore().getState().doc;
    fireEvent.click(screen.getByLabelText(/^Activate "Baseline case/));
    expect(appStore().getState().doc.customerName).not.toBe('Edited');
    act(() => { appStore().undo(); });
    expect(appStore().getState().doc).toStrictEqual(edited);

    fireEvent.click(screen.getByLabelText(/^Rename "Baseline case/));
    fireEvent.change(screen.getByLabelText('New snapshot name'), { target: { value: 'Renamed case' } });
    fireEvent.click(screen.getByText('Save'));
    expect(lib()[0]!.name).toBe('Renamed case');

    fireEvent.change(screen.getByLabelText('With'), { target: { value: lib()[0]!.id } });
    const table = screen.getByRole('table', { name: 'Snapshot comparison' });
    expect(within(table).getByText('Net savings, end-year')).toBeTruthy();
    expect(within(table).getByText('Δ (second − first)')).toBeTruthy();

    fireEvent.click(screen.getByText('✕ Delete'));
    fireEvent.click(screen.getByText('✓ Confirm'));
    expect(lib()).toHaveLength(0);
    expect(screen.getByText(/No snapshots captured yet/)).toBeTruthy();
  });
  it('baseline needs two confirmations', () => {
    render(<Io />); tab('🗂️ Snapshot Manager');
    fireEvent.click(screen.getByText('📸 Capture current configuration'));
    fireEvent.click(screen.getByText('🏁 Set as baseline'));
    expect(lib()[0]!.isBaseline).toBe(false);
    fireEvent.click(screen.getByText('Continue →'));
    expect(lib()[0]!.isBaseline).toBe(false);
    fireEvent.click(screen.getByText('✓ Yes, set as baseline'));
    expect(lib()[0]!.isBaseline).toBe(true);
    expect(screen.getByText('🏁 BASELINE')).toBeTruthy();
  });
});
