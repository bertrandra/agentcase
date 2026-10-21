// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setChecked, setInput } from '@/controllers/inputs';
import { makeCtx, model } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { fmtRoiPct } from '@/domain/economics/roi';
import { appStore } from '@/store/instance';
import Verif from '@/ui/sections/defend/verif';
import { tablesOf } from '../../helpers/economics';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
type V = { checks: string[][]; chain: string[][]; sensi: string[][]; prov: string[][]; conv: string[][] };
const tables = (c: Element) => { const t = tablesOf(c); return { ov: t[0]!, guards: t[1]!, conv: t[2]!, checks: t[3]!, chain: t[4]!, sensi: t[5]! }; };

describe('verif section', () => {
  it.each(FOUR)('shows every figure the legacy section showed, convergence rows included (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Verif />);
    const legacy = legacySectionText(id, 'verif')!.split('\n').join(' | ').replace(/\t/g, ' | ');
    expect(missingNumbers(legacy, renderedText(container))).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy checks, chain, sensitivity, provenance and convergence tables cell by cell (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Verif />), e = pdc<V>('pdc_verif', id), t = tables(container);
    expect(t.checks).toEqual(e.checks);
    const legacySensi = e.sensi.map((r, i) => (i && r[3] === 'n/a (at limit)' ? r : r.map((x) => x.replace('CONSISTENT', 'Consistent'))));
    if (model(makeCtx(appStore().getState().doc)).horizon === 3) {
      expect(t.chain).toEqual(e.chain);
      expect(t.sensi).toEqual(legacySensi);
    } else {
      // DEV-HORIZON-SUMS: the legacy ROI and savings sums read the three-entry yearSav whatever the horizon; v19 sums the horizon's years.
      expect(t.chain.slice(0, -1)).toEqual(e.chain.slice(0, -1));
      expect(t.chain[t.chain.length - 1]![3]).toBe(fmtRoiPct(headline(makeCtx(appStore().getState().doc)).roi));
      expect(t.sensi.map((r) => [r[0], r[1]])).toEqual(legacySensi.map((r) => [r[0], r[1]]));
      expect(t.sensi.slice(1).every((r) => !/Abnormal/i.test(r[3] ?? ''))).toBe(true);
    }
    expect(t.ov).toEqual(e.prov.filter((r) => r.length === 3 || (r.length === 3 && r[0] === 'Overlay')).slice(0, 11));
    expect(t.guards).toEqual(e.prov.filter((r) => r.length === 4).slice(0, 6));
    expect(t.conv.length).toBe(68); // header + the 67 rows of the legacy table
    expect(t.conv).toEqual(e.conv); // same ids, order, names, PASS/FAIL and detail text
  });
  it('an edit moves the checks through the controller; undo restores them', () => {
    loadCase('golden');
    const { container } = render(<Verif />), observed = () => tables(container).checks.find((r) => r[1] === 'Effective auto ≤ potentiel')!;
    expect(observed().slice(2)).toEqual(['≤75%', '75.0%', '✓ OK']);
    act(() => setInput('autoPotential', 60));
    expect(observed().slice(2, 3)).toEqual(['≤60%']);
    act(() => appStore().undo());
    expect(observed()[2]).toBe('≤75%');
  });
  it('a euro-affecting overlay leaves the clean baseline and shows as active', () => {
    loadCase('kh-off');
    const { container } = render(<Verif />);
    expect(container.textContent).toContain('Clean baseline.');
    act(() => setChecked('vtaxApply', true));
    expect(container.textContent).toContain('You are NOT on the clean baseline.');
    expect(tables(container).ov.find((r) => r[0]!.startsWith('Verification tax'))![1]).toBe('ACTIVE');
    expect(tables(container).guards.find((r) => r[0] === 'Verification tax vs retained supervision')![2]).toBe('REVIEW');
  });
  it('a gap in a check is flagged (lifecycle position 100: effective automation above the potential)', () => {
    loadCase('lifecycle-pos-100');
    const { container } = render(<Verif />);
    expect(tables(container).checks.find((r) => r[1] === 'Effective auto ≤ potentiel')![4]).toBe('✗ GAP');
  });
});
