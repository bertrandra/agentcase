// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Studio from '@/ui/sections/scope/process-studio';
import { axeViolations } from '../../helpers/axe';
import { resetStudioTest, studioDoc, studioTab } from '../../helpers/processStudio';
import { threeProducts } from '../../helpers/portfolioStore';
import { freshStore } from '../../store/helpers';

/**
 * 🗺️ Process studio (owner's request 2026-11-13): the map's displays (the V-cycle is one option) and whose process — the Portfolio's common one,
 * a Product's own or shared one, an organisation lens.
 */
afterEach(resetStudioTest);
const doc = studioDoc;
const tab = studioTab;

describe('🗺️ Process studio: displays and scope', () => {
  it('the map in four displays (Flow by default, V-cycle, Agile loop, Agentic): same phases, nothing changes in the case; axe clean', async () => {
    const s = freshStore(), before = doc(s), { container } = render(<Studio />);
    const group = screen.getByRole('group', { name: 'Display of the lifecycle' });
    expect(within(group).getByRole('button', { name: 'Flow' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('list', { name: 'The phases in order' })).getAllByRole('button')).toHaveLength(11);
    for (const [view, region] of [['V-cycle', 'The V of the lifecycle'], ['Agile loop', 'The delivery phases repeated in each increment'],
      ['Agentic', 'Agent-led']] as const) {
      fireEvent.click(within(group).getByRole('button', { name: view }));
      expect(screen.getByRole(view === 'Agentic' ? 'region' : 'group', { name: region })).toBeTruthy();
      expect(await axeViolations(container)).toEqual([]);
    }
    expect(screen.getAllByRole('button', { name: /^V\d / })).toHaveLength(7);   // every V phase sits in one autonomy column
    expect(doc(s)).toBe(before);
  });

  it('portfolio: whose process — a product gets its own copy, makes it common, shares again (each one step); the org lens filters; axe clean', async () => {
    const t = threeProducts(), [a] = t.ids, pf = () => t.s.getState().portfolio;
    const { container } = render(<Studio />);
    const name = pf().products.find((p) => p.id === a)!.name;
    expect(screen.getByRole('button', { name: 'Product' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: `Give ${name} its own process` }));
    expect(pf().products.find((p) => p.id === a)!.overrides.BPMN).toBeDefined();
    expect(screen.getByRole('button', { name: 'Share the common process again' })).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    t.s.undo();
    expect(pf().products.find((p) => p.id === a)!.overrides.BPMN).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }));
    expect(pf().displayScope).toEqual({ kind: 'portfolio' });
    expect(screen.getByText(/Editing the/).textContent).toContain('shared by 3 of 3 products');
    fireEvent.change(screen.getByLabelText('Organisation lens'), { target: { value: 'unit-delivery' } });
    expect(pf().displayScope).toEqual({ kind: 'unit', id: 'unit-delivery' });
    expect(screen.getByText(/^Lens: /)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the lens' }));
    expect(pf().displayScope).toEqual({ kind: 'portfolio' });
  });

  it('one case: the lens is kept in the section and narrows the activities to the unit\'s work', () => {
    freshStore();
    render(<Studio />);
    expect(screen.queryByRole('group', { name: 'Process of' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Organisation lens'), { target: { value: 'unit-delivery' } });
    expect(screen.getByText(/^Lens: /)).toBeTruthy();
    tab(/^Activities/);
    expect(screen.getAllByRole('checkbox', { name: /^Tick / }).length).toBeGreaterThan(0);
  });
});
