// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { dismissCalcBanner, getCalcBanner } from '@/controllers/calcStaleness';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { openCaseText } from '@/controllers/openFile';
import { addProduct, renameProduct, setActiveProduct, setProductNote, setEditScope } from '@/controllers/product';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { addWave } from '@/controllers/wave';
import { togglePhase } from '@/controllers/scope';
import { resolveProduct, validate } from '@/domain/portfolio';
import { fitTarget } from '@/store/derive';
import { appStore } from '@/store/instance';
import { isSingleCase } from '@/store/persistence/portfolioSnapshot';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore } from './helpers';

afterEach(() => dismissCalcBanner());
const pf = () => appStore().getState().portfolio;
const schema = (json: string) => (JSON.parse(json) as { _schema: string })._schema;
/** What a file must preserve of a portfolio: everything except the transient edit scope. */
const kept = () => { const { editScope: _e, ...rest } = pf(); void _e; return rest; };

describe('F22: when a portfolio is saved as the single-case v1 file', () => {
  it('one plain product in one wave -> agentcase.snapshot.v1', () => {
    freshStore();
    expect(isSingleCase(pf())).toBe(true);
    expect(schema(exportSnapshotJson().json)).toBe('agentcase.snapshot.v1');
  });
  it.each([
    ['a second product', () => { addProduct('B'); }],
    ['a second wave', () => { addWave('W2', 3); }],
    ['an override', () => { setProductOverride(pf().products[0]!.id, 'values.y1Ramp', '33'); }],
    ['a knowledge subset', () => { setProductKnowledge(pf().products[0]!.id, { targetCC: 2 }); }],
    ['a renamed product', () => { renameProduct(pf().products[0]!.id, 'Core banking'); }],
    ['a product note', () => { setProductNote(pf().products[0]!.id, 'x'); }],
  ])('%s -> agentcase.portfolio.v1', (_n, edit) => {
    freshStore(); edit();
    expect(isSingleCase(pf())).toBe(false);
    expect(schema(exportSnapshotJson().json)).toBe('agentcase.portfolio.v1');
  });
});

describe('portfolio files', () => {
  it('JSON round trip: products, waves, overrides, knowledge, hub, horizon and the active product survive', async () => {
    const t = threeProducts();
    setProductOverride(t.ids[1], 'values.y1Ramp', '27'); setProductKnowledge(t.ids[2], { targetCC: 3 }); setActiveProduct(t.ids[2]); setEditScope('product');
    const before = kept(), { json } = exportSnapshotJson();
    freshStore();
    await importSnapshotFile({ text: async () => json });
    const after = pf();
    expect(after.activeProductId).toBe(t.ids[2]);
    expect(after.editScope).toBeUndefined();   // view state, never saved
    expect(after.products.map((p) => [p.id, p.name, p.overrides, p.knowledge, p.waveId])).toEqual(before.products.map((p) => [p.id, p.name, p.overrides, p.knowledge, p.waveId]));
    expect(after.waves).toEqual(before.waves);
    expect(after.hub).toEqual(before.hub);
    expect(after.common.dom).toEqual(before.common.dom);
    expect(validate(after).errors).toEqual([]);
    expect(getCalcBanner()).toBeNull();   // packages at both levels are valid
  });
  it('the file stamps one package per product and one for the portfolio', () => {
    const t = threeProducts(), raw = JSON.parse(exportSnapshotJson().json) as { calculationPackages: Record<string, unknown>; calculationPackage: { inputHash: string } };
    expect(Object.keys(raw.calculationPackages).sort()).toEqual([...t.ids].sort());
    expect(raw.calculationPackage.inputHash).toMatch(/^pf1:/);
  });
  it('staleness at product level: editing one product in the file raises the banner and names it', async () => {
    const t = threeProducts(), raw = JSON.parse(exportSnapshotJson().json);
    raw.products[1].overrides = { dom: { values: { y1Ramp: '41' }, checked: {} } };
    freshStore();
    await importSnapshotFile({ text: async () => JSON.stringify(raw) });
    expect(getCalcBanner()?.state).toBe('stale');
    expect(getCalcBanner()?.staleProducts).toContain(t.ids[1]);
  });
  it('staleness at portfolio level: a moved wave is stale although every product package is valid', async () => {
    threeProducts();
    const raw = JSON.parse(exportSnapshotJson().json);
    raw.waves[1].startMonth = 12;
    freshStore();
    await importSnapshotFile({ text: async () => JSON.stringify(raw) });
    expect(getCalcBanner()?.state).toBe('stale');
  });
  it('a tampered portfolio package is stale; no packages at all is silent', async () => {
    threeProducts();
    const raw = JSON.parse(exportSnapshotJson().json);
    raw.calculationPackage.headline.npv *= 2;
    freshStore(); await importSnapshotFile({ text: async () => JSON.stringify(raw) });
    expect(getCalcBanner()?.state).toBe('stale');
    dismissCalcBanner(); delete raw.calculationPackage; delete raw.calculationPackages;
    freshStore(); await importSnapshotFile({ text: async () => JSON.stringify(raw) });
    expect(getCalcBanner()).toBeNull();
  });
  it('opening a portfolio re-fits every product potential to its own scope', () => {
    const t = threeProducts();
    setEditScope('product'); setActiveProduct(t.ids[1]); togglePhase('V1', false); togglePhase('V2', false); togglePhase('V3', false);
    setEditScope('all'); setActiveProduct(t.ids[0]);
    const { json } = exportSnapshotJson(), raw = JSON.parse(json);
    raw.common.dom.values.autoPotential = '1'; raw.products.forEach((p: { overrides: { dom?: { values?: Record<string, string> } } }) => { if (p.overrides.dom?.values) delete p.overrides.dom.values.autoPotential; });
    freshStore(); openCaseText(JSON.stringify(raw));
    const fit = (id: string) => fitTarget(resolveProduct(pf(), id) as never);
    expect(fit(t.ids[1])).not.toBe(fit(t.ids[0]));
    for (const id of t.ids) expect((resolveProduct(pf(), id) as { dom: { values: Record<string, string> } }).dom.values.autoPotential).toBe(fit(id));
    expect(validate(pf()).errors).toEqual([]);
  });
});
