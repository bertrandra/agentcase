import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { carrierOf, resolveProduct } from '@/domain/portfolio/resolve';
import { programmeLines } from '@/domain/programme';
import type { CaseState } from '@/domain/types/state';
import { identical, loadCase, withProduct } from '../../helpers/portfolio';

/**
 * SPEC_FIXES FX-01: a case-level opt-in activity switched on in the common values (here the audit and discovery interviews) is counted once per
 * portfolio — by its carrier, the first planned product of the earliest wave — and by another product only when that product switches it on itself.
 */
const withAudit = (): CaseState => { const c = loadCase('golden'); return { ...c, dom: { ...c.dom, values: { ...c.dom.values, optAudit: 'on' } } }; };
const audits = (s: CaseState): number => programmeLines(makeCtx(s)).filter((l) => l.id === 'audit').length;

describe('case-level opt-in activities in a portfolio (FX-01)', () => {
  it('three products, the common audit switched on: counted by the carrier only', () => {
    const pf = identical(withAudit(), 3), carrier = carrierOf(pf);
    expect(carrier).toBe(pf.products[0]!.id);
    expect(pf.products.map((p) => audits(resolveProduct(pf, p.id)))).toEqual([1, 0, 0]);
  });
  it('a product that switches it on itself counts it too; the earliest wave carries it', () => {
    let pf = identical(withAudit(), 2);
    pf = withProduct(pf, { id: 'own', overrides: { dom: { values: { optAudit: 'on' } } } });
    expect(audits(resolveProduct(pf, 'own'))).toBe(1);
    pf = { ...pf, waves: [...pf.waves, { id: 'w0', name: 'Wave 0', startMonth: -3, productIds: ['p2'] }],
      products: pf.products.map((p) => (p.id === 'p2' ? { ...p, waveId: 'w0' } : p)) };
    expect(carrierOf(pf)).toBe('p2');
    expect(audits(resolveProduct(pf, 'p2'))).toBe(1);
    expect(audits(resolveProduct(pf, pf.products[0]!.id))).toBe(0);
  });
  it('a single case keeps counting it (it is its own carrier)', () => {
    expect(audits(withAudit())).toBe(1);
  });
});
