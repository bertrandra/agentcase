// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readRaci, type Raci } from '@/domain/org';
import { readProcess } from '@/domain/process';
import Studio from '@/ui/sections/scope/process-studio';
import { cellOf, cycled } from '@/ui/sections/scope/process-studio/RolesTab';
import { mapLayout, phaseLanes, phaseStats } from '@/ui/sections/scope/process-studio/model';
import { rowsOf } from '@/ui/sections/scope/process/tableModel';
import { axeViolations } from '../../helpers/axe';
import { resetStudioTest, studioDoc, studioTab } from '../../helpers/processStudio';
import { freshStore } from '../../store/helpers';

/**
 * 🗺️ Process studio (owner's request 2026-11-13): a second section on the process model — Map, Phase focus, Activities, Roles & decisions, the pure
 * BPMN diagram, the Programme (timeline or BPMN). Every edit is the 🧩 Process section's command (one undoable step); every tab axe clean.
 */
afterEach(resetStudioTest);
const doc = studioDoc;
const act0 = (s: ReturnType<typeof freshStore>, id: string) => readProcess(doc(s)).activities.find((a) => a.id === id)!;
const tab = studioTab;

describe('process studio model', () => {
  it('the V: V<n> phases down then up, the others on the rail, the cross-cutting phase as a band; the lanes of a phase', () => {
    const s = freshStore(), rows = rowsOf(doc(s)), stats = phaseStats(readProcess(doc(s)).phases, rows), lay = mapLayout(stats);
    expect(lay.v.map((x) => `${x.stat.id}@${x.row},${x.col}`)).toEqual(['V1@1,1', 'V2@2,2', 'V3@3,3', 'V4@4,4', 'V5@3,5', 'V6@2,6', 'V7@1,7']);
    expect(lay.before.map((x) => x.id)).toEqual(['L0']);
    expect(lay.after.map((x) => x.id)).toEqual(['L8', 'L9', 'L10']);
    expect(lay.band.map((x) => x.id)).toEqual(['Cross-cutting']);
    expect(stats.reduce((t, x) => t + x.inScope, 0)).toBe(10);
    const { acts, lanes } = phaseLanes(rows, 'V3', false, () => undefined);
    expect(acts.map((a) => a.id)).toEqual(['A017', 'A018', 'A019']);
    expect(lanes.every((l) => l.cells.length === 3)).toBe(true);
    expect(lanes.flatMap((l) => l.cells.filter(Boolean).map((c) => c!.id)).sort()).toEqual(['A017', 'A018', 'A019']);
  });
  it('the RACI cycle: R → A → R·A → C → I → none, one Accountable', () => {
    let r: Raci = { R: [], A: 'x', C: [], I: [] };
    const seen = [];
    for (let i = 0; i < 6; i++) { r = cycled(r, 'y'); seen.push(cellOf(r, 'y')); }
    expect(seen).toEqual(['R', 'A', 'RA', 'C', 'I', '']);
    expect(cycled(cycled({ R: [], A: 'x', C: [], I: [] }, 'y'), 'y').A).toBe('y');   // taking A moves it
  });
});

