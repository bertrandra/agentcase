// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editAudit, setHeader } from '@/controllers/audit';
import { readAudit } from '@/domain/audit';
import { readProcess } from '@/domain/process';
import Audit from '@/ui/sections/frame/audit';
import { auditView } from '@/ui/sections/frame/audit/view';
import { BpmnExportPanel } from '@/ui/shell/BpmnExport';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/** Phase B7 screen (docs/SPEC_BPMN.md F-B31): the 🔎 Audit section edits the audit with the keyboard controls, calibrates on request, axe clean. */
afterEach(() => { cleanup(); act(() => auditView.setState({ selected: null, accepted: [], report: null })); });
const bpmn = (s: ReturnType<typeof freshStore>) => s.getState().portfolio.common.BPMN;
/** Opens a tab (the four top tabs: Audit setup, Audit run / interview, Audit progress, Audit potential scopes; then their own tabs). */
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const commit = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.change(el, { target: { value } }); fireEvent.blur(el); };

describe('🔎 Audit', () => {
  it('header, an observation and a proposed tool of an activity are written to the document; undo restores; axe clean', async () => {
    const s = freshStore(), { container } = render(<Audit />);
    commit('Client', 'Acme');
    expect(readAudit(bpmn(s)).header).toMatchObject({ code: 'AUDIT-1', client: 'Acme', status: 'planned' });
    tab('Audit run / interview'); tab('Audit activity');
    fireEvent.click(screen.getByRole('button', { name: /^A017 · / }));
    commit('Rework rate', '20');
    expect(readAudit(bpmn(s)).elements.get('A017')!.observations[0]).toMatchObject({ name: 'reworkRate', value: '20' });
    fireEvent.click(screen.getByLabelText(/GitHub Copilot/));
    expect(readAudit(bpmn(s)).elements.get('A017')!.tools.map((t) => t.ref)).toEqual(['github-copilot']);
    expect(await axeViolations(container)).toEqual([]);
    s.undo(); s.undo(); s.undo();
    expect(readAudit(bpmn(s)).header).toBeUndefined();
    expect(readAudit(bpmn(s)).elements.size).toBe(0);
  });
  it('calibration: proposals with their formula, only the ticked one is applied and logged; every tab renders, axe clean', async () => {
    const s = freshStore(), effort = () => readProcess(bpmn(s)).flows.find((f) => f.id === 'LP001')!.rework!.probability;
    act(() => { editAudit('A017', { kind: 'observation', obs: { name: 'reworkRate', value: '20' } }); });
    act(() => { editAudit('A017', { kind: 'observation', obs: { name: 'automationLevel', value: 'agentic' } }); });
    const { container } = render(<Audit />);
    tab('Audit potential scopes');
    expect(screen.getAllByText('observed rework rate 20 % / 100', { selector: 'td' })).toHaveLength(2);   // LP001 and LP002 rework A017
    const before = effort();
    fireEvent.click(screen.getByLabelText('Accept probability of LP001'));
    fireEvent.click(screen.getByRole('button', { name: /Apply 1 accepted change/ }));
    expect([before, effort()]).toEqual([0.1, 0.2]);
    expect(readAudit(bpmn(s)).header!.calibrations[0]!.changes.map((c) => c.element)).toEqual(['LP001']);
    expect(await axeViolations(container)).toEqual([]);
    for (const path of [['Audit run / interview', 'Audit activity'], ['Audit run / interview', 'Roles'], ['Audit run / interview', 'Programme'],
      ['Audit setup', 'Tool catalogue'], ['Audit progress']]) {
      path.forEach(tab);
      expect(await axeViolations(container)).toEqual([]);
    }
  });
  it('the BPMN export dialog offers "Include audit data" only when the case has some, unticked (D-B14)', () => {
    freshStore();
    const { unmount } = render(<BpmnExportPanel onClose={() => undefined} />);
    expect(screen.queryByLabelText(/Include audit data/)).toBeNull();
    unmount();
    act(() => { editAudit('A017', { kind: 'observation', obs: { name: 'batchSize', value: '3' } }); });
    render(<BpmnExportPanel onClose={() => undefined} />);
    expect((screen.getByLabelText(/Include audit data/) as HTMLInputElement).checked).toBe(false);
  });
  it('audit activities (owner\'s request 2026-11-02): roles × activities, an auditor picks theirs and sees the context; progression traced; axe clean',
    async () => {
      const s = freshStore(), { container } = render(<Audit />), v = readProcess(bpmn(s)), role = v.actors[0]!, acts = v.activities.slice(0, 2);
      act(() => { setHeader({ auditors: [{ name: 'Ann' }, { name: 'Bob' }] }); });
      act(() => {
        setHeader({ interviews: [{ code: 'INT-1', role: role.name, date: '2026-11-03', roles: [role.id], activities: acts.map((a) => a.id), auditor: 'Ann' },
          { code: 'INT-2', role: 'Ops', date: '2026-11-04', auditor: 'Bob' }] });
      });
      expect(readAudit(bpmn(s)).header!.interviews[0]).toMatchObject({ roles: [role.id], activities: acts.map((a) => a.id), auditor: 'Ann' });
      tab('Audit run / interview');
      fireEvent.change(screen.getByLabelText('I am (auditor)'), { target: { value: 'Ann' } });
      expect(screen.queryByLabelText('Select INT-2')).toBeNull();
      fireEvent.click(screen.getByLabelText('Select INT-1'));
      const ctx = screen.getByRole('region', { name: 'Interview context' });
      expect(ctx.textContent).toContain(role.name);
      for (const a of acts) expect(ctx.textContent).toContain(a.id);
      expect(screen.queryByRole('tab', { name: 'Interview' })).toBeNull();   // one tab: the interview and the activities (owner, 2026-11-03)
      expect(screen.queryByRole('tab', { name: 'Activities' })).toBeNull();
      expect(screen.getByText(/^All in-scope activities/).closest('details')!.open).toBe(false);   // the full list is collapsed by default
      fireEvent.click(within(ctx).getByRole('button', { name: new RegExp(`^${acts[0]!.id} · `) }));   // a context activity opens its form
      expect(screen.getByRole('region', { name: new RegExp(`^Audit of ${acts[0]!.id} · `) })).toBeTruthy();
      expect(screen.getAllByRole('region', { name: /^Audit of / })).toHaveLength(1);
      expect(await axeViolations(container)).toEqual([]);
      tab('Audit progress');
      expect(screen.getByRole('row', { name: /INT-1/ }).textContent).toContain(`0 / ${acts.length}`);
      expect(screen.getByRole('row', { name: /INT-2/ })).toBeTruthy();   // every auditor by default
      tab('Audit setup');
      expect(screen.getByRole('button', { name: '+ Add audit activity' })).toBeTruthy();
      expect(await axeViolations(container)).toEqual([]);
    });
});
