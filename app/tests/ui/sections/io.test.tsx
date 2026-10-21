// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCustomerName } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import { toSnapshot } from '@/store/persistence/snapshot';
import Io from '@/ui/sections/refshare/io';
import { expectParity } from '../../helpers/sectionParity';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
/** jsdom's File has no text(): add it, as browsers do. */
const withText = (f: File, text: string): File => Object.defineProperty(f, 'text', { value: async () => text });
const customer = () => appStore().getState().doc.customerName;

describe('io section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    expectParity('io', Io, { headings: ['Import / Export — all editable settings', '💾 Save HTML', '⬇️ Export / Import current settings', '🗂️ Snapshot Manager', '💾 Save HTML Snapshot', 'Download the entire application as a single standalone HTML file', '💾 Download HTML snapshot'] });
  });
  it('the HTML snapshot is enabled and the snapshot manager is available (the Excel settings tab is covered by io-params.test.tsx)', () => {
    render(<Io />);
    expect((screen.getByText('💾 Download HTML snapshot') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('tab', { name: '🗂️ Snapshot Manager' }));
    expect((screen.getByText('📸 Capture current configuration') as HTMLButtonElement).disabled).toBe(false);
  });
  it('saves the case as a snapshot file (the controller output is what the browser downloads)', () => {
    const urls: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (b: Blob) => { urls.push(b); return 'blob:x'; }, revokeObjectURL: () => undefined }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    act(() => { setCustomerName('Acme'); });
    render(<Io />);
    fireEvent.click(screen.getByText('⬇️ Save snapshot file'));
    expect(click).toHaveBeenCalledOnce();
    expect(urls[0]?.type).toBe('application/json');
    expect(screen.getByText(/^Saved AgentCase_Acme_/)).toBeTruthy();
  });
  it('opens a snapshot file: the case changes, then Ctrl+Z restores the previous one', async () => {
    act(() => { setCustomerName('Before'); });
    const other = { ...appStore().getState().doc, customerName: 'From file' };
    const json = JSON.stringify(toSnapshot(other)), file = withText(new File([json], 'case.json', { type: 'application/json' }), json);
    render(<Io />);
    fireEvent.change(screen.getByLabelText('Snapshot file'), { target: { files: [file] } });
    await waitFor(() => expect(customer()).toBe('From file'));
    expect(await screen.findByText(/Opened case.json/)).toBeTruthy();
    act(() => { appStore().undo(); });
    expect(customer()).toBe('Before');
  });
  it('a bad file is reported and leaves the case untouched', async () => {
    render(<Io />);
    fireEvent.change(screen.getByLabelText('Snapshot file'), { target: { files: [withText(new File(['not json'], 'bad.json'), 'not json')] } });
    expect(await screen.findByText(/Cannot open bad.json/)).toBeTruthy();
    expect(customer()).toBe('');
  });
});
