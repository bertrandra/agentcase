// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Plan from '@/ui/sections/verify/gantt';
import { uiStore } from '@/ui/uiState';
import { processView } from '@/ui/sections/scope/process/view';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/** A fresh case on the Plan section, nothing selected in the Process section. */
function reset(): void {
  freshStore();
  processView.setState({ selected: null });
  uiStore.setState({ activeSection: 'gantt', toast: '' });
}
beforeEach(reset);
afterEach(cleanup);

const tab = (name: RegExp) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');

/**
 * The 📅 Plan screen (SPEC_BPMN § 19.8 F-B78; phase B9d): the Gantt section with the tabs Gantt, WBS, OBS / RAM and Histogram — views only,
 * every row opens its activity in the Process section; keyboard tabs (arrows), a table for each chart, axe clean on every tab.
 */
describe('plan screen', () => {
  it('is titled Plan; the tabs move with the arrow keys; the Gantt tab keeps the timeline and adds the programme Gantt', async () => {
    render(<Plan />);
    expect(screen.getByRole('heading', { level: 1, name: /📅 Plan/ })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['📅 Gantt', '🧱 WBS', '🏢 OBS / RAM', '📊 Histogram']);
    expect(within(panel()).getByRole('region', { name: 'Delivery timeline' })).toBeTruthy();
    expect(within(panel()).getByRole('table', { name: /Programme schedule/ })).toBeTruthy();
    const critical = within(panel()).getAllByRole('button', { name: /^Open 1\.1\.1 Discover: .*critical in Process$/ });
    expect(critical).toHaveLength(1);
    fireEvent.keyDown(critical[0]!, { key: 'Enter' });
    expect([uiStore.getState().activeSection, processView.getState().selected]).toEqual(['process', 'prog-stage-discover']);
    act(() => { fireEvent.keyDown(tab(/Gantt/), { key: 'ArrowRight' }); });
    expect(tab(/WBS/).getAttribute('aria-selected')).toBe('true');
  });

  it('WBS: the codes and the dictionary; a work package opens its activity', async () => {
    render(<Plan />);
    act(() => { fireEvent.click(tab(/WBS/)); });
    const wbs = within(panel()).getByRole('table', { name: 'WBS' });
    expect(within(wbs).getByText('1.2.1.1')).toBeTruthy();
    expect(within(panel()).getByRole('table', { name: 'WBS dictionary' }).textContent).toContain('Proven agentic factory');
    fireEvent.click(within(wbs).getByRole('button', { name: 'Open Pilot in Process' }));
    expect(processView.getState().selected).toBe('prog-pilot');
    expect(await axeViolations(panel())).toEqual([]);
  });

  it('OBS / RAM: the organisation, the operating-model roles and the RACI letters with the checks', async () => {
    render(<Plan />);
    act(() => { fireEvent.click(tab(/OBS/)); });
    expect(within(panel()).getByRole('table', { name: 'OBS' }).textContent).toContain('Transformation team');
    const ram = within(panel()).getByRole('table', { name: 'RAM' });
    expect(within(ram).getAllByRole('columnheader').map((h) => h.textContent)).toContain('Design Authority');
    expect(ram.textContent).toContain('OK');
    expect(await axeViolations(panel())).toEqual([]);
  });

  it('Histogram: FTE by default, person-days as a toggle (view state, no undo step), a table for the chart and the delivery view', async () => {
    render(<Plan />);
    act(() => { fireEvent.click(tab(/Histogram/)); });
    const fte = screen.getByRole('radio', { name: /FTE/ }) as HTMLInputElement, days = screen.getByRole('radio', { name: /Person-days/ });
    expect(fte.checked).toBe(true);
    expect(within(panel()).getByRole('table', { name: /Programme labour per month \(FTE\)/ })).toBeTruthy();
    act(() => { fireEvent.click(days); });
    expect(within(panel()).getByRole('table', { name: /Programme labour per month \(person-days\)/ })).toBeTruthy();
    expect(within(panel()).getByRole('img', { name: /Programme labour per month by role in person-days/ })).toBeTruthy();
    expect(within(panel()).getByRole('table', { name: /Entry team \(before agents\)/ })).toBeTruthy();
    // FX-16: grouped by team (no programme role mapped yet: one group "Not mapped", capacity not drawn)
    act(() => { fireEvent.click(screen.getByRole('radio', { name: 'Team' })); });
    expect(within(panel()).getByRole('list', { name: 'Groups (by team)' }).textContent).toContain('Not mapped to an organisation role');
    expect(await axeViolations(panel())).toEqual([]);
  });

  it('the exports are offered (MS Project XML, the workbook with the plan sheets, the plan report)', () => {
    render(<Plan />);
    const g = screen.getByRole('group', { name: 'Plan exports' });
    expect(within(g).getAllByRole('button').map((b) => b.textContent)).toEqual(['⬇ MS Project XML', '⬇ Results workbook with the plan sheets',
      '⬇ Plan report']);
  });
});
