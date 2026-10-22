// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { dismissCalcBanner, getCalcBanner } from '@/controllers/calcStaleness';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { exportSnapshotJson } from '@/controllers/files';
import { openCaseText } from '@/controllers/openFile';
import { addProduct, renameProduct, setActiveProduct, setProductOffset } from '@/controllers/product';
import { setPortfolioHub } from '@/controllers/portfolio';
import { setProductOverride } from '@/controllers/productOverrides';
import { activateSnapshot, captureSnapshot, compareSnapshots, setBaselineSnapshot } from '@/controllers/snapshots';
import { addWave, assignWave, setWaveStart } from '@/controllers/wave';
import { snapshotsOf } from '@/domain/snapshots';
import { appStore } from '@/store/instance';
import { fixtureText, fourProducts, openPortfolioFixture, pfNow } from '../helpers/portfolioFixtures';
import { freshStore, snapAll } from './helpers';

afterEach(() => dismissCalcBanner());
const T0 = new Date('2026-10-22T10:00:00Z');
const lib = () => snapshotsOf(appStore().getState().doc);
/** The saved part of a portfolio (view state aside), the library excluded: what an activation must bring back. */
const content = () => {
  const { editScope: _e, displayScope: _d, activeProductId: _a, ...rest } = pfNow() as unknown as Record<string, unknown> & { common: Record<string, unknown> };
  void _e; void _d; void _a;
  const common = { ...rest.common }; delete common.namedSnapshots;
  return { ...rest, common };
};

describe('named snapshots of a portfolio', () => {
  it('a plain single case captures exactly as before (no portfolio part)', () => {
    freshStore(); const s = captureSnapshot('One', T0, 'a');
    expect(s.portfolio).toBeUndefined();
  });
  it('a multi-product capture holds the whole portfolio, without view state or nested library', () => {
    fourProducts(); captureSnapshot('Plan A', T0, 'a');
    const s = lib()[0]!, p = s.portfolio as Record<string, unknown> & { products: unknown[]; waves: unknown[]; common: Record<string, unknown> };
    expect(p.products).toHaveLength(4);
    expect(p.waves).toHaveLength(2);
    expect('namedSnapshots' in p.common).toBe(false);
    expect('editScope' in p || 'displayScope' in p).toBe(false);
    expect(s.state.customerName).toBe(appStore().getState().doc.customerName);
  });
  it('activating restores products, waves, overrides and hub in ONE undo step; Ctrl+Z brings the edits back', () => {
    fourProducts();
    const captured = content();
    captureSnapshot('Plan A', T0, 'a');
    const [p1, p2] = pfNow().products;
    renameProduct(p1!.id, 'Renamed'); addProduct('Fifth'); addWave('Vague 3', 9); setWaveStart(pfNow().waves[1]!.id, 12); assignWave(p2!.id, null);
    setProductOverride(p2!.id, 'values.y1Ramp', '33'); setProductOffset(p2!.id, 5); setPortfolioHub({ infraMonthly: 999, enabled: false });
    expect(content()).not.toEqual(captured);
    const edited = snapAll(appStore()), steps = appStore().getState().history.undo.length;
    expect(activateSnapshot('a')).toBe(true);
    expect(content()).toEqual(captured);
    expect(lib()).toHaveLength(1);
    expect(appStore().getState().history.undo).toHaveLength(steps + 1);
    expect(appStore().getState().history.undo.at(-1)!.label).toBe('Activate snapshot "Plan A · v19.0"');
    expect(appStore().undo()).toBe(true);
    expect(snapAll(appStore())).toBe(edited);
    expect(appStore().redo()).toBe(true);
    expect(content()).toEqual(captured);
  });
  it('the user stays on the active product; the edit scope is kept', () => {
    fourProducts(); captureSnapshot('Plan A', T0, 'a');
    const b = pfNow().products[1]!.id;
    setActiveProduct(b); activateSnapshot('a');
    expect(pfNow().activeProductId).toBe(b);
  });
  it('baseline: exclusive flag, whole portfolio restored, one step', () => {
    fourProducts(); captureSnapshot('One', T0, 'a'); captureSnapshot('Two', new Date(T0.getTime() + 1000), 'b');
    renameProduct(pfNow().products[0]!.id, 'Changed');
    const steps = appStore().getState().history.undo.length;
    expect(setBaselineSnapshot('b')).toBe(true);
    expect(lib().map((x) => x.isBaseline)).toEqual([false, true]);
    expect(pfNow().products[0]!.name).toBe('Produit 1');
    expect(appStore().getState().history.undo).toHaveLength(steps + 1);
    appStore().undo();
    expect(pfNow().products[0]!.name).toBe('Changed');
    expect(lib().every((x) => !x.isBaseline)).toBe(true);
  });
  it('a damaged capture is refused, nothing is applied', () => {
    fourProducts(); captureSnapshot('Plan A', T0, 'a');
    appStore().batch('damage', [{ type: 't', payload: 0, label: 'damage', undoable: true, run: (d) => { (d.namedSnapshots as { portfolio: { products: unknown } }[])[0]!.portfolio.products = 'x'; } }]);
    const before = snapAll(appStore());
    expect(activateSnapshot('a')).toBe(false);
    expect(snapAll(appStore())).toBe(before);
  });
  it('compare works on the active product: identical right after the capture, a delta once that product changes', () => {
    fourProducts(); captureSnapshot('Plan A', T0, 'a');
    expect(compareSnapshots('current', 'a')!.every((r) => r.delta === 0)).toBe(true);
    setActiveProduct(pfNow().products[1]!.id);
    expect(compareSnapshots('current', 'a')!.every((r) => r.delta === 0)).toBe(true);   // the same product on both sides
    setProductOverride(pfNow().products[1]!.id, 'values.y3Ramp', '90');
    expect(compareSnapshots('a', 'current')!.some((r) => r.delta !== 0)).toBe(true);
    expect(compareSnapshots('a', 'missing')).toBeNull();
  });
});

