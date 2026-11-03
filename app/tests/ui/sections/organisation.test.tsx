// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { addOrgUnit } from '@/controllers/org';
import { afterEach, describe, expect, it } from 'vitest';
import { laneRolesOf, raciOverridesOf, readRaci, readStoredOrg } from '@/domain/org';
import Organisation from '@/ui/sections/frame/organisation';
import WhoDoesWhat from '@/ui/sections/scope/who-does-what';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';
import type { XDocument } from '@/domain/process';
import { threeProducts } from '../../helpers/portfolioStore';

/** Phase B6b screens (docs/SPEC_BPMN.md § 16.6): Organisation and Who does what, keyboard controls, undoable edits, axe clean. */
afterEach(cleanup);
const bpmn = (s: ReturnType<typeof freshStore>) => s.getState().portfolio.common.BPMN;

describe('🏢 Organisation', () => {
  it('lists the default unit, the product team and the role catalogue; adding and renaming a unit edits the document, undo restores', async () => {
    const s = freshStore(), { container } = render(<Organisation />);
    expect(screen.getAllByText(/delivery team/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Role catalogue/)).toBeTruthy();
    fireEvent.click(screen.getByText('+ Add a unit'));
    expect(readStoredOrg(bpmn(s)).units.map((u) => u.id)).toEqual(['unit-delivery', 'unit-1']);
    const name = screen.getByLabelText('Name of unit New unit');
    fireEvent.change(name, { target: { value: 'Vendor' } });
    fireEvent.blur(name);
    expect(readStoredOrg(bpmn(s)).units[1]!.name).toBe('Vendor');
    expect(await axeViolations(container)).toEqual([]);
    s.undo(); s.undo();
    expect(readStoredOrg(bpmn(s)).units).toEqual([]);
  });
});

describe('🏢 Organisation graph (owner\'s request 2026-11-02)', () => {
  it('draws the units and their teams; a unit selected on the canvas gets a unit below it, a new name and is removed; undo restores; axe clean', async () => {
    const s = freshStore(), { container } = render(<Organisation />), units = () => readStoredOrg(bpmn(s)).units;
    const nodes = within(screen.getByRole('group', { name: 'Units and teams' })).getAllByRole('button');
    expect(nodes.some((n) => / · unit /.test(n.getAttribute('aria-label') ?? ''))).toBe(true);
    expect(nodes.some((n) => / · team /.test(n.getAttribute('aria-label') ?? ''))).toBe(true);
    fireEvent.keyDown(nodes.find((n) => / · unit /.test(n.getAttribute('aria-label') ?? ''))!, { key: 'Enter' });
    fireEvent.click(screen.getByText('+ Add a unit below'));
    expect(units().map((u) => u.id)).toEqual(['unit-delivery', 'unit-1']);
    expect(units()[1]!.parent).toBe('unit-delivery');
    const name = screen.getByLabelText('Graph: name of unit New unit');
    fireEvent.change(name, { target: { value: 'QA centre' } });
    fireEvent.blur(name);
    expect(units()[1]!.name).toBe('QA centre');
    expect(screen.getByRole('group', { name: 'Units and teams' }).textContent).toContain('QA centre');
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByText('Remove this unit'));
    expect(units().map((u) => u.id)).toEqual(['unit-delivery']);
    s.undo();
    expect(units().map((u) => u.id)).toEqual(['unit-delivery', 'unit-1']);
  });
  it('a product moves to any unit from the graph (its team follows); a unit gets a new parent; each one undoable step (owner, 2026-11-03)', () => {
    const s = freshStore();
    render(<Organisation />);
    const units = () => readStoredOrg(bpmn(s)).units, nodes = () => within(screen.getByRole('group', { name: 'Units and teams' })).getAllByRole('button');
    act(() => {   // two departments under the default unit
      addOrgUnit({ id: 'unit-1', name: 'Dept A', type: 'department', parent: 'unit-delivery' });
      addOrgUnit({ id: 'unit-2', name: 'Dept B', type: 'department', parent: 'unit-delivery' });
    });
    const pick = (re: RegExp) => fireEvent.keyDown(nodes().find((n) => re.test(n.getAttribute('aria-label') ?? ''))!, { key: 'Enter' });
    pick(/ · team .*delivery team/);
    const owner = screen.getByRole('combobox', { name: /^Graph: owning unit of / });
    fireEvent.change(owner, { target: { value: 'unit-2' } });
    const team = screen.getAllByRole('row').find((r) => /delivery team/.test(r.querySelector('th')?.textContent ?? ''))!;
    expect(within(team).getAllByRole('cell')[0]!.textContent).toBe('Dept B');   // the team sits in its owning unit
    const n = s.getState().history.undo.length;
    pick(/ · unit Dept B$/);
    fireEvent.change(screen.getByLabelText('Parent'), { target: { value: 'unit-1' } });
    expect(units().find((u) => u.id === 'unit-2')!.parent).toBe('unit-1');
    expect(s.getState().history.undo.length).toBe(n + 1);
    s.undo(); s.undo();
    expect(units().find((u) => u.id === 'unit-2')!.parent).toBe('unit-delivery');
  });
});

