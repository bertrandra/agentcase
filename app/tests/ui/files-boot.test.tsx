// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bootApp, dismissRestore } from '@/controllers/boot';
import { setAgentSup } from '@/controllers/artefacts';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { setCustomerName } from '@/controllers/persona';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { memoryStorage, startAutosave } from '@/store/persistence/autosave';
import { App } from '@/ui/App';
import { freshStore, snap } from '../store/helpers';

afterEach(() => { cleanup(); dismissRestore(); });

describe('files', () => {
  it('exports a legacy-shaped snapshot and opens it back; the previous case is one undo away', async () => {
    const s = freshStore(); setCustomerName('Acme / SA'); setAgentSup('A017', 100);
    const { filename, json } = exportSnapshotJson(), saved = snap(s);
    expect(filename).toMatch(/^AgentCase_Acme_SA_\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(json).dom.values.horizon).toBeDefined();
    const other = freshStore();
    await importSnapshotFile({ text: async () => json });
    expect(snap(other)).toBe(saved);
    expect(other.undo()).toBe(true);
    expect(other.getState().doc.customerName).toBe(makeDefaultDoc().customerName);
  });
  it('a corrupt file leaves the case untouched', async () => {
    const s = freshStore(), before = snap(s);
    await expect(importSnapshotFile({ text: async () => '{"nope":1}' })).rejects.toThrow();
    await expect(importSnapshotFile({ text: async () => 'not json' })).rejects.toThrow();
    expect(snap(s)).toBe(before);
  });
});

describe('boot: autosave restore offer', () => {
  it('offers the newest session of another tab, restores document and history', async () => {
    const storage = memoryStorage(), old = createAppStore(makeDefaultDoc(), { now: () => 0 });
    setAppStore(old); setCustomerName('Previous session'); setAgentSup('A017', 90);
    await startAutosave(old, storage, 'old-tab').flush();
    const fresh = freshStore();
    const stop = await bootApp({ storage, channel: null, tabId: 'new-tab' });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toMatch(/Previous session/);
    await act(async () => { fireEvent.click(screen.getByText('Restore')); });
    await waitFor(() => expect(fresh.getState().doc.customerName).toBe('Previous session'));
    expect(fresh.getState().history.undo).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
    stop();
  });
  it('offers nothing when only the current tab has a record', async () => {
    const storage = memoryStorage(), s = freshStore(); setCustomerName('Mine');
    await startAutosave(s, storage, 'same-tab').flush();
    const stop = await bootApp({ storage, channel: null, tabId: 'same-tab' });
    render(<App />);
    expect(screen.queryByRole('alert')).toBeNull();
    stop();
  });
});
