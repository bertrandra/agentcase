import { describe, expect, it } from 'vitest';
import { applySubsetToCommon, COMMON_SUBSET_FIELDS, envelopeCase, resolveProduct, setKnowledge, type Portfolio } from '@/domain/portfolio';
import { loadCase, withProduct, withWave } from '../../helpers/portfolio';

const three = (): Portfolio => withProduct(withProduct(withWave(envelopeCase(loadCase('golden')), 'w2', 6), { id: 'B', waveId: 'w2' }),
  { id: 'C', waveId: 'w2' });

describe('“Apply to all products” for a knowledge-subset field (spec F7)', () => {
  it('writes the value at the common level and drops the identical subset values; a different value stays', () => {
    let pf = setKnowledge(three(), 'p1', { targetCC: 1 });
    pf = setKnowledge(pf, 'B', { targetCC: 1 });
    pf = setKnowledge(pf, 'C', { targetCC: 3, curationFTE: 2 });
    const got = applySubsetToCommon(pf, 'p1', 'targetCC');
    expect(got.common.dom.values.khTargetCC).toBe('1');
    expect(got.products.map((p) => p.knowledge.targetCC)).toEqual([undefined, undefined, 3]);
    expect(got.products[2]!.knowledge.curationFTE).toBe(2);
    for (const id of ['p1', 'B']) expect(resolveProduct(got, id).dom.values.khTargetCC).toBe('1');
    expect(resolveProduct(got, 'C').dom.values.khTargetCC).toBe('3');
  });

  it('the hub switch and the nine maturity answers reach the common case keys', () => {
    const answers = [4, 3, 2, 1, 0, 1, 2, 3, 4];
    let pf = setKnowledge(three(), 'B', { enabled: true, maturityAnswers: answers });
    pf = applySubsetToCommon(applySubsetToCommon(pf, 'B', 'enabled'), 'B', 'maturityAnswers');
    expect(pf.common.dom.checked.khEnabled).toBe(true);
    expect(Array.from({ length: 9 }, (_, i) => pf.common.dom.values['khA' + i])).toEqual(answers.map(String));
    expect(pf.products[1]!.knowledge).toEqual({});
  });

  it('unchanged for a field the common case does not hold, or one the product does not set', () => {
    const pf = setKnowledge(three(), 'p1', { ktLeadMonths: 2, domains: [{ label: 'Code', weightPct: 100 }] });
    expect(applySubsetToCommon(pf, 'p1', 'ktLeadMonths')).toBe(pf);
    expect(applySubsetToCommon(pf, 'p1', 'domains')).toBe(pf);
    expect(applySubsetToCommon(pf, 'p1', 'setupBase')).toBe(pf);
    expect(applySubsetToCommon(pf, 'nope', 'setupBase')).toBe(pf);
    expect(COMMON_SUBSET_FIELDS).not.toContain('domains');
  });
});
