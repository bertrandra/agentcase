// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setChecked, setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Verif from '@/ui/sections/defend/verif';
import { tablesOf } from '../../helpers/economics';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
// Convergence invariants this build computes; the legacy's other rows (analytical modules, audits of modules outside this build) are not rendered.
const PORTED = ['CC-CTX-01', 'CC-CTX-02', 'CC-CTX-03', 'CC-CTX-04', 'CC-KH-01', 'CC-KH-02', 'CC-OM-01', 'CC-SUP-01', 'CC-MP-01', 'TE-05', 'TE-07', 'TE-HZN'];
// industry-med: the legacy tab re-fits the locked potential (75 -> 46) when it opens, so its screen shows 46 and 32.2 (= 46 x 70 %) where the case holds 75
const IGNORE: Record<string, number[]> = { 'industry-med': [46, 32.2] };
type V = { checks: string[][]; chain: string[][]; sensi: string[][]; prov: string[][]; conv: string[][] };
const tables = (c: Element) => { const t = tablesOf(c); return { ov: t[0]!, guards: t[1]!, conv: t[2]!, checks: t[3]!, chain: t[4]!, sensi: t[5]! }; };

describe('verif section', () => {
  it.each(FOUR)('shows every figure the legacy section showed, for the invariants this build computes (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Verif />);
    const legacy = legacySectionText(id, 'verif')!.split('\n').filter((l) => !/^(CC|TE)-[A-Z0-9-]+\t/.test(l) || PORTED.some((p) => l.startsWith(`${p}\t`))).join(' | ').replace(/\t/g, ' | ');
    expect(missingNumbers(legacy, renderedText(container), IGNORE[id] ?? [])).toEqual([]);
  });
  it.each(PDC_FIXTURES)('reproduces the legacy checks, chain, sensitivity, provenance and convergence tables cell by cell (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Verif />), e = pdc<V>('pdc_verif', id), t = tables(container);
    expect(t.checks).toEqual(e.checks);
    expect(t.chain).toEqual(e.chain);
    expect(t.sensi).toEqual(e.sensi.map((r, i) => (i && r[3] === 'n/a (at limit)' ? r : r.map((x) => x.replace('CONSISTENT', 'Consistent')))));
    expect(t.ov).toEqual(e.prov.filter((r) => r.length === 3 || (r.length === 3 && r[0] === 'Overlay')).slice(0, 11));
    expect(t.guards).toEqual(e.prov.filter((r) => r.length === 4).slice(0, 6));
    const legacyConv = new Map(e.conv.map((r) => [r[0]!, r]));
    expect(t.conv.slice(1)).toEqual(t.conv.slice(1).map((r) => legacyConv.get(r[0]!)));
    expect(t.conv.slice(1).map((r) => r[0])).toEqual(PORTED);
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
    expect(tables(container).ov.find((r) => r[0].startsWith('Verification tax'))![1]).toBe('ACTIVE');
    expect(tables(container).guards.find((r) => r[0] === 'Verification tax vs retained supervision')![2]).toBe('REVIEW');
  });
  it('a gap in a check is flagged (lifecycle position 100: effective automation above the potential)', () => {
    loadCase('lifecycle-pos-100');
    const { container } = render(<Verif />);
    expect(tables(container).checks.find((r) => r[1] === 'Effective auto ≤ potentiel')![4]).toBe('✗ GAP');
  });
});
