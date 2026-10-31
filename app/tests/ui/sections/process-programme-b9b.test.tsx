// @vitest-environment jsdom
import { caseValues } from '@/domain/process';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { optInDef } from '@/domain/programme';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { appStore } from '@/store/instance';
import Process from '@/ui/sections/scope/process';
import { processView } from '@/ui/sections/scope/process/view';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * 🧩 Process, phase B9b (docs/SPEC_BPMN.md § 19.2, § 19.7; D-B31): the opt-in activities (the four agent-rollout activities among them) are programme
 * tasks with their panel; off by default (no figure moves), switched on in the panel (one undoable step), their cost enters the setup.
 */
const prog = (): HTMLElement => [...document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === 'Transformation programme')!;
const total = () => setupBreakdown(makeCtx(appStore().getState().doc)).total;
beforeEach(() => { freshStore(); processView.setState({ ...processView.getInitialState() }); });
afterEach(cleanup);

describe('Process section: the opt-in programme activities (B9b)', { timeout: 90_000 }, () => {
  it.each(['Licence procurement', 'Agent-toolchain integration', 'Rollout hypercare', 'Legacy decommissioning'])('%s is a programme task, off', (name) => {
    render(<Process />);
    const p = prog();
    fireEvent.click(p.querySelector<HTMLButtonElement>(`[aria-label="Select ${name}"]`)!);
    const panel = [...p.querySelectorAll('.ac-proc-panel')].find((s) => s.querySelector('h3')?.textContent === name)!;
    expect(panel.textContent).toContain('Off (default): not in the programme cost');
    expect(panel.textContent).toContain('New cost from resources, off by default (D-B31)');
    expect(panel.querySelector('select')!.value).toBe('');
  });
  it('switching hypercare on adds its cost to the setup (one undoable step), off again restores it', async () => {
    render(<Process />);
    const p = prog(), before = total(), n = appStore().getState().history.undo.length;
    fireEvent.click(p.querySelector<HTMLButtonElement>('[aria-label="Select Rollout hypercare"]')!);
    const sel = [...p.querySelectorAll('label')].find((l) => l.textContent?.startsWith('Include rollout hypercare'))!.querySelector('select')!;
    act(() => { fireEvent.change(sel, { target: { value: 'on' } }); });
    expect(caseValues(appStore().getState().doc)[optInDef('hypercare').on]).toBe('on');
    expect(appStore().getState().history.undo.length).toBe(n + 1);
    const c = makeCtx(appStore().getState().doc), rate = setupBreakdown(c).lines.find((l) => l.id === 'hypercare')!.amount;
    expect(total() - before).toBeCloseTo(rate, 6);
    expect(rate).toBeGreaterThan(0);
    expect(prog().textContent).toContain('In the programme cost');
    expect(await axeViolations(prog())).toEqual([]);
    act(() => { appStore().undo(); });
    expect(total()).toBeCloseTo(before, 6);
  });
});