describe('🧭 Who does what', () => {
  it('matrix filtered by phase, RACI editor saves an Accountable, checks listed; every view renders; axe clean', async () => {
    const s = freshStore(), { container } = render(<WhoDoesWhat />);
    fireEvent.change(screen.getByLabelText(/^Phase/), { target: { value: 'V3' } });
    fireEvent.click(screen.getByLabelText('Edit the RACI of A017'));
    fireEvent.change(screen.getByLabelText('Accountable'), { target: { value: 'role-lead' } });
    const split = screen.getByRole('group', { name: /^Split of the Responsible work between teams/ });   // FX-22
    fireEvent.change(within(split).getAllByRole('spinbutton')[0]!, { target: { value: '100' } });
    fireEvent.click(screen.getByText('Save the RACI'));
    expect(readRaci(bpmn(s)).find((a) => a.id === 'A017')!.raci.A).toBe('role-lead');
    expect(Object.values(readRaci(bpmn(s)).find((a) => a.id === 'A017')!.raci.teams ?? {})).toEqual([100]);
    expect(screen.getByText(/to confirm or for information/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    for (const tab of ['By activity', 'By role', 'By team', 'By unit', 'By product']) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(container.querySelector('.ac-org-answer')).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('tab', { name: 'By unit' }));   // FX-D7: the opt-in RACI-driven load and cost by unit
    fireEvent.click(screen.getByLabelText(/^Show the load and cost by unit/));
    expect(screen.getByRole('table', { name: 'RACI-driven load and cost by unit' }).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('🧭 Who does what in a portfolio (FX-D4)', () => {
  it('"For <product> only" saves the RACI for the product shown; "Back to the common RACI" removes it', () => {
    const t = threeProducts(), pf = () => t.s.getState().portfolio, product = pf().products.find((p) => p.id === pf().activeProductId)!;
    render(<WhoDoesWhat />);
    fireEvent.change(screen.getByLabelText(/^Phase/), { target: { value: 'V3' } });
    fireEvent.click(screen.getByLabelText('Edit the RACI of A017'));
    fireEvent.change(screen.getByLabelText('Accountable'), { target: { value: 'role-lead' } });
    fireEvent.click(screen.getByLabelText(`For ${product.name} only`));
    fireEvent.click(screen.getByText('Save the RACI'));
    expect(raciOverridesOf(pf().common.BPMN as XDocument, product.id).get('A017')?.A).toBe('role-lead');
    fireEvent.click(screen.getByText('Back to the common RACI'));
    expect(raciOverridesOf(pf().common.BPMN as XDocument, product.id).size).toBe(0);
  });
});

describe('🏢 Organisation: programme roles (FX-D11)', () => {
  it('each operating-model role picks the organisation role that staffs it (one undoable step)', () => {
    const s = freshStore();
    render(<Organisation />);
    fireEvent.change(screen.getByLabelText('Organisation role for Orchestrator'), { target: { value: 'role-lead' } });
    expect(laneRolesOf(s.getState().portfolio.common.BPMN as XDocument).get('orchestrator')).toBe('role-lead');
    expect((screen.getByLabelText('Organisation role for Orchestrator') as HTMLSelectElement).value).toBe('role-lead');
  });
});
