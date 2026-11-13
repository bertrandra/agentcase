import { afterEach, describe, expect, it } from 'vitest';
import { editAudit } from '@/controllers/audit';
import { auditedUnits, productAuditOf, readAudit, unitAuditOf, unitScope, withoutAudit } from '@/domain/audit';
import { DEFAULT_UNIT_ID, orgOf } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { setAuditUnit } from '@/store/auditScope';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore } from './helpers';

/**
 * Audit scope (owner's request 2026-11-13): a shared service or an organisation unit keeps its own audit (`ac:unitAudits` in the organisation part
 * of the common document). With a unit in the audit scope an edit goes there — not to the product's audit nor to the process document's — as one
 * undoable step; save / open keeps it; an export without audit data drops it. The unit's scope is the work of its teams.
 */
const obs = (value: string) => ({ kind: 'observation' as const, obs: { name: 'reworkRate', value, source: 'interview' as const } });

afterEach(() => setAuditUnit(null));

describe('unit audit layer', () => {
  it('routes edits to the unit; isolated from product and document; undo; save -> open; stripped without audit data', () => {
    const t = threeProducts(), [a] = t.ids, pf = () => t.s.getState().portfolio, common = () => pf().common.BPMN as XDocument;
    expect(editAudit('A017', obs('20'))).toBe(true);   // the product's own audit
    expect(setDisplayScope({ kind: 'unit', id: DEFAULT_UNIT_ID })).toBe(true);   // 2+ products: the unit Show shows is the unit audited
    expect(editAudit('A017', obs('45'))).toBe(true);
    expect(unitAuditOf(common(), DEFAULT_UNIT_ID).get('A017')!.observations[0]!.value).toBe('45');
    expect(productAuditOf(common(), a!).get('A017')!.observations[0]!.value).toBe('20');
    expect(readAudit(common()).elements.has('A017')).toBe(false);
    expect(auditedUnits(common())).toEqual([DEFAULT_UNIT_ID]);
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(pf(), () => new Date(0)))) as Record<string, unknown>;
    expect(unitAuditOf(openChecked(saved).portfolio.common.BPMN as XDocument, DEFAULT_UNIT_ID).get('A017')!.observations[0]!.value).toBe('45');
    expect(unitAuditOf(withoutAudit(common()), DEFAULT_UNIT_ID).size).toBe(0);
    t.s.undo();
    expect(unitAuditOf(common(), DEFAULT_UNIT_ID).size).toBe(0);
    expect(productAuditOf(common(), a!).size).toBe(1);
  });

  it('with 2+ products a choice kept in the section is ignored: Show decides', () => {
    const t = threeProducts(), [a] = t.ids, common = () => t.s.getState().portfolio.common.BPMN as XDocument;
    showProduct(a!);
    setAuditUnit(DEFAULT_UNIT_ID);
    expect(editAudit('A017', obs('30'))).toBe(true);
    expect(unitAuditOf(common(), DEFAULT_UNIT_ID).size).toBe(0);
    expect(productAuditOf(common(), a!).get('A017')!.observations[0]!.value).toBe('30');
  });

  it('the scope of a unit is the in-scope work of its teams and the roles their lines provide', () => {
    const t = threeProducts(), pf = t.s.getState().portfolio, doc = t.s.getState().doc.BPMN as XDocument;
    const m = orgOf({ products: pf.products, common: { BPMN: pf.common.BPMN } }, doc), s = unitScope(m, DEFAULT_UNIT_ID)!;
    expect(s.kind).toBe('unit');
    expect(s.activities.size).toBeGreaterThan(0);
    expect([...s.activities].every((id) => m.activities.some((x) => x.id === id && x.inScope))).toBe(true);
    expect(s.roles.size).toBeGreaterThan(0);
    expect(s.products.length).toBe(3);
    expect(unitScope(m, 'no-such-unit')).toBeNull();
  });
});

describe('unit audit layer, one case', () => {
  it('the section keeps its own unit choice; a unit that does not exist leaves the scope', () => {
    const s = freshStore(), common = () => s.getState().portfolio.common.BPMN as XDocument;
    setAuditUnit(DEFAULT_UNIT_ID);
    expect(editAudit('A017', obs('12'))).toBe(true);
    expect(unitAuditOf(common(), DEFAULT_UNIT_ID).get('A017')!.observations[0]!.value).toBe('12');
    setAuditUnit('no-such-unit');
    expect(editAudit('A018', obs('14'))).toBe(true);
    expect(unitAuditOf(common(), 'no-such-unit').size).toBe(0);
    expect(readAudit(s.getState().doc.BPMN as XDocument).elements.get('A018')!.observations[0]!.value).toBe('14');
  });
});
