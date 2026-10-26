import { describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { openCaseText } from '@/controllers/openFile';
import { currentPersona, setPersona } from '@/controllers/persona';
import { deletePersona } from '@/controllers/pdcPersonas';
import { renameProduct, setEditScope } from '@/controllers/product';
import { activateSnapshot, captureSnapshot } from '@/controllers/snapshots';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { VIEW_FIELDS } from '@/store/types';
import { readFileSync } from 'node:fs';
import { fourProducts, pfNow } from '../helpers/portfolioFixtures';
import { freshStore } from './helpers';

const view = () => { const p = pfNow() as unknown as Record<string, unknown>; return Object.fromEntries(VIEW_FIELDS.map((k) => [k, p[k]])); };
const noViewInHistory = () => appStore().getState().history.undo
  .every((e) => [...e.patches, ...e.inverse].every((p) => !VIEW_FIELDS.includes(p.path[0] as string)));

describe('view state is never part of an undo step (lot 10)', () => {
  it('activating a portfolio snapshot in a Wave view keeps the view; undo / redo do not move it', () => {
    fourProducts();
    captureSnapshot('Plan A', new Date('2026-10-22T10:00:00Z'), 'a');
    renameProduct(pfNow().products[0]!.id, 'Renamed');
    const w2 = pfNow().waves[1]!.id;
    setDisplayScope({ kind: 'wave', id: w2 });
    const shown = view();
    expect(shown.displayScope).toEqual({ kind: 'wave', id: w2 });
    expect(activateSnapshot('a')).toBe(true);
    expect(pfNow().products[0]!.name).toBe('Product 1');
    expect(view()).toEqual(shown);
    expect(noViewInHistory()).toBe(true);
    appStore().undo();
    expect(pfNow().products[0]!.name).toBe('Renamed');
    expect(view()).toEqual(shown);
    appStore().redo();
    expect(view()).toEqual(shown);
  });
  it('a file opened as an undoable step (File > Open) carries no view state in that step: undoing it does not move the view', () => {
    fourProducts();
    setDisplayScope({ kind: 'portfolio' }); setEditScope('product');
    openCaseText(readFileSync('fixtures/cases/golden.json', 'utf8'));
    expect(noViewInHistory()).toBe(true);
    const after = view();
    appStore().undo();
    expect(pfNow().products).toHaveLength(4);
    expect(view()).toEqual(after);
  });
});

describe('deleting the persona a tab shows reads the case without writing it (lot 10)', () => {
  it('a case with no persona list: the derived case is not mutated and the tab moves to Advanced', () => {
    const s = freshStore();
    s.batch('drop', [{ type: 't', payload: 0, label: 'drop', undoable: false, run: (d) => { delete d.PERSONAS; } }]);
    const base = editBase();
    expect('PERSONAS' in base).toBe(false);
    Object.freeze(base);   // the case controllers read is derived: writing it would throw (strict mode) or leak into the next read
    setPersona('custom');
    expect(() => deletePersona('custom')).not.toThrow();
    expect('PERSONAS' in base).toBe(false);
    expect(currentPersona()).toBe('advanced');
  });
});
