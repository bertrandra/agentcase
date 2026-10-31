import { programmeValuesOf } from '@/domain/process';
import { describe, expect, it } from 'vitest';
import { addProduct, archiveProduct, duplicateProduct, removeProduct, setActiveProduct } from '@/controllers/product';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { setPortfolioHorizon, setPortfolioHub } from '@/controllers/portfolio';
import { assignWave, removeWave } from '@/controllers/wave';
import { validate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { freshStore } from './helpers';
import { threeProducts } from '../helpers/portfolioStore';

const pf = () => appStore().getState().portfolio;

describe('portfolio commands keep the invariants', () => {
  it('removing the last product is refused; removing the active one moves the active product', () => {
    const t = threeProducts();
    setActiveProduct(t.ids[1]);
    expect(removeProduct(t.ids[1])).toBe(true);
    expect(pf().products.some((p) => p.id === pf().activeProductId)).toBe(true);
    expect(removeProduct(t.ids[2])).toBe(true);
    const before = JSON.stringify(pf());
    expect(removeProduct(t.ids[0])).toBe(false);
    expect(JSON.stringify(pf())).toBe(before);
    expect(appStore().getState().history.undo.length).toBeGreaterThan(0);
  });
  it('removing a wave unassigns its products and keeps them', () => {
    const t = threeProducts();
    expect(removeWave(t.waves[1])).toBe(true);
    expect(pf().products).toHaveLength(3);
    expect(pf().products[2]!.waveId).toBeNull();
    expect(validate(pf()).errors).toEqual([]);
  });
  it('a product is in at most one wave: assigning moves it', () => {
    const t = threeProducts();
    assignWave(t.ids[0], t.waves[1]);
    expect(pf().waves.map((w) => w.productIds.length)).toEqual([1, 2]);
    expect(validate(pf()).errors).toEqual([]);
  });
  it('knowledge domain weights must add up to 100; a bad subset changes nothing', () => {
    freshStore();
    const id = pf().products[0]!.id, before = JSON.stringify(pf());
    expect(setProductKnowledge(id, { domains: [{ label: 'A', weightPct: 60 }, { label: 'B', weightPct: 30 }] })).toBe(false);
    expect(setProductKnowledge(id, { targetCC: 9 })).toBe(false);
    expect(JSON.stringify(pf())).toBe(before);
    expect(setProductKnowledge(id, { domains: [{ label: 'A', weightPct: 60 }, { label: 'B', weightPct: 40 }] })).toBe(true);
  });
  it('an override off the whitelist throws; horizon and hub stay in step with the common fields', () => {
    freshStore();
    expect(() => setProductOverride(pf().products[0]!.id, 'values.horizon', '9')).toThrow();
    setPortfolioHorizon(60);
    expect(pf().common.dom.values.horizon).toBe('5');
    setPortfolioHub({ enabled: true, infraMonthly: 900 });
    expect(pf().common.dom.checked.khEnabled).toBe(true);
    expect(programmeValuesOf(pf().common.BPMN).khInfraMonthly).toBe('900');   // schema v4: in the common document
  });
  it('duplicate takes the source wave; archive keeps the product; the product cap holds', () => {
    const t = threeProducts(), copy = duplicateProduct(t.ids[0])!;
    expect(pf().waves[0]!.productIds).toContain(copy);
    expect(archiveProduct(copy)).toBe(true);
    expect(pf().products.find((p) => p.id === copy)!.archived).toBe(true);
    for (let i = 0; i < 60; i++) addProduct('X');
    expect(pf().products.length).toBe(50);
  });
});
