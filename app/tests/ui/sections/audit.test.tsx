// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
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
const commit = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.change(el, { target: { value } }); fireEvent.blur(el); };

describe('🔎 Audit', () => {
  it('header, an observation and a proposed tool of an activity are written to the document; undo restores; axe clean', async () => {
    const s = freshStore(), { container } = render(<Audit />);
    commit('Client', 'Acme');
    expect(readAudit(bpmn(s)).header).toMatchObject({ code: 'AUDIT-1', client: 'Acme', status: 'planned' });
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
    fireEvent.click(screen.getByRole('tab', { name: 'Coverage and calibration' }));
    expect(screen.getAllByText('observed rework rate 20 % / 100', { selector: 'td' })).toHaveLength(2);   // LP001 and LP002 rework A017
    const before = effort();
    fireEvent.click(screen.getByLabelText('Accept probability of LP001'));
    fireEvent.click(screen.getByRole('button', { name: /Apply 1 accepted change/ }));
    expect([before, effort()]).toEqual([0.1, 0.2]);
    expect(readAudit(bpmn(s)).header!.calibrations[0]!.changes.map((c) => c.element)).toEqual(['LP001']);
    expect(await axeViolations(container)).toEqual([]);
    for (const tab of ['Roles', 'Tool catalogue', 'Activities']) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
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
});
