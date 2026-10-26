import { describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { setDisplayScope } from '@/controllers/displayScope';
import { setPersona } from '@/controllers/persona';
import { addProduct, setEditScope } from '@/controllers/product';
import { addWave } from '@/controllers/wave';
import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { connectBroadcast, SYNC_NOTICES, type ChannelLike } from '@/store/persistence/broadcast';
import { documentOf } from '@/store/portfolioState';
import { channelBus, channelPair } from '../helpers/channels';

/** Run controllers on one tab's store. */
const on = <T>(s: AppStore, f: () => T): T => { setAppStore(s); return f(); };
const tab = (bus: ReturnType<typeof channelBus>, id: string, notes: string[] = []) => {
  const s = createAppStore(makeDefaultDoc(), { now: () => 0 });
  connectBroadcast(s, bus.end(), id, { onNotice: (t) => notes.push(t) });
  return s;
};
const same = (a: AppStore, b: AppStore) => expect(JSON.stringify(documentOf(b.getState().portfolio))).toBe(JSON.stringify(documentOf(a.getState().portfolio)));
const opened = (s: AppStore, name: string) => { const d = makeDefaultDoc(); d.customerName = name; s.load(d); };

describe('multi-tab sync: document id + revision (lot 10)', () => {
  it('opening a document in one tab replaces it in the others, which keep their own view state; their undo history goes, with a notice', () => {
    const bus = channelBus(), notes: string[] = [], A = tab(bus, 'A'), B = tab(bus, 'B', notes);
    on(B, () => { addWave('Wave 2', 6); setInput('y1Ramp', 44); setPersona('advanced'); setEditScope('product'); });
    on(B, () => setDisplayScope({ kind: 'portfolio' }));
    expect(B.getState().history.undo.length).toBeGreaterThan(0);
    const before = B.syncId();
    same(A, B);   // B's edits reached A
    opened(A, 'Opened in A');
    same(A, B);
    expect(B.getState().doc.customerName).toBe('Opened in A');
    expect(B.syncId()).toEqual(A.syncId());
    expect(B.syncId().docId).not.toBe(before.docId);
    expect(B.getState().portfolio.persona).toBe('advanced');
    expect(B.getState().portfolio.displayScope).toEqual({ kind: 'portfolio' });
    expect(B.getState().portfolio.editScope).toBe('all');
    expect(A.getState().portfolio.displayScope).toBeUndefined();
    expect(B.getState().history).toEqual({ undo: [], redo: [] });
    expect(notes.at(-1)).toBe(`${SYNC_NOTICES.opened}: ${SYNC_NOTICES.cleared}`);
    expect(B.undo()).toBe(false);
    on(A, () => setInput('y1Ramp', 12));   // later patches land on the replaced document
    expect(B.getState().doc.dom.values.y1Ramp).toBe('12');
  });
  it('a patch never lands on a different document: a tab that missed the open ignores the patches of the other one', () => {
    const bus = channelBus(), A = tab(bus, 'A');
    opened(A, 'Mine');
    const C = tab(bus, 'C');   // opened after the load message: still on the default case
    on(A, () => setInput('y1Ramp', 77));
    expect(C.getState().doc.dom.values.y1Ramp).toBe(makeDefaultDoc().dom.values.y1Ramp);
    expect(C.getState().doc.customerName).toBe(makeDefaultDoc().customerName);
  });
  it('a tab at another revision of the same document resyncs: it asks for the whole document and ends identical', () => {
    const bus = channelBus(), A = tab(bus, 'A');
    on(A, () => { addProduct('B'); addProduct('C'); setInput('y1Ramp', 21); });
    const B = tab(bus, 'B');   // a tab opened later, on the default case (revision 0)
    on(A, () => setInput('y1Ramp', 22));
    same(A, B);
    expect(B.getState().portfolio.products).toHaveLength(3);
    expect(B.syncId()).toEqual(A.syncId());
    on(A, () => setInput('y1Ramp', 23));
    expect(B.getState().doc.dom.values.y1Ramp).toBe('23');
  });
  it('two tabs editing at the same moment converge on one document (the higher tab id wins), both undo stacks cleared', () => {
    const bus = channelBus(), A = tab(bus, 'A'), B = tab(bus, 'B');
    bus.hold();
    on(A, () => addProduct('From A')); on(B, () => addProduct('From B'));
    bus.release();
    same(A, B);
    expect(A.getState().portfolio.products.map((p) => p.name)).toContain('From B');
    expect(A.getState().history.undo).toHaveLength(0);
    on(A, () => setInput('y1Ramp', 61));
    expect(B.getState().doc.dom.values.y1Ramp).toBe('61');
  });
  it('a patch that does not fit is refused whole (no throw, nothing changes) and the tab asks the sender for its document', () => {
    const B = createAppStore(makeDefaultDoc()), [a, b] = channelPair(), got: unknown[] = [];
    connectBroadcast(B, b, 'B');
    (a as ChannelLike).onmessage = (e) => got.push(e.data);
    const before = JSON.stringify(B.getState().portfolio), at = B.syncId();
    a.postMessage({ tabId: 'X', kind: 'patch', docId: at.docId, base: at.rev, rev: at.rev + 1,
      patches: [{ op: 'replace', path: ['products', 7, 'name'], value: 'x' }] });
    expect(JSON.stringify(B.getState().portfolio)).toBe(before);
    expect(B.syncId()).toEqual(at);
    expect(got).toEqual([expect.objectContaining({ kind: 'request', to: 'X', tabId: 'B', docId: at.docId })]);
    expect(B.applyRemote([{ op: 'remove', path: ['waves', 9, 'productIds', 3] }])).toEqual({ applied: false, historyCleared: false });
  });
});

describe('undo after a change from another tab (lot 10)', () => {
  it('a remote change of the products or waves clears the local undo / redo, with a notice; a value change keeps them', () => {
    const bus = channelBus(), notes: string[] = [], A = tab(bus, 'A'), B = tab(bus, 'B', notes);
    on(B, () => { setInput('y1Ramp', 30); setInput('autoPotential', 40); });
    B.undo();
    on(A, () => setInput('autoPotential', 50));
    expect(B.getState().history.undo).toHaveLength(1);
    expect(B.getState().history.redo).toHaveLength(1);
    expect(notes).toEqual([]);
    on(A, () => addProduct('New'));
    expect(B.getState().portfolio.products).toHaveLength(2);
    expect(B.getState().history).toEqual({ undo: [], redo: [] });
    expect(notes).toEqual([`${SYNC_NOTICES.structure}: ${SYNC_NOTICES.cleared}`]);
    expect(B.undo()).toBe(false);
    on(A, () => addWave('Wave 2', 3));   // nothing left to clear: no further notice
    expect(notes).toHaveLength(1);
  });
});
