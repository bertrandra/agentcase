import { describe, expect, it } from 'vitest';
import { setProductRaci } from '@/controllers/org';
import { orgOf, raciOverridesOf, readRaci } from '@/domain/org';
import { computeCase } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { serialize, type XDocument } from '@/domain/process';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { threeProducts } from '../helpers/portfolioStore';

/**
 * SPEC_FIXES FX-D4 (a), § 21.5: a product's own RACI of an activity, kept in the organisation part of the common document (`ac:raciOverride`);
 * the process is not copied, the other products keep the common RACI, no figure moves; one undoable step; save / open keeps it.
 */
describe('per-product RACI override', () => {
  it('only the product sees it; the pricing role stays R; no figure moves; undo; save -> open', () => {
    const t = threeProducts(), [a, b] = t.ids, pf = () => t.s.getState().portfolio, common = () => pf().common.BPMN as XDocument;
    const figures = () => t.ids.map((id) => computeCase(resolveProduct(pf(), id)).headline);
    const before = figures(), doc = resolveProduct(pf(), a!).BPMN as XDocument, steps = t.s.getState().history.undo.length;
    expect(setProductRaci(a!, 'A017', { R: ['role-qa'], A: 'role-lead', C: [], I: [] })).toBe(true);
    expect(t.s.getState().history.undo.length).toBe(steps + 1);
    expect(serialize(common())).toMatch(/<ac:raciOverride product="[^"]+" activity="A017" responsible="role-qa" accountable="role-lead"\/>/);
    const mine = orgOf(pf(), doc, a).activities.find((x) => x.id === 'A017')!, other = orgOf(pf(), doc, b).activities.find((x) => x.id === 'A017')!;
    expect(mine.raci.A).toBe('role-lead');
    expect(mine.raci.R).toEqual([...new Set([...(mine.primary ? [mine.primary] : []), 'role-qa'])]);
    expect(other.raci).toEqual(readRaci(doc).find((x) => x.id === 'A017')!.raci);
    expect(figures()).toEqual(before);
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(pf(), () => new Date(0)))) as Record<string, unknown>;
    expect(raciOverridesOf(openChecked(saved).portfolio.common.BPMN as XDocument, a!).get('A017')?.A).toBe('role-lead');
    expect(setProductRaci(a!, 'A017', null)).toBe(true);
    expect(raciOverridesOf(common(), a!).size).toBe(0);
    t.s.undo();
    expect(raciOverridesOf(common(), a!).size).toBe(1);
    expect(setProductRaci('nope', 'A017', { R: ['role-qa'], C: [], I: [] })).toBe(false);
  });
});
