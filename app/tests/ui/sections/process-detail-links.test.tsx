// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCtx, phaseRows, regOfActiveNorms } from '@/domain';
import { readProcess } from '@/domain/process';
import { activityDef, LINKED_SECTION, MILESTONE_NAMES, programmeActivityId, programmeProcess } from '@/domain/programme';
import { appStore } from '@/store/instance';
import { ActivityPanel } from '@/ui/sections/scope/process/ActivityPanel';
import { ParamPanel } from '@/ui/sections/scope/process/programme/ParamPanel';
import { processView } from '@/ui/sections/scope/process/view';
import Programme from '@/ui/sections/scope/programme';
import { programmeScreen } from '@/ui/sections/scope/programme/view';
import ScopeSel from '@/ui/sections/scope/scope-sel';
import { focusArtefact, scopeFocus, withFocused } from '@/ui/sections/scope/scope-sel/focus';
import { uiStore } from '@/ui/uiState';
import { ActivityRefs } from '@/ui/widgets/ActivityRefs';
import { sectionById } from '@/ui/zones/registry';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * Links from the Process map to the activity's detail screen (SPEC_BPMN § 19.7, 2026-10-31): the panel's link opens the screen focused on the
 * activity (row highlighted, keyboard focus on it), the screen links back (Open in Process). View state only: no undo step, nothing in the case.
 */
const doc = () => appStore().getState().doc;
const steps = () => appStore().getState().history.undo.length;
const label = (id: string) => sectionById(id)!.label;
const click = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', { name })); });
beforeEach(() => {
  freshStore(); uiStore.setState({ activeSection: 'process' }); scopeFocus.setState({ id: null });
  processView.setState({ ...processView.getInitialState() }); programmeScreen.setState({ ...programmeScreen.getInitialState() });
});
afterEach(cleanup);

