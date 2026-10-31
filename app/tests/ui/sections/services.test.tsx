// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { readStoredOrg } from '@/domain/org';
import { lineRule, servicesView, sharedLines } from '@/domain/portfolio';
import { fmtEur } from '@/ui/format';
import Organisation from '@/ui/sections/frame/organisation';
import { uiStore } from '@/ui/uiState';
import { axeViolations } from '../../helpers/axe';
import { serviceThree } from '../../helpers/services';
import { freshStore } from '../../store/helpers';

/**
 * F-B82 (docs/SPEC_BPMN.md § 21, phase B10c): the Services tab of 🏢 Organisation — the Service column of the units, the tab strip (keyboard),
 * per service its settings, delivery, load and cost by product, following the View; every edit undoable; axe clean.
 */
afterEach(cleanup);
const tab = (name: string) => screen.getByRole('tab', { name });

describe('🏢 Organisation › Services', () => {
  it('a unit is marked shared service from its row (undoable); without any, the tab says how', async () => {
    const s = freshStore(), { container } = render(<Organisation />);
    fireEvent.click(screen.getByLabelText('Delivery is a shared service'));
    expect(readStoredOrg(s.getState().portfolio.common.BPMN).units[0]!.service).toEqual({ skills: [], roles: [] });
    s.undo();
    expect(readStoredOrg(s.getState().portfolio.common.BPMN).units).toEqual([]);
    act(() => { fireEvent.keyDown(tab('Organisation'), { key: 'ArrowRight' }); });
    expect(tab('Services').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/No shared service yet/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('delivery, FTE and cost by product (the domain figures), the load against the capacity, the split rule; axe clean', async () => {
    const t = serviceThree(), { container } = render(<Organisation />);
    fireEvent.click(tab('Services'));
    const v = servicesView(t.pf())[0]!;
    expect(screen.getByRole('heading', { name: 'Service QA service' })).toBeTruthy();
    const delivery = screen.getByRole('table', { name: /What QA service delivers/ }), rows = within(delivery).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);   // the View is the active product
    expect(rows[0]!.textContent).toContain(fmtEur(v.products[0]!.cost));
    fireEvent.click(within(rows[0]!).getByRole('button', { name: '3 activities' }));
    expect(screen.getByRole('list', { name: /Activities QA service does for/ }).textContent).toContain('A023');
    expect(screen.getByText(/Load of QA service: peak/)).toBeTruthy();
    expect(screen.getByRole('table', { name: /Cost of QA service by product/ }).textContent).toContain('2 products outside the View');
    expect(await axeViolations(container)).toEqual([]);
    act(() => { setDisplayScope({ kind: 'portfolio' }); });
    expect(within(screen.getByRole('table', { name: /What QA service delivers/ })).getAllByRole('row')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Split of line 1 of QA service'), { target: { value: 'fixed' } });
    expect(lineRule(t.pf(), sharedLines(t.pf())[0]!)).toBe('fixed');
    expect(screen.getByRole('table', { name: /Cost of QA service/ }).textContent).toContain('fixed shares');
    t.s.undo();
    expect(lineRule(t.pf(), sharedLines(t.pf())[0]!)).toBe('effort');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('activity types and roles are checkboxes; a line leaves the service and comes back', () => {
    const t = serviceThree();
    render(<Organisation />);
    fireEvent.click(tab('Services'));
    const types = screen.getByRole('group', { name: 'Activity types done by QA service' });
    fireEvent.click(within(types).getByLabelText('Dev'));
    expect(readStoredOrg(t.pf().common.BPMN).units.find((u) => u.id === 'qa')!.service!.skills).toEqual(['Test/QA', 'Dev']);
    fireEvent.click(screen.getByRole('button', { name: 'Move line 1 of QA service to the delivery unit' }));
    expect(sharedLines(t.pf())[0]!.unit).toBeUndefined();
    expect(uiStore.getState().toast).toContain('delivery unit');
    fireEvent.change(screen.getByLabelText('Move a shared line to QA service'), { target: { value: t.line } });
    expect(sharedLines(t.pf())[0]).toMatchObject({ unit: 'qa', split: 'effort' });
  });
});
