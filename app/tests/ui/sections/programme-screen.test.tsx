// @vitest-environment jsdom
import { caseValues } from '@/domain/process';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { costProfileKey, descriptionKey, programmeProcess } from '@/domain/programme';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { appStore } from '@/store/instance';
import Programme from '@/ui/sections/scope/programme';
import { programmeScreen } from '@/ui/sections/scope/programme/view';
import { processView } from '@/ui/sections/scope/process/view';
import { uiStore } from '@/ui/uiState';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * 📋 Programme (docs/SPEC_BPMN.md § 19.11 F-B79; phase B9e): one table of the programme's activities. Each edit is one undoable step on the same key
 * as the Process parameter panel (§ 19.7), the figures follow; filters, sort, links, keyboard and axe.
 */
const doc = () => appStore().getState().doc;
const values = () => caseValues(doc());   // schema v4: the programme's values are the document's
const steps = () => appStore().getState().history.undo.length;
const total = () => setupBreakdown(makeCtx(doc())).total;
const rowOf = (name: string): HTMLElement => screen.getByRole('rowheader', { name: new RegExp(`^${name} —`) }).closest('tr')!;
const bodyRows = () => document.querySelectorAll('tbody tr');
beforeEach(() => {
  freshStore(); programmeScreen.setState({ ...programmeScreen.getInitialState() }); processView.setState({ ...processView.getInitialState() });
});
afterEach(cleanup);

describe('📋 Programme screen', { timeout: 90_000 }, () => {
  it('lists every activity and milestone, with the totals row of the engine\'s programme cost; axe clean, an editor open too', async () => {
    const { container } = render(<Programme />);
    const v = programmeProcess(makeCtx(doc()));
    expect(bodyRows()).toHaveLength(v.activities.length + v.milestones.length);
    expect(document.querySelector('tfoot')!.textContent).toContain('Programme cost in the euro result');
    expect(within(rowOf('Rollout hypercare')).getByRole<HTMLInputElement>('checkbox', { name: 'Rollout hypercare enabled' }).checked).toBe(false);
    expect(within(rowOf('Setup: tooling and infrastructure')).getByRole<HTMLInputElement>('checkbox').disabled).toBe(true);
    expect(await axeViolations(container)).toEqual([]);
    act(() => { fireEvent.click(within(rowOf('Setup: coaching')).getByRole('button', { name: 'Edit Setup: coaching' })); });
    expect(await axeViolations(container)).toEqual([]);
  });
  it('Enabled writes the opt-in switch the Process panel edits (one undoable step); the cost enters the setup; undo restores it', () => {
    render(<Programme />);
    const before = total(), n = steps();
    act(() => { fireEvent.click(within(rowOf('Rollout hypercare')).getByRole('checkbox')); });
    expect(values().optHypercare).toBe('on');
    expect(steps()).toBe(n + 1);
    expect(total()).toBeGreaterThan(before);
    expect(within(rowOf('Rollout hypercare')).getByRole<HTMLInputElement>('checkbox').checked).toBe(true);
    act(() => { appStore().undo(); });
    expect(total()).toBeCloseTo(before, 6);
  });
  it('Type: Recurring on the tooling repeats it every year (one step); One-off keeps the total', () => {
    render(<Programme />);
    const before = total(), tooling = makeCtx(doc()).inp.p('setupTooling'), n = steps();
    act(() => { fireEvent.change(screen.getByRole('combobox', { name: 'Type of Setup: tooling and infrastructure' }), { target: { value: 'recurring' } }); });
    expect(values()[costProfileKey('tooling')]).toBe('recurring');
    expect(steps()).toBe(n + 1);
    expect(total() - before).toBeCloseTo(2 * tooling, 4);   // three yearly cycles in the 3-year horizon
    act(() => { fireEvent.change(screen.getByRole('combobox', { name: 'Type of Setup: tooling and infrastructure' }), { target: { value: 'one-off' } }); });
    expect(total()).toBeCloseTo(before, 4);
  });
  it('Edit opens the description, timing and cost fields; the description is one step and the Process view reads it', () => {
    render(<Programme />);
    const edit = within(rowOf('Pilot')).getByRole('button', { name: 'Edit Pilot' });
    act(() => { fireEvent.click(edit); });
    expect(edit.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('group', { name: 'Start and duration of Pilot' })).toBeTruthy();
    expect(screen.getByRole('group', { name: /^Cost of Pilot/ })).toBeTruthy();
    const box = screen.getByRole('textbox', { name: 'Description of Pilot' }), n = steps();
    fireEvent.change(box, { target: { value: 'Our pilot.' } });
    act(() => { fireEvent.keyDown(box, { key: 'Enter' }); });
    expect(values()[descriptionKey('pilot')]).toBe('Our pilot.');
    expect(steps()).toBe(n + 1);
    expect(programmeProcess(makeCtx(doc())).activities.find((a) => a.kind === 'pilot')!.description).toBe('Our pilot.');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Reset to the catalogue text' })); });
    expect(values()[descriptionKey('pilot')]).toBe('');
  });
  it('filters (phase, product, type, enabled) and sort', () => {
    render(<Programme />);
    const all = bodyRows().length;
    act(() => { fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'engagement' } }); });
    expect(bodyRows()).toHaveLength(5);
    act(() => { fireEvent.change(screen.getByLabelText('Phase'), { target: { value: '' } }); });
    act(() => { fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'none' } }); });
    expect([...bodyRows()].every((r) => r.textContent!.includes('Milestone'))).toBe(true);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); });
    act(() => { fireEvent.change(screen.getByLabelText('Enabled'), { target: { value: 'off' } }); });
    expect(bodyRows().length).toBeLessThan(all);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); });
    act(() => { fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'case' } }); });
    expect(bodyRows().length).toBeLessThan(all);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); });
    const sort = screen.getByRole('button', { name: 'Activity' });
    act(() => { fireEvent.click(sort); });
    expect(sort.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
    const names = [...document.querySelectorAll('tbody th')].map((t) => t.firstChild!.textContent!.toLowerCase());
    expect(names).toEqual([...names].sort());
  });
  it('the linked section and "Open in Process" open their section (view state only, no undo step)', () => {
    render(<Programme />);
    const n = steps();
    act(() => { fireEvent.click(within(rowOf('Pilot')).getByRole('button', { name: 'Open 🧭 Program & Completeness' })); });
    expect(uiStore.getState().activeSection).toBe('program');
    act(() => { fireEvent.click(within(rowOf('Pilot')).getByRole('button', { name: 'Open Pilot in Process' })); });
    expect(uiStore.getState().activeSection).toBe('process');
    expect(processView.getState().selected).toBe('prog-pilot');
    expect(steps()).toBe(n);
  });
});