describe('HTML snapshot and file of a portfolio', () => {
  const page = () => new DOMParser().parseFromString('<!doctype html><html><head><meta charset="utf-8"><title>AgentCase</title></head><body><div id="root"><p>x</p></div></body></html>', 'text/html').documentElement;
  it('HTML round trip keeps waves, offsets, overrides, knowledge subsets, hub and the snapshot library', () => {
    fourProducts(); captureSnapshot('Plan A', T0, 'a');
    const before = structuredClone(pfNow()), { html } = htmlSnapshotFile(page(), T0);
    freshStore();
    expect(openCaseText(html)).toBe('html');
    expect(pfNow()).toEqual(before);
    expect(lib()).toHaveLength(1);
    expect(lib()[0]!.portfolio).toBeTruthy();
    expect(getCalcBanner()).toBeNull();
    expect(pfNow().products[1]!.offsetMonths).toBe(2);
    expect(pfNow().products[2]!.knowledge.ktLeadMonths).toBe(3);
    expect(pfNow().products[3]!.waveId).toBeNull();
  });
  it('the legacy-format HTML reader is not involved: a portfolio file in an HTML page is read as this build’s', () => {
    openPortfolioFixture();
    const { html } = htmlSnapshotFile(page(), T0);
    freshStore();
    expect(openCaseText(html)).toBe('html');
    expect(pfNow().products).toHaveLength(4);
  });
});

describe('staleness of a portfolio file is reported at the right level', () => {
  const raw = (): Record<string, unknown> => JSON.parse(fixtureText('pf-three-products')) as Record<string, unknown>;
  const open = (r: Record<string, unknown>) => { freshStore(); openCaseText(JSON.stringify(r)); return getCalcBanner(); };
  it('the untouched fixture opens silently', () => { expect(open(raw())).toBeNull(); });
  it('tampering a scheduled product’s inputs: stale, and the banner names it (the shared hub moves its neighbours’ shares too)', () => {
    const r = raw(), products = r.products as { id: string; teamIn: { etp: number }[] }[], victim = products[1]!;
    victim.teamIn[0]!.etp += 5;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toContain(victim.id);
  });
  it('tampering an unscheduled product’s inputs: stale at the PRODUCT level only, that product alone is named', () => {
    const r = raw(), products = r.products as { id: string; waveId: string | null; teamIn: { etp: number }[] }[], victim = products.find((p) => p.waveId === null)!;
    victim.teamIn[0]!.etp += 5;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toEqual([victim.id]);
  });
  it('tampering a wave start: stale at the portfolio level only (every product package is still valid)', () => {
    const r = raw();
    (r.waves as { startMonth: number }[])[1]!.startMonth += 3;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toBeUndefined();
  });
  it('tampering a product offset: stale at the portfolio level only', () => {
    const r = raw();
    (r.products as { offsetMonths: number }[])[1]!.offsetMonths += 2;
    const b = open(r);
    expect(b?.state).toBe('stale');
    expect(b?.staleProducts).toBeUndefined();
  });
  it('a file saved by the app and re-exported stays valid', () => {
    openPortfolioFixture();
    const { json } = exportSnapshotJson();
    expect(open(JSON.parse(json) as Record<string, unknown>)).toBeNull();
  });
});
