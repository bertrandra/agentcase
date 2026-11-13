// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
import { setDisplayScope } from '@/controllers/displayScope';
import { addOrgUnit } from '@/controllers/org';
import { addSharedLine } from '@/controllers/sharedTeam';
import { readAudit, unitAuditOf } from '@/domain/audit';
import { DEFAULT_UNIT_ID } from '@/domain/org';
import { type XDocument } from '@/domain/process';
import { setAuditUnit } from '@/store/auditScope';
import Audit from '@/ui/sections/frame/audit';
import { resetAuditView } from '@/ui/sections/frame/audit/view';
import { axeViolations } from '../../helpers/axe';
import { threeProducts } from '../../helpers/portfolioStore';
import { freshStore } from '../../store/helpers';

/**
 * The audit scope of the 🔎 Audit section (owner's request 2026-11-13): what is audited — a Product, the Portfolio, a Shared service or an
 * Organisation unit — sets what every view covers and where a value is recorded; with 2+ products the choice is the top bar's Show.
 */
afterEach(() => { cleanup(); act(() => { resetAuditView(); setAuditUnit(null); }); });
const tab = (name: string | RegExp) => fireEvent.click(screen.getByRole('tab', { name }));
const commit = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.change(el, { target: { value } }); fireEvent.blur(el); };

describe('🔎 Audit scope', () => {
  it('one case: Product and Org unit; a unit records in its own layer and shows what it inherits; axe clean', async () => {
    const s = freshStore(), common = () => s.getState().portfolio.common.BPMN as XDocument;
    act(() => { editAudit('A017', { kind: 'observation', obs: { name: 'reworkRate', value: '20' } }); });
    const { container } = render(<Audit />);
    const kinds = within(screen.getByRole('group', { name: 'What is audited' })).getAllByRole('button').map((b) => b.textContent);
    expect(kinds).toEqual(['Product', 'Org unit']);
    fireEvent.click(screen.getByRole('button', { name: 'Org unit' }));
    expect(screen.getByRole('button', { name: 'Org unit' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/the others inherited from Product 1/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^A017 Source code .*, Audited, inherited from Product 1$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^A017 Source code / }));
    commit('Rework rate', '35');
    expect(unitAuditOf(common(), DEFAULT_UNIT_ID).get('A017')!.observations[0]!.value).toBe('35');
    expect(readAudit(common()).elements.get('A017')!.observations[0]!.value).toBe('20');   // the case's own audit is untouched
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Product' }));
    expect(screen.getByRole('button', { name: 'Product' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('portfolio: the scope follows Show; a shared service narrows the views to its activities; an org unit does not calibrate', () => {
    const t = threeProducts(), [a, b] = t.ids;
    act(() => {
      addOrgUnit({ id: 'svc-qa', name: 'Test centre', type: 'centreOfExcellence', service: { skills: ['Test/QA'], roles: [] } });
      addSharedLine({ skill: 'Test/QA', unit: 'svc-qa', allocations: { [a!]: 50, [b!]: 50 } });
    });
    render(<Audit />);
    const kinds = within(screen.getByRole('group', { name: 'What is audited' })).getAllByRole('button').map((x) => x.textContent);
    expect(kinds).toEqual(['Portfolio', 'Product', 'Shared service', 'Org unit']);
    fireEvent.click(screen.getByRole('button', { name: 'Shared service' }));
    expect(t.s.getState().portfolio.displayScope).toEqual({ kind: 'unit', id: 'svc-qa' });
    const tiles = screen.getAllByRole('button', { name: /^A0\d\d / }).map((x) => x.textContent!.slice(0, 4));
    expect(tiles).toEqual(['A022', 'A023', 'A025']);
    expect(screen.getByText(/Serves Product 1, B/)).toBeTruthy();
    act(() => { setDisplayScope({ kind: 'unit', id: DEFAULT_UNIT_ID }); });
    tab('Insights & calibration');
    expect(screen.getByText(/is an organisation unit: its observations refine/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }));
    expect(t.s.getState().portfolio.displayScope).toEqual({ kind: 'portfolio' });
    tab('Cockpit');
    expect(screen.getByRole('heading', { name: /Audit by product/ })).toBeTruthy();
  });
});
