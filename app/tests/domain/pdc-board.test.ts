import { describe, expect, it } from 'vitest';
import { VARIABLES } from '@/domain/pdc/variables';
import { formatValue } from '@/ui/sections/configure/board/format';
import { pdc } from '../helpers/pdc';

interface Legacy { id: string; scope: string }

describe('board variables', () => {
  it('cover every variable of the legacy registry (values are proved per fixture in pdc-vars.test.ts)', () => {
    const legacy = pdc<Legacy[]>('pdc_vars', 'golden');
    expect(VARIABLES.map((x) => x.id)).toEqual(legacy.map((x) => x.id));
    expect(legacy.filter((x) => x.scope === 'GLOBAL')).toHaveLength(15);
  });
  it('formats', () => {
    expect([null, '', 1500000].map((v) => formatValue(v, 'EUR_M'))).toEqual(['—', '—', '€1.50M']);
    expect([1.5, 12.3].map((v) => formatValue(v, 'DAYS'))).toEqual(['1.5d', '12d']);
    expect([true, false].map((v) => formatValue(v, 'BOOL'))).toEqual(['✓ On', '✗ Off']);
  });
});
