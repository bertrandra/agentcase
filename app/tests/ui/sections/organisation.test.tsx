// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { raciOverridesOf, readRaci, readStoredOrg } from '@/domain/org';
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
