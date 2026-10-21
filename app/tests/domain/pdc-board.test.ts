import { describe, expect, it } from 'vitest';
import { VARIABLES } from '@/domain/pdc/variables';
import { formatValue } from '@/ui/sections/configure/board/format';
import { diffs } from '../helpers/economics';
import { ctxOf, pdc, PDC_FIXTURES } from '../helpers/pdc';

interface Legacy { id: string; label: string; fmt: string; unit: string; scope: string; value: unknown; text: string }

describe('board variables reproduce the legacy registry', () => {
  it.each(PDC_FIXTURES)('%s: value, label, format, scope and display text of every ported variable', (id) => {
    const c = ctxOf(id), legacy = new Map(pdc<Legacy[]>('pdc_vars', id).map((x) => [x.id, x]));
    const got = VARIABLES.map((x) => { const value = x.get(c); return { id: x.id, label: x.label, fmt: x.format, unit: x.unit, scope: x.scope, value: value ?? null, text: formatValue(value, x.format) }; });
    const want = VARIABLES.map((x) => legacy.get(x.id)!);
    expect(want.every(Boolean)).toBe(true);
    expect(diffs(want.map((w) => ({ ...w, value: w.value ?? null })), got)).toEqual([]);
  });
  it('covers every GLOBAL variable of the legacy registry', () => {
    const globals = pdc<Legacy[]>('pdc_vars', 'golden').filter((x) => x.scope === 'GLOBAL').map((x) => x.id);
    expect(globals.filter((g) => !VARIABLES.some((x) => x.id === g))).toEqual([]);
  });
  it('formats', () => {
    expect([null, '', 1500000].map((v) => formatValue(v, 'EUR_M'))).toEqual(['—', '—', '€1.50M']);
    expect([1.5, 12.3].map((v) => formatValue(v, 'DAYS'))).toEqual(['1.5d', '12d']);
    expect([true, false].map((v) => formatValue(v, 'BOOL'))).toEqual(['✓ On', '✗ Off']);
  });
});
