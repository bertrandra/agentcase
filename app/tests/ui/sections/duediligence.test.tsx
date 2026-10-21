// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeSensitivity } from '@/controllers/pdc';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Dd from '@/ui/sections/defend/duediligence';
import { legacyText, tablesOf } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES, sq } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
// industry-med: opening the tab in the legacy page re-fits the locked automation potential (75 -> 46); the case itself holds 75.
const IGNORE: Record<string, number[]> = { 'industry-med': [46] };
const body = (c: Element) => tablesOf(c)[0]!.slice(1);
const NO_PACK = /📤 Export pack \(Excel\)|📥 Re-import annotated pack/g;   // the legacy text of the pack buttons (they are rendered by PackButtons, covered in excel-buttons.test.tsx)

describe('duediligence section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Dd />), legacy = legacyText(id, 'duediligence');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container), IGNORE[id] ?? [])).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy register cell by cell and its gauges (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Dd />), e = pdc<{ tr: string[][]; top: string }>('pdc_dd', id);
    expect(body(container)).toEqual(e.tr);
    expect(sq(container.textContent!)).toContain(sq(e.top.replace(NO_PACK, '').split('Twogauges')[0]!.split('Items to confirm')[1]!.replace(/^/, 'Items to confirm')).slice(0, 120));
  });
  it.each(PDC_FIXTURES)('after the € sensitivity run, weights and gauges match the legacy (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Dd />), e = pdc<{ tr: string[][]; top: string }>('pdc_ddsens', id);
    act(() => computeSensitivity());
    expect(body(container)).toEqual(e.tr);
    const top = sq(container.textContent!), want = sq(e.top.replace(NO_PACK, '').replace(/Measured \d{4}-\d{2}-\d{2}/, 'Measured'));
    for (const part of want.split(/Itemstoconfirm/)[1]!.split('Twogauges,twoquestions.')) expect(top.replace(/Measured\d{4}-\d{2}-\d{2}/, 'Measured')).toContain(part.slice(0, 160));
  });
  it('editing a coefficient goes through the controller, moves the model-fed value and is undoable', () => {
    loadCase('golden');
    const { container } = render(<Dd />), cell = () => (screen.getByLabelText('HRI ramp floor') as HTMLInputElement).value;
    expect(cell()).toBe('0.6');
    fireEvent.change(screen.getByLabelText('HRI ramp floor'), { target: { value: '0.5' } });
    expect(cell()).toBe('0.5');
    expect(appStore().getState().doc.COEF.hriFloor).toBe(0.5);
    expect(container.querySelector('input[aria-label="HRI ramp floor"]')!.getAttribute('title')).toBe('default 0.6');
    act(() => appStore().undo());
    expect(cell()).toBe('0.6');
  });
  it('confirming rows moves the item gauge and the glass-ceiling gauge; a validated input reads confirmed', () => {
    loadCase('golden');
    const { container } = render(<Dd />);
    expect(container.textContent).toContain('Confirmed / waived (items)0%');
    fireEvent.change(screen.getByLabelText('State of V3 · Source code'), { target: { value: 'confirmed' } });
    expect(container.textContent).toContain('Confirmed / waived (items)1%');
    expect(container.textContent).toContain('Glass ceiling confirmed21%');
    fireEvent.change(screen.getByLabelText('State of Horizon (years)'), { target: { value: 'waived' } });
    expect(container.textContent).toContain('Confirmed / waived (items)2%');
    act(() => { appStore().undo(); appStore().undo(); });
    expect(container.textContent).toContain('Confirmed / waived (items)0%');
  });
  it('a measurement goes stale as soon as an input changes', () => {
    loadCase('golden');
    const { container } = render(<Dd />);
    act(() => computeSensitivity());
    expect(container.textContent).toContain('↻ Recompute € sensitivity');
    act(() => setInput('workdays', 210));
    expect(container.textContent).toContain('⚖️ Compute € sensitivity');
    expect(container.textContent).toContain('Not yet measured');
  });
});