describe('🗺️ Process studio', () => {
  it('map: the phases, a phase switched off and on (undo), the phase opened in Phase focus; axe clean', async () => {
    const s = freshStore(), { container } = render(<Studio />);
    expect(screen.getByRole('region', { name: 'Key figures' }).textContent).toContain('10 of 423');
    fireEvent.click(screen.getByRole('button', { name: /^V3 Implementation/ }));
    expect(screen.getByRole('heading', { name: 'V3 · Implementation' })).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Switch the phase off' }));
    expect(readProcess(doc(s)).phases.find((p) => p.id === 'V3')!.inScope).toBe(false);
    s.undo();
    expect(readProcess(doc(s)).phases.find((p) => p.id === 'V3')!.inScope).not.toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Open the phase' }));
    expect(screen.getByRole('tab', { name: 'Phase focus' }).getAttribute('aria-selected')).toBe('true');
  });

  it('phase focus: lanes in flow order; the inspector edits scope, AI authority and the split as single steps; axe clean', async () => {
    const s = freshStore(), { container } = render(<Studio />);
    tab('Phase focus');
    fireEvent.change(screen.getByLabelText('Phase'), { target: { value: 'V3' } });
    fireEvent.click(screen.getByRole('button', { name: /^A017 Source code/ }));
    const insp = screen.getByRole('complementary', { name: 'A017 · Source code' });
    expect(await axeViolations(container)).toEqual([]);
    const steps = s.getState().history.undo.length;
    fireEvent.change(within(insp).getByLabelText('AI authority'), { target: { value: 'Copilot' } });
    expect(act0(s, 'A017').aiAuthority).toBe('Copilot');
    fireEvent.change(within(insp).getByLabelText('Agent share of the supervision split (%)'), { target: { value: '40' } });
    expect([act0(s, 'A017').agent, act0(s, 'A017').human]).toEqual([40, 60]);
    fireEvent.click(within(insp).getByRole('checkbox'));
    expect(act0(s, 'A017').inScope).toBe(false);
    expect(s.getState().history.undo.length).toBe(steps + 3);
    fireEvent.click(screen.getByRole('button', { name: /^Show out-of-scope/ }));
    expect(await axeViolations(container)).toEqual([]);
  });

  it('activities: grouped by phase, views; ticked rows change together as ONE step; axe clean', async () => {
    const s = freshStore(), { container } = render(<Studio />);
    tab(/^Activities/);
    expect(screen.getAllByRole('checkbox', { name: /^Tick / })).toHaveLength(10);
    fireEvent.click(screen.getByLabelText('Tick A008'));
    fireEvent.click(screen.getByLabelText('Tick A009'));
    const bulk = screen.getByRole('region', { name: 'Change the ticked activities' });
    fireEvent.change(within(bulk).getByLabelText('AI authority'), { target: { value: 'Autonomous' } });
    const steps = s.getState().history.undo.length;
    fireEvent.click(within(bulk).getByRole('button', { name: 'Apply' }));
    expect([act0(s, 'A008').aiAuthority, act0(s, 'A009').aiAuthority]).toEqual(['Autonomous', 'Autonomous']);
    expect(s.getState().history.undo.length).toBe(steps + 1);
    fireEvent.click(within(bulk).getByRole('button', { name: 'Take out of scope' }));
    expect([act0(s, 'A008').inScope, act0(s, 'A009').inScope]).toEqual([false, false]);
    s.undo(); s.undo();
    expect(act0(s, 'A008').aiAuthority).not.toBe('Autonomous');
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /^All 423/ }));
    expect(await axeViolations(container)).toEqual([]);
  });

  it('roles: a RACI cell cycles (one step), decisions; BPMN diagram and programme tabs render; axe clean', async () => {
    const s = freshStore(), { container } = render(<Studio />);
    tab('Roles & decisions');
    const role = readRaci(doc(s)).find((a) => a.id === 'A017')!.raci.R[0]!, name = readProcess(doc(s)).actors.find((a) => a.id === role)!.name;
    const cell = screen.getByRole('button', { name: new RegExp(`^${name.replace(/[/]/g, '\\/')} on A017:`) });
    expect(cell.textContent).toContain('R·A');
    fireEvent.click(cell);   // R·A → C: no Responsible left, A dropped
    expect(readRaci(doc(s)).find((a) => a.id === 'A017')!.raci.C).toContain(role);
    s.undo();
    expect(readRaci(doc(s)).find((a) => a.id === 'A017')!.raci.R).toEqual([role]);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Decisions' }));
    expect(screen.getByRole('heading', { name: 'Decisions' })).toBeTruthy();
    tab('BPMN diagram');
    expect(screen.getByRole('img', { name: /Diagram of the delivery process/ })).toBeTruthy();
    tab('Programme');
    expect(screen.getByRole('img', { name: /^Programme timeline/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pilot', exact: true } as never));
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'BPMN diagram' }));
    expect(screen.getByRole('heading', { name: 'Transformation programme' })).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });
});
