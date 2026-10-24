// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { setInput } from '@/controllers/inputs';
import { loadEmbeddedCase } from '@/controllers/boot';
import { addProduct, setActiveProduct, setEditScope } from '@/controllers/product';
import { setProductOverride } from '@/controllers/productOverrides';
import { assignWave } from '@/controllers/wave';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc, setAppStore } from '@/store/instance';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { connectBroadcast, type ChannelLike } from '@/store/persistence/broadcast';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { openChecked } from '@/store/persistence/schema';
import { validate } from '@/domain/portfolio';
import { threeProducts } from '../helpers/portfolioStore';
import { freshStore } from './helpers';

const pf = () => appStore().getState().portfolio;
const page = () => new DOMParser().parseFromString('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>', 'text/html');

describe('HTML embed and read', () => {
  it('a portfolio is embedded as agentcase.portfolio.v1 and read back whole; a single case stays v1', () => {
    const t = threeProducts(); setProductOverride(t.ids[0], 'values.y1Ramp', '19');
    const { html } = htmlSnapshotFile(page().documentElement, new Date('2026-10-21T10:00:00Z'));
    const back = readEmbeddedCase(new DOMParser().parseFromString(html, 'text/html'))!;
    expect(back.portfolio.products).toHaveLength(3);
    expect(back.portfolio.products[0]!.overrides.dom?.values?.y1Ramp).toBe('19');
    freshStore();
    expect(loadEmbeddedCase(new DOMParser().parseFromString(html, 'text/html'))).not.toBeNull();
    expect(pf().products).toHaveLength(3);
    freshStore();
    expect((readEmbeddedCase(new DOMParser().parseFromString(htmlSnapshotFile(page().documentElement).html, 'text/html'))!.raw as { _schema: string })._schema).toBe('agentcase.snapshot.v1');
  });
});

describe('autosave and multi-tab on a portfolio', () => {
  it('the autosave record holds the exact portfolio and its history; Ctrl+Z works after restore', async () => {
    const t = threeProducts(), storage = memoryStorage(), a = startAutosave(t.s, storage, 'tab-1', { setTimer: () => 1, clearTimer: () => undefined });
    setEditScope('product'); setActiveProduct(t.ids[1]); setInput('y1Ramp', 31); assignWave(t.ids[1], null);
    await a.flush();
    const rec = (await storage.list())[0]!, other = createAppStore(makeDefaultDoc());
    restoreRecord(other, rec);
    expect(other.getState().portfolio.products).toHaveLength(3);
    expect(other.getState().portfolio.products[1]!.waveId).toBeNull();
    expect(other.getState().history.undo).toHaveLength(t.s.getState().history.undo.length);
    while (other.undo()) { /* all the way back */ }
    expect(other.getState().portfolio.products[1]!.waveId).toBe(t.waves[0]);
    expect(other.getState().portfolio.products[1]!.overrides).toEqual({});
    a.stop();
  });
  it('a record written before the portfolio store restores its document but not its (case-level) history', () => {
    const s = freshStore(), old = toPortfolioSnapshot(s.getState().portfolio, undefined, true);
    const other = createAppStore(makeDefaultDoc());
    restoreRecord(other, { tabId: 'x', savedAt: '', label: 'old', snapshot: old, history: { undo: [{ label: 'a', type: 't', ts: 0, patches: [{ op: 'replace', path: ['dom'], value: 1 }], inverse: [] }], redo: [] } });
    expect(other.getState().history.undo).toHaveLength(0);
  });
  it('portfolio patches reach a second tab; the active product and edit scope stay local', () => {
    const t = threeProducts(), B = createAppStore(t.s.getState().portfolio, { now: () => 0 });
    const a: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined }, b: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined };
    a.postMessage = (m) => b.onmessage?.({ data: structuredClone(m) });
    connectBroadcast(t.s, a, 'A'); connectBroadcast(B, b, 'B');
    addProduct('D'); setProductOverride(t.ids[0], 'values.y1Ramp', '22'); setActiveProduct(t.ids[2]); setEditScope('product');
    expect(B.getState().portfolio.products.map((p) => p.name)).toEqual(t.s.getState().portfolio.products.map((p) => p.name));
    expect(B.getState().portfolio.products[0]!.overrides.dom?.values?.y1Ramp).toBe('22');
    expect(B.getState().portfolio.activeProductId).toBe(t.ids[0]);
    expect(B.getState().portfolio.editScope).toBeUndefined();
    expect(B.getState().history.undo).toHaveLength(0);
    setAppStore(t.s);
  });
});

describe('sanitize on portfolios', () => {
  const good = () => JSON.parse(JSON.stringify(toPortfolioSnapshot(threeProducts().s.getState().portfolio))) as Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
  it('drops prototype-pollution keys anywhere in the portfolio', () => {
    const raw = good(), text = JSON.stringify(raw).replace('"overrides":{}', '"overrides":{"__proto__":{"polluted":1},"constructor":{"x":1}}');
    const pfo = openSnapshot(JSON.parse(text));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(pfo.products[0]!.overrides)).toEqual([]);
  });
  it.each([
    ['unsafe product id', (r: Record<string, any>) => { r.products[1].id = '../x'; }],   // eslint-disable-line @typescript-eslint/no-explicit-any
    ['product in two waves', (r: Record<string, any>) => { r.waves[1].productIds.push(r.waves[0].productIds[0]); }],   // eslint-disable-line @typescript-eslint/no-explicit-any
    ['unknown active product', (r: Record<string, any>) => { r.activeProductId = 'nope'; }],   // eslint-disable-line @typescript-eslint/no-explicit-any
    ['no products', (r: Record<string, any>) => { r.products = []; r.waves = []; }],   // eslint-disable-line @typescript-eslint/no-explicit-any
    ['an override off the whitelist', (r: Record<string, any>) => { r.products[0].overrides = { RATE: {} }; }],   // eslint-disable-line @typescript-eslint/no-explicit-any
    ['common without inputs', (r: Record<string, any>) => { delete r.common.dom; }],   // eslint-disable-line @typescript-eslint/no-explicit-any
  ])('repairs %s: the file opens valid, with the correction listed (never half-read, never refused)', (_n, mut) => {
    const raw = good(); mut(raw);
    const { portfolio, notes } = openChecked(raw);
    expect(notes.length).toBeGreaterThan(0);
    expect(validate(portfolio).errors).toEqual([]);
    expect(portfolio.products.every((p) => /^[A-Za-z0-9_-]{1,64}$/.test(p.id))).toBe(true);
  });
});
