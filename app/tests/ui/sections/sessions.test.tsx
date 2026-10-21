// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureSessions } from '@/controllers/sessions';
import { setCustomerName } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import { memoryStorage, startAutosave, type AutosaveStorage } from '@/store/persistence/autosave';
import Sessions from '@/ui/sections/refshare/sessions';
import { expectParity } from '../../helpers/sectionParity';
import { freshStore } from '../../store/helpers';

let storage: AutosaveStorage;
beforeEach(() => { freshStore(); storage = memoryStorage(); configureSessions({ storage, tabId: 'tab-A' }); });
afterEach(() => { cleanup(); configureSessions(null); });

/** Another tab's autosave record, written through the real autosave. */
async function otherTabSession(name: string, tabId: string, now: string): Promise<void> {
  const s = freshStore(); act(() => { s.dispatch({ type: 'x', label: 'x', payload: null, undoable: true, run: (d) => { d.customerName = name; } }); });
  await startAutosave(s, storage, tabId, { now: () => new Date(now) }).flush();
}

describe('sessions section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    expectParity('sessions', Sessions, { headings: ['Session manager — autosave', 'Autosave this session', "Clear this tab's autosave", '🗑 Clear all sessions', 'No autosaved sessions yet', 'A rolling autosave of this browser'] });
  });
  it('lists the autosaved sessions newest first, restores one with its undo history, and removes one', async () => {
    await otherTabSession('Older case', 'tab-B', '2026-01-01T10:00:00Z');
    await otherTabSession('Newer case', 'tab-C', '2026-02-01T10:00:00Z');
    freshStore();
    render(<Sessions />);
    await screen.findByText('Newer case');
    const names = screen.getAllByRole('row').slice(1).map((r) => r.textContent ?? '');
    expect(names[0]).toContain('Newer case');
    expect(names[1]).toContain('Older case');
    fireEvent.click(screen.getByLabelText('Restore Older case'));
    await waitFor(() => expect(appStore().getState().doc.customerName).toBe('Older case'));
    expect(appStore().getState().history.undo.length).toBe(1);   // that session's undo history came back with it
    act(() => { appStore().undo(); });
    expect(appStore().getState().doc.customerName).toBe('');
    fireEvent.click(screen.getByLabelText('Remove Older case'));
    await waitFor(() => expect(screen.queryByText('Older case')).toBeNull());
    expect((await storage.list()).map((r) => r.tabId)).toEqual(['tab-C']);
  });
  it('autosaves this session on demand, clears this tab, then clears every session (two-step)', async () => {
    await otherTabSession('Other', 'tab-B', '2026-01-01T10:00:00Z');
    freshStore(); configureSessions({ storage, tabId: 'tab-A' });
    act(() => { setCustomerName('Mine'); });
    render(<Sessions />);
    fireEvent.click(screen.getByText('Autosave this session'));
    await screen.findByText('Mine');
    expect(screen.getByText('this tab')).toBeTruthy();
    fireEvent.click(screen.getByText("Clear this tab's autosave"));
    await waitFor(() => expect(screen.queryByText('Mine')).toBeNull());
    expect(screen.getByText('Other')).toBeTruthy();
    fireEvent.click(screen.getByText('🗑 Clear all sessions'));
    expect(await storage.list()).toHaveLength(1);                       // nothing removed before the confirmation
    fireEvent.click(screen.getByText('Confirm: remove every session'));
    await screen.findByText(/No autosaved sessions yet/);
    expect(await storage.list()).toHaveLength(0);
  });
  it('explains itself when the browser gives no IndexedDB', () => {
    configureSessions({ storage: null, tabId: 'tab-A' });
    render(<Sessions />);
    expect(screen.getByText(/gives no access to IndexedDB/)).toBeTruthy();
    expect((screen.getByText('Autosave this session') as HTMLButtonElement).disabled).toBe(true);
  });
});
