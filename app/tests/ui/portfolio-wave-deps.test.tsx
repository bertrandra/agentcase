// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setWaveDependency } from '@/controllers/waveDeps';
import { consolidate } from '@/domain/portfolio';
import { axeViolations } from '../helpers/axe';
import { threeProducts } from '../helpers/portfolioStore';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

afterEach(cleanup);
let waves: [string, string], ids: [string, string, string];
beforeEach(() => { const made = threeProducts(); waves = made.waves; ids = made.ids; });
const undo = (): boolean => fireEvent.keyDown(document.body, { ctrlKey: true, key: 'z' });
const open = async () => { mountApp('waves'); await sectionReady(/Waves/); };
const month0 = (id: string) => consolidate(pf()).products.find((v) => v.id === id)!.month0;

describe('Waves section: dependencies and setup capacity', () => {
  it('Wave 2 starts after Wave 1 finishes setup: chosen with the keyboard-reachable selects, shown, undoable', async () => {
    await open();
    const target = screen.getByLabelText('Wave that Wave 2 starts after') as HTMLSelectElement;
    expect([...target.options].map((o) => o.text)).toEqual(['No dependency', 'Wave 1']);
    act(() => { fireEvent.change(target, { target: { value: waves[0] } }); });
    expect(pf().waves[1]!.dependsOn).toEqual({ waveId: waves[0], milestone: 'start', lagMonths: 0 });
    expect(month0(ids[2])).toBe(6);   // its own start (6) is later than Wave 1's start (0)
    act(() => { fireEvent.change(screen.getByLabelText('Milestone Wave 2 waits for'), { target: { value: 'setupEnd' } }); });
    const lag = screen.getByLabelText('Lag in months of Wave 2 after its dependency');
    act(() => { fireEvent.change(lag, { target: { value: '4' } }); fireEvent.blur(lag); });
    const eff = consolidate(pf()).waves[1]!.startMonth;
    expect(eff).toBeGreaterThan(6);
    expect(month0(ids[2])).toBe(eff);
    expect(document.querySelector('[data-effective-start]')!.textContent).toContain(`Effective start: month ${eff}`);
    const notes = screen.getByRole('list', { name: 'Schedule diagnostics' });
    expect(within(notes).getByText(/Wave 2: starts at month/).closest('li')!.getAttribute('data-code')).toBe('wave-delayed');
    // Wave 1 cannot depend on Wave 2 any more (it would close a cycle)
    expect([...(screen.getByLabelText('Wave that Wave 1 starts after') as HTMLSelectElement).options].map((o) => o.text)).toEqual(['No dependency']);
    act(() => undo());
    expect(pf().waves[1]!.dependsOn?.milestone).toBe('start');
    act(() => { fireEvent.change(screen.getByLabelText('Wave that Wave 2 starts after'), { target: { value: '' } }); });
    expect(pf().waves[1]).not.toHaveProperty('dependsOn');
    expect(screen.getByText(/No diagnostic: every wave starts at its own start/)).toBeTruthy();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it('the capacity field pushes the later setups back and the cards and checks say so', async () => {
    await open();
    const cap = screen.getByLabelText('Max products in setup at the same time (0 = no limit)');
    act(() => { fireEvent.change(cap, { target: { value: '1' } }); fireEvent.blur(cap); });
    expect(pf().maxConcurrentSetups).toBe(1);
    expect(document.querySelectorAll('[data-pushed]').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/at most 1 product\(s\) in setup at the same time/).length).toBeGreaterThan(0);
    act(() => undo());
    expect(pf().maxConcurrentSetups).toBeUndefined();
    expect(document.querySelectorAll('[data-pushed]')).toHaveLength(0);
  });

  it('the Gantt marks a wave that depends on another one', async () => {
    act(() => { setWaveDependency(waves[1], { waveId: waves[0], milestone: 'start', lagMonths: 8 }); setDisplayScope({ kind: 'portfolio' }); });
    mountApp('gantt'); await sectionReady(/Gantt/);
    expect(document.querySelector('[data-gantt-dep]')!.textContent).toContain('after Wave 1 starts + 8 months');
  });
});
