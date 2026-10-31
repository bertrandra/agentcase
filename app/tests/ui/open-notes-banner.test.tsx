// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dismissCalcBanner } from '@/controllers/calcStaleness';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { dismissOpenNotes } from '@/controllers/openNotes';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../store/helpers';

afterEach(() => { cleanup(); dismissCalcBanner(); dismissOpenNotes(); });

interface CaseFile { teamIn?: { etp: unknown }[]; RATE: unknown }
const open = async (mutate: (f: CaseFile) => void) => {
  freshStore();
  const f = JSON.parse(exportSnapshotJson().json) as CaseFile;
  mutate(f);
  freshStore();
  await act(async () => { await importSnapshotFile({ text: async () => JSON.stringify(f) }); });
};

describe('"Opened with N corrections" notice in the shell', () => {
  it('a sound file shows nothing', async () => {
    render(<App />);
    await open(() => undefined);
    expect(screen.queryByTestId('open-notes-banner')).toBeNull();
  });
  it('a damaged file: a toast, then an accessible status listing every correction; Dismiss hides it', async () => {
    render(<App />);
    // schema v5: the team is in the document; a file that still carries a `teamIn` key (a version 4 shape) is corrected, then moved into it
    await open((f) => { f.teamIn = [{ skill: 'Dev', grade: 'B2', loc: 'France', etp: -4, pins: [] } as { etp: unknown }]; f.RATE = 'x'; });
    const banner = screen.getByTestId('open-notes-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toContain('Opened with 2 corrections');
    expect(within(banner).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'RATE: not a rate card (string) — default rates used', 'teamIn row 1: FTE -4 is not a number >= 0 — set to 0',
    ]);
    expect(uiStore.getState().toast).toMatch(/^Opened with 2 corrections/);
    fireEvent.click(within(banner).getByRole('button', { name: /Dismiss the list of corrections/ }));
    expect(screen.queryByTestId('open-notes-banner')).toBeNull();
  });
});