describe('Process → detail screen links', { timeout: 90_000 }, () => {
  it('a delivery activity opens its artefact row in Scope, highlighted and focused; the row links back to Process', async () => {
    const v = readProcess(doc().BPMN), a = v.activities.find((x) => !x.regulatory)!, before = steps(), json = JSON.stringify(doc().dom);
    render(<ActivityPanel doc={doc().BPMN} id={a.id} />);
    expect(screen.queryByRole('button', { name: `Open ${label('transform-params')}` })).toBeNull();
    click(`Open ${a.name} in ${label('scope-sel')}`);
    expect([uiStore.getState().activeSection, scopeFocus.getState().id]).toEqual(['scope-sel', a.id]);
    cleanup();
    const { container } = render(<ScopeSel />);
    const row = container.querySelector(`[data-art="${a.id}"]`)!;
    expect(row.classList.contains('is-focused')).toBe(true);
    expect(container.querySelectorAll('.ac-art.is-focused')).toHaveLength(1);
    expect(document.activeElement).toBe(row.querySelector('input[type=checkbox]'));
    expect(await axeViolations(container)).toEqual([]);
    click(`Open ${a.name} in Process`);
    expect([uiStore.getState().activeSection, processView.getState().selected]).toEqual(['process', a.id]);
    expect([steps(), JSON.stringify(doc().dom)]).toEqual([before, json]);
  });
  it('a regulatory activity also links its norm; one whose norm is not selected says so in Scope', () => {
    const c = makeCtx(doc()), v = readProcess(doc().BPMN), listed = new Set(c.a.reg.filter((r) => regOfActiveNorms(c, r.phase).includes(r)).map((r) => r.id));
    const reg = v.activities.find((x) => x.regulatory)!;
    render(<ActivityPanel doc={doc().BPMN} id={reg.id} />);
    click(`Open ${label('transform-params')}`);
    expect([uiStore.getState().activeSection, scopeFocus.getState().id]).toEqual(['transform-params', null]);
    cleanup();
    const off = c.a.reg.find((r) => !listed.has(r.id))!;
    expect(off).toBeDefined();   // the default case selects some norms only
    act(() => focusArtefact(off.id));
    render(<ScopeSel />);
    expect(screen.getByRole('status').textContent).toContain(`${off.id} · ${off.name} belongs to the norm`);
    click('Select the norm in Industry / regulatory profile');
    expect(uiStore.getState().activeSection).toBe('transform-params');
  });
  it('"show selected only" keeps the focused artefact in sight', () => {
    const c = makeCtx(doc()), out = c.a.sdlc.find((x) => !c.a.selected.has(x.id))!;
    const rows = withFocused(phaseRows(c, true), phaseRows(c, false), out.id);
    expect(rows.flatMap((r) => r.sdlcShown).some((x) => x.id === out.id)).toBe(true);
    expect(withFocused(phaseRows(c, true), phaseRows(c, false), null)).toEqual(phaseRows(c, true));
  });
  it('a programme activity opens its Programme row selected with its editor open, then its linked section', async () => {
    const v = programmeProcess(makeCtx(doc())), a = v.activities.find((x) => x.kind === 'setupCoaching')!, before = steps();
    render(<ParamPanel v={v} id={a.id} />);
    expect(screen.getByRole('button', { name: `Open ${label(LINKED_SECTION.setupCoaching!)}` })).toBeTruthy();
    click(`Open ${a.name} in ${label('programme')}`);
    expect(uiStore.getState().activeSection).toBe('programme');
    expect(programmeScreen.getState()).toMatchObject({ open: a.id, focus: a.id });
    cleanup();
    const { container } = render(<Programme />);
    const head = screen.getByRole('rowheader', { name: new RegExp(`^${a.name} —`) }), tr = head.closest('tr')!;
    expect([tr.classList.contains('is-focused'), tr.getAttribute('aria-current'), document.activeElement]).toEqual([true, 'true', head]);
    expect(document.getElementById(`prog-edit-${a.id}`)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
    act(() => { fireEvent.click(within(tr).getByRole('button', { name: `Open ${a.name} in Process` })); });
    expect([uiStore.getState().activeSection, processView.getState().selected, steps()]).toEqual(['process', a.id, before]);
  });
  it('the programme references of a context screen open the activity in Process and its row in Programme (selected, editor open)', async () => {
    const before = steps(), coaching = activityDef('setupCoaching')!.name, gate = MILESTONE_NAMES.find((m) => m.kind === 'gate-L2')!.name;
    const { container } = render(<ActivityRefs kinds={['setupCoaching', 'gate-L2']} />);
    expect(await axeViolations(container)).toEqual([]);
    click(`Open ${coaching} in Programme`);
    expect(uiStore.getState().activeSection).toBe('programme');
    expect(programmeScreen.getState()).toMatchObject({ open: programmeActivityId('setupCoaching'), focus: programmeActivityId('setupCoaching') });
    click(`Open ${gate} in Programme`);
    expect(programmeScreen.getState().focus).toBe(programmeActivityId('gate', 'L2'));
    click(`Open ${coaching} in Process`);
    expect([uiStore.getState().activeSection, processView.getState().selected, steps()]).toEqual(['process', programmeActivityId('setupCoaching'), before]);
  });
  it('a milestone and a gate open their Programme row; a linked section follows', () => {
    const v = programmeProcess(makeCtx(doc()));
    for (const m of [v.milestones.find((x) => x.element === 'milestone')!, v.milestones.find((x) => x.element === 'gateway')!]) {
      render(<ParamPanel v={v} id={m.id} />);
      const linked = LINKED_SECTION[m.kind];
      if (linked) expect(screen.getByRole('button', { name: `Open ${label(linked)}` })).toBeTruthy();
      click(`Open ${m.name} in ${label('programme')}`);
      cleanup();
      render(<Programme />);
      expect(screen.getByRole('rowheader', { name: new RegExp(`^${m.name} —`) }).closest('tr')!.classList.contains('is-focused')).toBe(true);
      cleanup();
    }
  });
});
