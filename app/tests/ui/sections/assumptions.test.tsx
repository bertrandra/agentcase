// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Assumptions from '@/ui/sections/defend/assumptions';
import { legacyText, tablesOf } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
// industry-med: opening the tab in the legacy page re-fits the (locked) automation potential to the scope, so its screen read 46 where the
// case holds 75 (the oracle's engine output is 75 as well). Not ported: the new build never rewrites an input just because a section is open.
const IGNORE: Record<string, number[]> = { 'industry-med': [46] };

describe('assumptions section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Assumptions />), legacy = legacyText(id, 'assumptions');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container), IGNORE[id] ?? [])).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy register row by row (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Assumptions />), e = pdc<{ rows: string[][]; text: string }>('pdc_assump', id);
    expect(tablesOf(container)[0]!.slice(1)).toEqual(e.rows);
    for (const part of e.text.split(/Assumption/)[0]!.split(/\s{1,}/).filter((x) => /\d/.test(x))) expect(container.textContent).toContain(part);
  });
  it('an edited input turns ADJUSTED, ticking validated turns it VALIDATED and moves the counters; undo restores', () => {
    loadCase('golden');
    const { container } = render(<Assumptions />), status = (label: string) => tablesOf(container)[0]!.find((r) => r[0] === label)![3];
    expect(status('Working days / year')).toBe('DEFAULT');
    act(() => setInput('workdays', 210));
    expect(status('Working days / year')).toBe('ADJUSTED');
    expect(container.textContent).toContain('3 adjusted');
    fireEvent.click(screen.getByLabelText('Working days / year validated'));
    expect(status('Working days / year')).toBe('VALIDATED');
    expect(container.textContent).toContain('1 validated with client');
    act(() => appStore().undo());
    expect(status('Working days / year')).toBe('ADJUSTED');
    act(() => appStore().undo());
    expect(status('Working days / year')).toBe('DEFAULT');
  });
  it('structured state follows the document: an edited lifecycle position reads "edited vs default"', () => {
    loadCase('lifecycle-pos-75');
    const { container } = render(<Assumptions />);
    expect(tablesOf(container)[0]!.find((r) => r[0] === 'Product status (position & use)')![1]).toBe('edited vs default');
  });
});
