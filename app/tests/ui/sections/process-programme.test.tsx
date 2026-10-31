// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MILESTONE_NAMES, PROGRAMME_ACTIVITIES } from '@/domain/programme';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { processView } from '@/ui/sections/scope/process/view';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * 🧩 Process, phase B9a (docs/SPEC_BPMN.md § 19.7 F-B70): the transformation programme under the delivery process: a diagram with a swim lane per
 * role (the agents in their own lane), the table alternative, the parameter panel of the selected activity (each edit one undoable step on the
 * key that holds the value in B9a), axe clean.
 */
const prog = (): HTMLElement => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === 'Transformation programme')!;
const vals = () => appStore().getState().doc.dom.values;
beforeEach(() => { freshStore(); processView.setState({ ...processView.getInitialState() }); });
afterEach(cleanup);

describe('Process section: the transformation programme', { timeout: 90_000 }, () => {
  it('draws the programme with its lanes, phases and activities, described by its table', () => {
    render(<Process />);
    const p = prog(), svg = p.querySelector('svg[role=img]')!;
    expect(document.getElementById(svg.getAttribute('aria-labelledby')!)?.textContent).toBe('Diagram of the transformation programme');
    expect(svg.querySelectorAll('.ac-bpmn-activity')).toHaveLength(PROGRAMME_ACTIVITIES.length);
    expect([...svg.querySelectorAll('.ac-bpmn-lane text')].map((t) => t.textContent)).toContain('AI agents');
    expect(svg.querySelectorAll('.ac-bpmn-edge.is-message').length).toBeGreaterThanOrEqual(2);
    expect(p.querySelectorAll('.ac-prog-table tbody tr')).toHaveLength(PROGRAMME_ACTIVITIES.length + MILESTONE_NAMES.length);
    expect(svg.querySelectorAll('.ac-bpmn-gateway')).toHaveLength(3);   // the maturity gates L1 → L2 → L3 → L4
    expect(document.querySelectorAll('.ac-proc-table tbody tr')).toHaveLength(100);   // the delivery table is unchanged
  });
  it('selecting an activity opens its parameter panel; each edit is one undoable step on its key', () => {
    render(<Process />);
    const p = prog();
    fireEvent.click(p.querySelector<HTMLButtonElement>('[aria-label="Select Pilot"]')!);
    expect(p.textContent).toContain('A pilot pod proves the agentic factory');
    expect(p.querySelector('.ac-proc-live')?.textContent).toContain('Selected: prog-pilot Pilot');
    const weeks = [...p.querySelectorAll('label')].find((l) => l.textContent?.startsWith('Prove weeks'))!.querySelector('input')!;
    const n = appStore().getState().history.undo.length;
    fireEvent.change(weeks, { target: { value: '14' } });
    fireEvent.blur(weeks);
    expect(vals().pilotWeeks).toBe('14');
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    expect(p.textContent).toContain('18 weeks (14 prove + 2 × 2 break-in)');
    act(() => { appStore().undo(); });
    expect(vals().pilotWeeks).not.toBe('14');
  });
  it('is axe clean with the parameter panel open', async () => {
    const { container } = render(<Process />);
    fireEvent.click(prog().querySelector<HTMLButtonElement>('[aria-label="Select Knowledge Hub setup"]')!);
    expect(await axeViolations(container)).toEqual([]);
  });
});
