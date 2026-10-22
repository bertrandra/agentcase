import { describe, expect, it } from 'vitest';
import { applyOverrideToCommon, clearProductOverride, setProductOverride } from '@/controllers/productOverrides';
import { setActiveProduct, setEditScope } from '@/controllers/product';
import { setChecked, setInput } from '@/controllers/inputs';
import { toggleArtefact } from '@/controllers/scope';
import { addTeamRow } from '@/controllers/team';
import { setCustomerName } from '@/controllers/persona';
import { resolveProduct } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { threeProducts } from '../helpers/portfolioStore';

const pf = () => appStore().getState().portfolio;
const eff = (id: string) => resolveProduct(pf(), id) as unknown as Record<string, unknown> & { dom: { values: Record<string, string> } };

describe('address layer: where an existing command lands in the portfolio', () => {
  it('teamIn goes to the active product only', () => {
    const { ids } = threeProducts(), before = pf().products[0]!.teamIn.length, bLen = pf().products[1]!.teamIn.length;
    setActiveProduct(ids[0]); addTeamRow();
    expect(pf().products[0]!.teamIn).toHaveLength(before + 1);
    expect(pf().products[1]!.teamIn).toHaveLength(bLen);
    expect(pf().common).not.toHaveProperty('teamIn');
  });
  it('a form field edited with scope "all" goes to common and all products follow', () => {
    const { ids } = threeProducts();
    setInput('y1Ramp', 17);
    expect(pf().common.dom.values.y1Ramp).toBe('17');
    ids.forEach((id) => expect(eff(id).dom.values.y1Ramp).toBe('17'));
    expect(pf().products.every((p) => !p.overrides.dom)).toBe(true);
  });
  it('scope "this product only" writes only to overrides of the active product', () => {
    const { ids } = threeProducts(), common = JSON.stringify(pf().common);
    setEditScope('product'); setActiveProduct(ids[1]);
    setInput('y1Ramp', 23); setChecked('fitAuto', false); toggleArtefact(pf().common.selectedArtefacts[0]!, false);
    expect(JSON.stringify(pf().common)).toBe(common);
    expect(pf().products[1]!.overrides.dom?.values?.y1Ramp).toBe('23');
    expect(eff(ids[1]).dom.values.y1Ramp).toBe('23');
    expect(eff(ids[0]).dom.values.y1Ramp).not.toBe('23');
    expect(pf().products[0]!.overrides).toEqual({});
    expect(pf().products[1]!.overrides.selectedArtefacts).toBeDefined();
  });
  it('an already-overridden key is edited as an override whatever the scope; the others keep following common', () => {
    const { ids } = threeProducts();
    setProductOverride(ids[0], 'values.y1Ramp', '30');
    setInput('y1Ramp', 11);                          // scope "all", but product A overrides this field
    expect(pf().products[0]!.overrides.dom?.values?.y1Ramp).toBe('11');
    expect(pf().common.dom.values.y1Ramp).not.toBe('11');
    setActiveProduct(ids[1]); setInput('y1Ramp', 12);   // B inherits: common moves, A does not
    expect(pf().common.dom.values.y1Ramp).toBe('12');
    expect(eff(ids[2]).dom.values.y1Ramp).toBe('12');
    expect(eff(ids[0]).dom.values.y1Ramp).toBe('11');
  });
  it('non-overridable keys (customerName, MODEL, discount rate) always go to common, even with scope "product"', () => {
    const { ids } = threeProducts();
    setEditScope('product'); setActiveProduct(ids[2]); setCustomerName('ACME');
    expect((pf().common as unknown as Record<string, unknown>).customerName).toBe('ACME');
    expect(pf().products.every((p) => !('customerName' in p.overrides))).toBe(true);
  });
  it('A5: clearing an override restores the inheritance; applyToCommon drops the identical overrides', () => {
    const { ids } = threeProducts();
    setProductOverride(ids[0], 'values.y1Ramp', '40'); setProductOverride(ids[1], 'values.y1Ramp', '40'); setProductOverride(ids[2], 'values.y1Ramp', '41');
    const before = eff(ids[0]).dom.values.y1Ramp;
    clearProductOverride(ids[0], 'values.y1Ramp');
    expect(eff(ids[0]).dom.values.y1Ramp).not.toBe(before);
    expect(eff(ids[0]).dom.values.y1Ramp).toBe(pf().common.dom.values.y1Ramp);
    setProductOverride(ids[0], 'values.y1Ramp', '40');
    applyOverrideToCommon(ids[0], 'values.y1Ramp');
    expect(pf().common.dom.values.y1Ramp).toBe('40');
    expect(pf().products[0]!.overrides.dom).toBeUndefined();
    expect(pf().products[1]!.overrides.dom).toBeUndefined();
    expect(pf().products[2]!.overrides.dom?.values?.y1Ramp).toBe('41');
  });
  it('the derived doc follows the active product and is identity-stable while nothing changes', () => {
    const { ids } = threeProducts();
    const d0 = appStore().getState().doc;
    setEditScope('product'); setEditScope('all');
    expect(appStore().getState().doc).toBe(d0);
    setActiveProduct(ids[1]);
    expect(appStore().getState().doc).not.toBe(d0);
    setActiveProduct(ids[0]);
    expect(appStore().getState().doc).toBe(d0);
  });
  it('a product is untouched by an edit of another product\'s override (isolation)', () => {
    const { ids } = threeProducts(), a = eff(ids[0]);
    setEditScope('product'); setActiveProduct(ids[2]); setInput('y1Ramp', 29);
    expect(eff(ids[0])).toBe(a);
  });
});
