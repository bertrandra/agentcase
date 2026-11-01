import { describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
import { setActiveProduct } from '@/controllers/product';
import { productAuditOf, readAudit, withoutAudit } from '@/domain/audit';
import type { XDocument } from '@/domain/process';
import { productAuditTarget } from '@/store/commonEdit';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { threeProducts } from '../helpers/portfolioStore';

/**
 * SPEC_FIXES FX-D6 (a): products that share the common process each keep their own audit (`ac:productAudits` in the organisation part of the
 * common document): an edit for one product is not seen by another, the process is not copied, one undoable step, save / open keeps it, an
 * export without audit data drops it.
 */
const obs = (value: string) => ({ kind: 'observation' as const, obs: { name: 'reworkRate', value, source: 'interview' as const } });

describe('per-product audit', () => {
  it('each product its own value; the process is not copied; undo; save -> open; stripped without audit data', () => {
    const t = threeProducts(), [a, b] = t.ids, pf = () => t.s.getState().portfolio, common = () => pf().common.BPMN as XDocument;
    expect(productAuditTarget(pf())).toBe(a);
    expect(editAudit('A017', obs('20'))).toBe(true);
    setActiveProduct(b!);
    expect(editAudit('A017', obs('35'))).toBe(true);
    expect(productAuditOf(common(), a!).get('A017')!.observations[0]!.value).toBe('20');
    expect(productAuditOf(common(), b!).get('A017')!.observations[0]!.value).toBe('35');
    expect(readAudit(common()).elements.has('A017')).toBe(false);   // the process document's own audit is untouched
    expect(pf().products.every((p) => p.overrides.BPMN === undefined)).toBe(true);   // no copy of the process
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(pf(), () => new Date(0)))) as Record<string, unknown>;
    expect(productAuditOf(openChecked(saved).portfolio.common.BPMN as XDocument, b!).get('A017')!.observations[0]!.value).toBe('35');
    expect(productAuditOf(withoutAudit(common()), a!).size).toBe(0);
    t.s.undo();
    expect(productAuditOf(common(), b!).size).toBe(0);
    expect(productAuditOf(common(), a!).size).toBe(1);
  });
});
