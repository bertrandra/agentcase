// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editAudit, setHeader } from '@/controllers/audit';
import { readAudit } from '@/domain/audit';
import { readProcess } from '@/domain/process';
import { setAuditUnit } from '@/store/auditScope';
import Audit from '@/ui/sections/frame/audit';
import { resetAuditView } from '@/ui/sections/frame/audit/view';
import { BpmnExportPanel } from '@/ui/shell/BpmnExport';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * The 🔎 Audit section (docs/SPEC_BPMN.md F-B31; redesign and audit scope, owner's request 2026-11-13): the scope bar, the cockpit, the planner
 * matrix, the interview sheet, the insights with the impact of a calibration computed first. Every edit is one undoable command; axe clean.
 */
afterEach(() => { cleanup(); act(() => { resetAuditView(); setAuditUnit(null); }); });
const bpmn = (s: ReturnType<typeof freshStore>) => s.getState().portfolio.common.BPMN;
const tab = (name: string | RegExp) => fireEvent.click(screen.getByRole('tab', { name }));
const commit = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.change(el, { target: { value } }); fireEvent.blur(el); };

describe('🔎 Audit', () => {
  it('cockpit: the header is edited in place; a tile opens the activity form; an observation and a tool are written; undo restores; axe clean', async () => {
    const s = freshStore(), { container } = render(<Audit />);
    expect(screen.getByRole('region', { name: 'Key figures' }).textContent).toContain('0 / 10');
    expect(screen.getByText('📁 Files').closest('details')!.open).toBe(false);   // the files, collapsed by default (owner, 2026-11-03)
    expect(screen.queryByRole('button', { name: '+ Add interview' })).toBeNull();   // interviews are planned in Plan only
    fireEvent.click(screen.getByText('Edit the audit header and the auditors'));
    commit('Client', 'Acme');
    expect(readAudit(bpmn(s)).header).toMatchObject({ code: 'AUDIT-1', client: 'Acme', status: 'planned' });
    fireEvent.click(screen.getByRole('button', { name: /^A017 Source code .*, Not audited$/ }));
    expect(screen.getByRole('tab', { name: 'Activities & roles' }).getAttribute('aria-selected')).toBe('true');
    commit('Rework rate', '20');
    expect(readAudit(bpmn(s)).elements.get('A017')!.observations[0]).toMatchObject({ name: 'reworkRate', value: '20' });
    fireEvent.click(screen.getByLabelText(/GitHub Copilot/));
    expect(readAudit(bpmn(s)).elements.get('A017')!.tools.map((t) => t.ref)).toEqual(['github-copilot']);
    expect(await axeViolations(container)).toEqual([]);
    s.undo(); s.undo(); s.undo();
    expect(readAudit(bpmn(s)).header).toBeUndefined();
    expect(readAudit(bpmn(s)).elements.size).toBe(0);
  });

  it('plan: cells of the matrix make the draft; Create writes the interview; the pipeline and the next interview show it; axe clean', async () => {
    const s = freshStore(), { container } = render(<Audit />), v = readProcess(bpmn(s));
    act(() => { setHeader({ auditors: [{ name: 'Ann Lee' }] }); });
    tab('Plan');
    const esc = (x: string) => x.replace(/[/]/g, '\\/');
    const cell = (name: string, act: string, say: string) => screen.getByRole('button', { name: new RegExp(`^${esc(name)} on ${act}, ${say}`) });
    const role = v.actors.find((a) => screen.queryByRole('button', { name: new RegExp(`^${esc(a.name)} on A017, the role does it`) }))!;
    fireEvent.click(cell(role.name, 'A017', 'the role does it'));
    fireEvent.click(cell(role.name, 'A018', 'the role does it'));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText('Auditor'), { target: { value: 'Ann Lee' } });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Create INT-1' }));
    expect(readAudit(bpmn(s)).header!.interviews).toEqual([{ code: 'INT-1', role: role.name, date: '2026-11-20', roles: [role.id],
      activities: ['A017', 'A018'], auditor: 'Ann Lee' }]);
    expect(cell(role.name, 'A017', 'in INT-1')).toBeTruthy();
    tab('Cockpit');
    const pipe = screen.getByRole('region', { name: 'Planned interviews' });
    expect(within(pipe).getByRole('button', { name: /^Open interview INT-1/ }).textContent).toContain('0 / 2');
    expect(screen.getByRole('button', { name: 'Start INT-1' })).toBeTruthy();
  });

  it('interview sheet: the auditor\'s interviews, an activity, a block; a new value takes the defaults; confidence; status; axe clean', async () => {
    const s = freshStore(), v = readProcess(bpmn(s)), role = v.actors[0]!;
    act(() => {
      setHeader({ auditors: [{ name: 'Ann' }, { name: 'Bob' }] });
      setHeader({ interviews: [{ code: 'INT-1', role: role.name, date: '2026-11-03', roles: [role.id], activities: ['A017', 'A018'], auditor: 'Ann' },
        { code: 'INT-2', role: 'Ops', date: '2026-11-04', auditor: 'Bob' }] });
    });
    const { container } = render(<Audit />);
    tab(/^Interview/);
    fireEvent.change(screen.getByLabelText('I am (auditor)'), { target: { value: 'Ann' } });
    const rail = screen.getByRole('navigation', { name: 'My interviews' });
    expect(within(rail).queryByText('INT-2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'A018 · Code review' }));
    fireEvent.click(screen.getByRole('button', { name: /^Quality and rework/ }));
    commit('Rework rate', '30');
    const o = readAudit(bpmn(s)).elements.get('A018')!.observations[0]!;
    expect(o).toMatchObject({ name: 'reworkRate', value: '30', source: 'interview' });
    expect(o.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.click(within(screen.getByRole('group', { name: 'Rework rate: confidence' })).getByRole('button', { name: 'High' }));
    expect(readAudit(bpmn(s)).elements.get('A018')!.observations[0]!.confidence).toBe('high');
    fireEvent.change(screen.getByLabelText('Audit status of A018'), { target: { value: 'closed' } });
    expect(readAudit(bpmn(s)).elements.get('A018')!.status).toBe('closed');
    expect(screen.getByRole('navigation', { name: 'My interviews' }).textContent).toContain('INT-1');
    expect(await axeViolations(container)).toEqual([]);
    for (const part of ['Tools in use', 'Pain points and evidence', 'Time']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${part}`) }));
      expect(await axeViolations(container)).toEqual([]);
    }
  });

  it('insights: proposals with their formula, the impact computed before Apply, only the ticked one applied and logged; axe clean', async () => {
    const s = freshStore(), prob = () => readProcess(bpmn(s)).flows.find((f) => f.id === 'LP001')!.rework!.probability;
    act(() => { editAudit('A017', { kind: 'observation', obs: { name: 'reworkRate', value: '20' } }); });
    const { container } = render(<Audit />);
    tab('Insights & calibration');
    expect(screen.getAllByText('observed rework rate 20 % / 100')).toHaveLength(2);   // LP001 and LP002 rework A017
    const before = prob();
    fireEvent.click(screen.getByLabelText('Accept probability of LP001'));
    expect(screen.getByRole('status', { name: 'Impact of the accepted changes' }).textContent).toMatch(/Computed on .* before anything is applied/);
    expect(prob()).toBe(before);   // the preview applies nothing
    fireEvent.click(screen.getByRole('button', { name: /Apply 1 accepted change/ }));
    expect([before, prob()]).toEqual([0.1, 0.2]);
    expect(readAudit(bpmn(s)).header!.calibrations[0]!.changes.map((c) => c.element)).toEqual(['LP001']);
    expect(await axeViolations(container)).toEqual([]);
    for (const t of ['Tool catalogue', 'Activities & roles', 'Cockpit']) { tab(t); expect(await axeViolations(container)).toEqual([]); }
  });

  it('insights: an effort calibration moves the headline figures in the preview, nothing applied until Apply', () => {
    const s = freshStore(), effort = () => readProcess(bpmn(s)).activities.find((x) => x.id === 'A022')!.effort;
    act(() => {
      for (const [id, h] of [['A022', '40'], ['A023', '2']] as const) {
        editAudit(id, { kind: 'observation', obs: { name: 'effortPerItem', value: h } });
        editAudit(id, { kind: 'observation', obs: { name: 'itemsPerPeriod', value: '10', per: 'month' } });
      }
    });
    render(<Audit />);
    tab('Insights & calibration');
    const before = effort();
    fireEvent.click(screen.getByLabelText('Accept effort of A022'));
    fireEvent.click(screen.getByLabelText('Accept effort of A023'));
    expect(screen.getByRole('status', { name: 'Impact of the accepted changes' }).textContent).toMatch(/becomes/);
    expect(effort()).toBe(before);
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
});
