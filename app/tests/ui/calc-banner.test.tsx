// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { dismissCalcBanner } from '@/controllers/calcStaleness';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { setInput } from '@/controllers/inputs';
import { App } from '@/ui/App';
import { freshStore, type Saved } from '../store/helpers';

afterEach(() => { cleanup(); dismissCalcBanner(); });

const open = async (mutate: (f: Saved) => void) => {
  freshStore(); setInput('horizon', '4');
  const f = JSON.parse(exportSnapshotJson().json) as Saved;
  mutate(f);
  const s = freshStore();
  await act(async () => { await importSnapshotFile({ text: async () => JSON.stringify(f) }); });
  return s;
};

describe('calculation staleness banner in the shell', () => {
  it('stays hidden for a consistent file', async () => {
    render(<App />);
    await open(() => undefined);
    expect(screen.queryByTestId('calc-stale-banner')).toBeNull();
  });
  it('shows as an accessible status with saved and live figures, and Dismiss hides it', async () => {
    render(<App />);
    await open((f) => { f.calculationPackage.headline.npv *= 2; });
    const banner = screen.getByTestId('calc-stale-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.textContent).toMatch(/no longer match the current inputs/);
    expect(banner.textContent).toMatch(/Saved: payback .* \/ NPV .*Live: payback/);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss the calculation staleness notice/ }));
    expect(screen.queryByTestId('calc-stale-banner')).toBeNull();
  });
  it('names the engine versions on a version mismatch', async () => {
    render(<App />);
    await open((f) => { f.calculationPackage.calculationVersion = 'agentcase.timeengine.v0'; });
    expect(screen.getByTestId('calc-stale-banner').textContent).toMatch(/different engine version.*timeengine\.v0 → live agentcase\.timeengine\.v2/);
  });
  it('survives undo and redo of the opened case (the banner is not history)', async () => {
    render(<App />);
    const s = await open((f) => { f.calculationPackage.headline.npv *= 2; });
    act(() => { s.undo(); });
    expect(screen.getByTestId('calc-stale-banner')).toBeDefined();
    act(() => { s.redo(); });
    expect(screen.getByTestId('calc-stale-banner')).toBeDefined();
  });
});
