// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Commercial from '@/ui/sections/present/commercial';
import { legacyText, tablesOf } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES, sq } from '../../helpers/pdc';

afterEach(cleanup);
type Cm = { out: Record<string, { rows: string[][]; text: string }> };
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

describe('commercial section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Commercial />), legacy = legacyText(id, 'commercial');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy comparison table row by row, for each selected model (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Commercial />), e = pdc<Cm>('pdc_commercial', id);
    for (const code of ['ET', 'AAH', 'AGS', 'GS']) {
      act(() => setInput('cmModel', code));
      const rows = tablesOf(container)[0]!.slice(1);
      expect(rows.map((r) => r.map(sq))).toEqual(e.out[code]!.rows.map((r) => r.map(sq)));
      // the selected-model sentence under the table (break-even, tiers or true-up) reads like the legacy one
      const last = sq(e.out[code]!.rows.at(-1)!.join('')), det = sq(e.out[code]!.text).split(last)[1]!.split('Recommendedforthiscase')[0]!;
      expect(det.length > 0 || code === 'ET').toBe(true);
      expect(sq(container.textContent!)).toContain(det);
    }
  });
  it('an input edit moves the selected model’s figures through the controller; undo restores them', () => {
    loadCase('golden');
    const { container } = render(<Commercial />), aah = () => tablesOf(container)[0]![2]![1];
    act(() => setInput('cmModel', 'AAH'));
    const before = aah();
    fireEvent.change(screen.getByLabelText('AAH uplift (%)'), { target: { value: '30' } });
    expect(aah()).not.toBe(before);
    expect(screen.getByText(/AAH break-even uplift/).textContent).toMatch(/\d+\.\d%/);
    act(() => appStore().undo());
    expect(aah()).toBe(before);
  });
  it('under staff augmentation the unavailable models say why, and the recommendation changes', () => {
    loadCase('ctx-sta');
    const { container } = render(<Commercial />);
    expect(container.textContent).toContain('unavailable under STA — requires full delivery control (MSC)');
    expect(container.textContent).toContain('Recommended for this case: AI-Augmented Humans');
  });
});
