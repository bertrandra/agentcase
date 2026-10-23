// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ThemeAxes } from '@/domain/theme/axes';
import { applyThemeAxes } from '@/ui/themeAxes';
import { CheckInput, NumberInput, RangeInput, SelectInput } from '@/ui/widgets/fields';
import { nudge } from '@/ui/widgets/field/FieldNumber';
import { freshStore, snap } from '../store/helpers';

/**
 * Field* variants (docs/THEME.md §6): the controls axes switch the rendering, never the behaviour. Each variant dispatches the command the
 * native control dispatches (same type, same label, same document), undo restores it, and the roles / names are what assistive technology needs.
 */
afterEach(() => { applyThemeAxes({}); cleanup(); });
const MODES = [{ value: 'hybrid', label: 'Hybrid' }, { value: 'legacy', label: 'Legacy' }];

/** Render `ui` under the given axes on a fresh store, run `edit`, return what the store recorded. */
function outcome(axes: Partial<ThemeAxes>, ui: JSX.Element, edit: () => void) {
  const s = freshStore();
  applyThemeAxes(axes);
  render(ui);
  act(edit);
  const last = s.getState().audit.at(-1), out = { doc: snap(s), cmd: last && `${last.type}: ${last.label}` };
  act(() => { s.undo(); });
  const undone = snap(s);
  cleanup();
  return { ...out, undone, initial: snap(freshStore()) };
}
const same = (a: ReturnType<typeof outcome>, b: ReturnType<typeof outcome>) => {
  expect(b.cmd).toBe(a.cmd); expect(b.doc).toBe(a.doc); expect(b.undone).toBe(b.initial); expect(a.cmd).toBeTruthy();
};

describe('numeric family', () => {
  const ui = <NumberInput id="workdays" label="Working days / year" min={100} max={260} step={5} />;
  const native = () => outcome({}, ui, () => { fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '225' } }); });
  it('auto: the native number field, no group', () => {
    render(ui);
    expect(screen.getByRole('spinbutton', { name: 'Working days / year' })).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });
  it('stepper: a named group, − / + buttons, a spinbutton; + dispatches the same command as typing, undo restores', () => {
    const v = outcome({ controlsNumeric: 'stepper' }, ui, () => {
      expect(screen.getByRole('group', { name: 'Working days / year' })).toBeTruthy();
      expect(screen.getByRole('spinbutton', { name: 'Working days / year' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Increase Working days / year' }));
    });
    same(native(), v);
  });
  it('slider: role slider with the value as text; slider + field: both, the field types the same command', () => {
    const v = outcome({ controlsNumeric: 'slider' }, ui, () => {
      const s = screen.getByRole('slider', { name: 'Working days / year' });
      expect(s.getAttribute('aria-valuetext')).toBe('220');
      fireEvent.change(s, { target: { value: '225' } });
    });
    same(native(), v);
    const w = outcome({ controlsNumeric: 'slider-field' }, ui, () => {
      expect(screen.getByRole('slider', { name: 'Working days / year' })).toBeTruthy();
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Working days / year (value)' }), { target: { value: '225' } });
    });
    same(native(), w);
  });
  it('a slider needs bounds: an unbounded number stays a number field', () => {
    freshStore(); applyThemeAxes({ controlsNumeric: 'slider' });
    render(<NumberInput id="workdays" label="Working days / year" step={5} />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('spinbutton')).toBeTruthy();
  });
  it('a native slider can become a number field or a stepper (same command)', () => {
    const slider = <RangeInput id="khA0" label="Maturity" min={0} max={4} step={1} unit="" />;
    const nat = outcome({}, slider, () => { fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } }); });
    same(nat, outcome({ controlsNumeric: 'number' }, slider, () => { fireEvent.change(screen.getByRole('spinbutton', { name: 'Maturity' }), { target: { value: '3' } }); }));
    same(nat, outcome({ controlsNumeric: 'stepper' }, slider, () => { fireEvent.click(screen.getByRole('button', { name: 'Increase Maturity' })); }));
  });
  it('stepper bounds: the button at a bound is disabled; nudge rounds to the step and clamps', () => {
    freshStore(); applyThemeAxes({ controlsNumeric: 'stepper' });
    render(<RangeInput id="khA0" label="Maturity" min={0} max={2} step={1} unit="" />);
    expect((screen.getByRole('button', { name: 'Increase Maturity' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Decrease Maturity' }) as HTMLButtonElement).disabled).toBe(false);
    expect([nudge('0.1', 1, { step: 0.05 }), nudge('0.3', 1, { step: 0.05 }), nudge('99', 1, { max: 100, step: 5 }), nudge('', -1, { min: 1 })]).toEqual(['0.15', '0.35', '100', '1']);
  });
});

describe('choice family', () => {
  const ui = <SelectInput id="runSizeMode" label="Mode" options={MODES} />;
  const native = () => outcome({}, ui, () => { fireEvent.change(screen.getByRole('combobox'), { target: { value: 'legacy' } }); });
  it.each(['segmented', 'radio'] as const)('%s: a named radiogroup of native radios (one name: arrow keys move within it); selecting = the dropdown command', (variant) => {
    const v = outcome({ controlsChoice: variant }, ui, () => {
      const group = screen.getByRole('radiogroup', { name: 'Mode' }), radios = screen.getAllByRole('radio') as HTMLInputElement[];
      expect(group).toBeTruthy();
      expect(radios.map((r) => r.checked)).toEqual([true, false]);
      expect(new Set(radios.map((r) => r.name)).size).toBe(1);
      fireEvent.click(screen.getByRole('radio', { name: 'Legacy' }));
    });
    same(native(), v);
  });
  it('more than 5 options stay a dropdown', () => {
    freshStore(); applyThemeAxes({ controlsChoice: 'segmented' });
    render(<SelectInput id="runSizeMode" label="Mode" options={['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ value: x, label: x }))} />);
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});

describe('boolean family', () => {
  const ui = <CheckInput id="riskApply" label="Feed the risk score" />;
  it('switch: role switch with its state; toggling = the checkbox command; undo restores', () => {
    const nat = outcome({}, ui, () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Feed the risk score' })); });
    const v = outcome({ controlsBoolean: 'switch' }, ui, () => {
      const sw = screen.getByRole('switch', { name: 'Feed the risk score' });
      expect(sw.getAttribute('aria-checked')).toBe('false');
      fireEvent.click(sw);
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    });
    same(nat, v);
  });
  it('checkbox (explicit) is the native rendering', () => {
    freshStore(); applyThemeAxes({ controlsBoolean: 'checkbox' });
    render(ui);
    expect(screen.getByRole('checkbox')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
