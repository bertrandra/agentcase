// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readRaci, readStoredOrg } from '@/domain/org';
import Organisation from '@/ui/sections/frame/organisation';
import WhoDoesWhat from '@/ui/sections/scope/who-does-what';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

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
    fireEvent.click(screen.getByText('Save the RACI'));
    expect(readRaci(bpmn(s)).find((a) => a.id === 'A017')!.raci.A).toBe('role-lead');
    expect(screen.getByText(/to confirm or for information/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    for (const tab of ['By activity', 'By role', 'By team', 'By unit', 'By product']) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(container.querySelector('.ac-org-answer')).toBeTruthy();
    }
    expect(await axeViolations(container)).toEqual([]);
  });
});
