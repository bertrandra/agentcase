// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Story from '@/ui/sections/present/story-summary';
import { legacyText, tablesOf } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { deviationFixtures, legacyMoney, legacyVelocityRow } from '../../helpers/deviations';
import { loadCase, pdc, PDC_FIXTURES, sq } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

describe('story-summary section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Story />), legacy = legacyText(id, 'story-summary');
    expect(legacy).not.toBeNull();
    // ignore: 10 is the "§10" of the SM-SPEC reference inside the collapsed help text; the legacy velocity % is the unclamped one (DEV-ANCHOR-CLAMP)
    const velocity = parseInt(pdc<{ rows: string[][] }>('pdc_story', id).rows[2]![2]!, 10);
    expect(missingNumbers(legacy!, renderedText(container), [10, velocity])).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy sentence and table (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Story />), e = pdc<{ rows: string[][]; lead: string }>('pdc_story', id);
    // one payback format (fmtPayback: ">36 mo" where the legacy story wrote ">36m"); DEV-PAYBACK-NOSETUP: no setup reads "immediate"
    const payback = (x: string) => (deviationFixtures('DEV-PAYBACK-NOSETUP').includes(id) ? 'immediate' : x.replace(/^>(\d+)m$/, '>$1 mo'));
    const rows = e.rows.map((r, i) => (i === 2 ? [r[0]!, r[1]!, legacyVelocityRow(r[2]!)] : i === 4 ? [r[0]!, r[1]!, payback(r[2]!)] : r).map(legacyMoney));
    expect(tablesOf(container)[0]!.slice(1)).toEqual(rows);
    const lead = e.lead.replace(/\+(\d+)%(?= delivery velocity)/, (m) => legacyVelocityRow(m))
      .replace(/payback of (\d+) months/, (_m, n: string) => (deviationFixtures('DEV-PAYBACK-NOSETUP').includes(id) ? 'payback of immediate' : `payback of ${n} months`));
    expect(sq(container.querySelector('p')!.textContent!)).toBe(sq(lead));
  });
  it('follows the case: a higher potential moves the savings line; undo restores it', () => {
    loadCase('golden');
    const { container } = render(<Story />), saving = () => tablesOf(container)[0]![4]![2];
    const before = saving();
    act(() => setInput('setupTooling', 235000));
    act(() => setInput('infra', 4000));
    expect(saving()).not.toBe(before);
    act(() => { appStore().undo(); appStore().undo(); });
    expect(saving()).toBe(before);
  });
  it('states when the case never pays back within the horizon', () => {
    loadCase('econ-roi-low');
    const { container } = render(<Story />);
    expect(container.textContent).toContain('beyond the 3-year horizon');
  });
});
