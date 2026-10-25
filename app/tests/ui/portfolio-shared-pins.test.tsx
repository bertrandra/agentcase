// @vitest-environment jsdom
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { addSharedLine, setSharedPins } from '@/controllers/sharedTeam';
import { axeViolations } from '../helpers/axe';
import { mountApp, pf, sectionReady } from '../helpers/portfolioUi';
import { eachThree } from '../helpers/threeEach';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

const three = eachThree();
const undoKey = () => fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
const region = () => screen.getByRole('region', { name: 'Shared team lines' });
const pins = () => pf().sharedTeam![0]!.pins;

describe('Products: pins on a shared team line', () => {
  it('the pin button opens the editor; an artefact and a whole phase are pinned, each undoable; Clear pins empties the line', async () => {
    act(() => { addSharedLine({ etp: 2, allocations: { [three().ids[0]]: 50, [three().ids[1]]: 50 } }); });
    mountApp('products');
    await sectionReady(/Products/);
    const btn = screen.getByRole('button', { name: 'Pin shared line 1' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    const box = screen.getAllByRole('checkbox', { name: /^Pin .+ on shared line 1$/ })[0]!, art = box.getAttribute('aria-label')!.split(' ')[1]!;
    fireEvent.click(box);
    expect(pins()).toEqual([art]);
    expect(btn.textContent).toContain('1');
    undoKey();
    expect(pf().sharedTeam![0]).not.toHaveProperty('pins');
    const phase = screen.getAllByRole('button', { name: /^Pin all of phase .+ on shared line 1$/ })[0]!;
    fireEvent.click(phase);
    expect(pins()!.length).toBeGreaterThan(1);
    expect(await axeViolations(region(), { region: false })).toEqual([]);
    fireEvent.click(within(region()).getByRole('button', { name: 'Clear pins' }));
    expect(pf().sharedTeam![0]).not.toHaveProperty('pins');
    fireEvent.click(within(region()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('checkbox', { name: /on shared line 1$/ })).toBeNull();
  });

  it('the Input team shows the pins of the share row, still read-only', async () => {
    act(() => { const id = addSharedLine({ etp: 2, allocations: { [three().ids[0]]: 25 } })!; setSharedPins(id, ['A001', 'A002'], true); });
    mountApp('team-in');
    await sectionReady(/Input team/);
    const row = document.querySelector<HTMLElement>('tr[data-shared-row]')!;
    expect(row.textContent).toContain('📌 2');
    expect(row.querySelector('input, select, button')).toBeNull();
  });
});
