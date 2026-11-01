// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
import { exportAuditDoc, readAudit, withoutAudit } from '@/domain/audit';
import { serialize } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import Audit from '@/ui/sections/frame/audit';
import { auditView } from '@/ui/sections/frame/audit/view';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * SPEC_FIXES FX-21 (F-B69): programme activities take an audit like delivery activities, kept in the collaboration (`ac:programmeAudit`); one
 * undoable step per edit; it travels with save / open and a BPMN export with audit data, and is left out of one without.
 */
afterEach(() => { cleanup(); auditView.setState({ selected: null }); });
const bpmn = (s: ReturnType<typeof freshStore>) => s.getState().portfolio.common.BPMN;
const commit = (label: string, value: string) => { const el = screen.getByLabelText(label); fireEvent.change(el, { target: { value } }); fireEvent.blur(el); };

describe('audit of the programme activities', () => {
  it('the Programme tab lists the activities; an observation is one step kept in ac:programmeAudit; undo restores; axe clean', async () => {
    const s = freshStore(), { container } = render(<Audit />);
    fireEvent.click(screen.getByRole('tab', { name: 'Programme' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilot' }));
    expect(screen.getByRole('heading', { name: 'Audit of programme activity Pilot' })).toBeTruthy();
    const steps = s.getState().history.undo.length;
    commit('Rework rate', '15');
    expect(readAudit(bpmn(s)).elements.get('prog-pilot')!.observations[0]).toMatchObject({ name: 'reworkRate', value: '15' });
    expect(serialize(bpmn(s))).toMatch(/<ac:programmeAudit>\s*<ac:audit element="prog-pilot">/);
    expect(s.getState().history.undo.length).toBe(steps + 1);
    expect(s.getState().history.undo.at(-1)?.type).toBe('audit.editProgramme');
    expect(await axeViolations(container)).toEqual([]);
    s.undo();
    expect(readAudit(bpmn(s)).elements.has('prog-pilot')).toBe(false);
  });
  it('save -> open keeps it; a BPMN export carries it only with audit data; an unknown programme id is refused', () => {
    const s = freshStore();
    expect(editAudit('prog-pilot', { kind: 'painPoint', point: { text: 'Harness unstable', severity: 3 } })).toBe(true);
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(s.getState().portfolio, () => new Date(0)))) as Record<string, unknown>;
    expect(readAudit(openChecked(saved).portfolio.common.BPMN).elements.get('prog-pilot')!.painPoints).toEqual([{ text: 'Harness unstable', severity: 3 }]);
    const withAudit = parseBpmn(serialize(exportAuditDoc(bpmn(s), true))).doc!;
    expect(readAudit(withAudit).elements.get('prog-pilot')!.painPoints).toHaveLength(1);
    expect(readAudit(withoutAudit(bpmn(s))).elements.has('prog-pilot')).toBe(false);
    expect(editAudit('prog-nothing', { kind: 'painPoint', point: { text: 'x', severity: 1 } })).toBe(false);
  });
});
