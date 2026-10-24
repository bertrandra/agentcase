import { describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { setChecked, setInput } from '@/controllers/inputs';
import { chooseEditTarget, setEditScope } from '@/controllers/product';
import { resetToCommon, setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { toggleArtefact } from '@/controllers/scope';
import { addTeamRow } from '@/controllers/team';
import { resolveProduct } from '@/domain/portfolio';
import { commonEditDoc, editsCommon, keepersOf } from '@/store/commonEdit';
import { appStore } from '@/store/instance';
import { docOnly, threeProducts } from '../helpers/portfolioStore';
import { freshStore } from './helpers';

const pf = () => appStore().getState().portfolio;
const eff = (id: string) => resolveProduct(pf(), id) as unknown as { dom: { values: Record<string, string> }; selectedArtefacts: string[] };

describe('"Edit: All products" in a Portfolio / Wave view writes the common values', () => {
  it('editsCommon: 2+ products, scope all, a Portfolio or an existing Wave in view; never in a Product view or with one product', () => {
    const { waves } = threeProducts();
    expect(editsCommon(pf())).toBe(false);
    setDisplayScope({ kind: 'portfolio' }); expect(editsCommon(pf())).toBe(true);
    setDisplayScope({ kind: 'wave', id: waves[1] }); expect(editsCommon(pf())).toBe(true);
    setEditScope('product'); expect(editsCommon(pf())).toBe(false);
    freshStore(); setDisplayScope({ kind: 'portfolio' }); expect(editsCommon(pf())).toBe(false);
  });
  it('a form field: the common value moves, inheriting products follow, an overriding product keeps its value (one undo step, exact undo / redo)', () => {
    const { s, ids } = threeProducts();
    setProductOverride(ids[0], 'values.y1Ramp', '30');   // the ACTIVE product overrides it
    setDisplayScope({ kind: 'portfolio' });
    const before = docOnly(s), steps = s.getState().history.undo.length;
    setInput('y1Ramp', 14);
    expect(pf().common.dom.values.y1Ramp).toBe('14');
    expect(pf().products[0]!.overrides.dom?.values?.y1Ramp).toBe('30');
    expect(eff(ids[0]).dom.values.y1Ramp).toBe('30');
    expect(eff(ids[1]).dom.values.y1Ramp).toBe('14');
    expect(eff(ids[2]).dom.values.y1Ramp).toBe('14');
    expect(s.getState().history.undo.length).toBe(steps + 1);
    const after = docOnly(s);
    s.undo(); expect(docOnly(s)).toBe(before);
    s.redo(); expect(docOnly(s)).toBe(after);
  });
  it('a whole key (artefact selection) runs on the COMMON case: the active product\'s own selection is neither copied nor changed', () => {
    const { ids } = threeProducts(), art = pf().common.selectedArtefacts;
    setProductOverride(ids[0], 'selectedArtefacts', art.slice(0, 2));
    setDisplayScope({ kind: 'portfolio' });
    toggleArtefact(art[0]!, false);
    expect(pf().common.selectedArtefacts).toEqual(art.slice(1));
    expect(pf().products[0]!.overrides.selectedArtefacts).toEqual(art.slice(0, 2));
    expect(eff(ids[1]).selectedArtefacts).toEqual(art.slice(1));
  });
  it('a knowledge field goes to the common hub, not to a subset; the entry team stays the active product\'s', () => {
    const { ids } = threeProducts();
    setProductKnowledge(ids[1], { targetCC: 3 });
    setDisplayScope({ kind: 'portfolio' });
    setInput('khTargetCC', 2); setChecked('khEnabled', true);
    expect(pf().common.dom.values.khTargetCC).toBe('2');
    expect(pf().hub.enabled).toBe(true);
    expect(pf().products[0]!.knowledge).toEqual({});
    expect(pf().products[1]!.knowledge.targetCC).toBe(3);
    const n = pf().products[0]!.teamIn.length; addTeamRow();
    expect(pf().products[0]!.teamIn).toHaveLength(n + 1);
    expect(pf().common).not.toHaveProperty('teamIn');
  });
  it('a product chosen in "Edit" (any View) writes an override for that product only', () => {
    const { ids } = threeProducts(), common = JSON.stringify(pf().common);
    setDisplayScope({ kind: 'portfolio' });
    expect(chooseEditTarget(ids[2])).toBe(true);
    expect(pf().activeProductId).toBe(ids[2]); expect(pf().editScope).toBe('product'); expect(pf().displayScope).toEqual({ kind: 'portfolio' });
    setInput('y1Ramp', 9);
    expect(JSON.stringify(pf().common)).toBe(common);
    expect(pf().products[2]!.overrides.dom?.values?.y1Ramp).toBe('9');
    expect(chooseEditTarget('all')).toBe(true); expect(pf().editScope).toBe('all');
    expect(chooseEditTarget('nope')).toBe(false);
  });
  it('the common case: no override, no subset, the hub layer, the active team; keepers and "Reset to common"', () => {
    const { ids } = threeProducts();
    setProductOverride(ids[1], 'values.y1Ramp', '33'); setProductKnowledge(ids[2], { targetCC: 1 });
    const c = commonEditDoc(pf());
    expect(c).toBe(commonEditDoc(pf()));
    expect(c.dom.values.y1Ramp).toBe(pf().common.dom.values.y1Ramp);
    expect(c.teamIn).toBe(pf().products[0]!.teamIn);
    expect(keepersOf(pf().products, 'values.y1Ramp').map((k) => [k.id, k.via])).toEqual([[ids[1], 'override']]);
    expect(keepersOf(pf().products, 'values.khTargetCC').map((k) => [k.id, k.via])).toEqual([[ids[2], 'subset']]);
    expect(keepersOf(pf().products, 'values.horizon')).toEqual([]);
    expect(resetToCommon(ids[1], 'values.y1Ramp')).toBe(true);
    expect(resetToCommon(ids[2], 'values.khTargetCC')).toBe(true);
    expect(pf().products[1]!.overrides).toEqual({}); expect(pf().products[2]!.knowledge).toEqual({});
  });
});
