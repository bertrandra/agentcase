import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { exportProcessFiles } from '@/controllers/bpmn';
import { setInput } from '@/controllers/inputs';
import { setEditScope } from '@/controllers/product';
import { importProcess, readProcessFile } from '@/controllers/processImport';
import { computeCase } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { caseValues, DEFAULT_CHOICES, programmeValuesOf } from '@/domain/process';
import { isProgrammeKey, PROGRAMME_VALUE_KEYS } from '@/domain/programme/storedKeys';
import { docOnly, threeProducts } from '../helpers/portfolioStore';
import { freshStore } from './helpers';

/**
 * Phase B9c (docs/SPEC_BPMN.md § 19.13): every programme command edits the document with node patches (the common document's
 * `ac:programmeValues`), undo / redo restore exactly; a product's own value is its per-field override; a Replace import reads the programme back.
 */
const KEYS = [...PROGRAMME_VALUE_KEYS, 'costProfile_tooling', 'activityDesc_pilot', 'wbsCode-pilot'];
const NOW = new Date('2026-10-31T12:00:00Z');

describe('undo / redo after every programme command (property)', () => {
  it('each edit is node patches of the common document; undo restores the state before it, redo the state after it', () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...KEYS), fc.constantFrom('', '0', '2.5', 'on', 'spread', '1.4', 'a "b" & c\nd')),
      { minLength: 1, maxLength: 6 }), (edits) => {
      const s = freshStore();
      for (const [k, v] of edits) {
        const before = docOnly(s), n = s.getState().history.undo.length;
        setInput(k, v);
        const after = docOnly(s), pf = s.getState().portfolio;
        expect(Object.keys(pf.common.dom.values).filter(isProgrammeKey)).toEqual([]);
        expect(caseValues(s.getState().doc)[k]).toBe(v);
        if (before === after || s.getState().history.undo.length === n) continue;   // nothing changed, or coalesced with the same key's edit
        const e = s.getState().history.undo.at(-1)!;
        // the document's nodes (and, for the hub infrastructure, its portfolio-level mirror)
        expect(e.patches.every((p) => (p.path[0] === 'common' && p.path[1] === 'BPMN') || p.path[0] === 'hub')).toBe(true);
        s.undo();
        expect(docOnly(s)).toBe(before);
        s.redo();
        expect(docOnly(s)).toBe(after);
      }
    }), { numRuns: 25 });
  }, 60_000);
  it('an edit of one value is a few small patches (an attribute; a new entry appended at the end)', () => {
    const s = freshStore();
    setInput('pilotFte', '4');
    const p = s.getState().history.undo.at(-1)!.patches;
    expect(p).toHaveLength(1);
    expect(p[0]!.path.at(-1)).toBe('value');
    setInput('optAudit', 'on');
    expect(JSON.stringify(s.getState().history.undo.at(-1)!.patches).length).toBeLessThan(600);
  });
});

describe('a portfolio: the common document, the product\'s own part', () => {
  it('"this product" writes a per-field override; the common document and the other products are unchanged', () => {
    const { s, ids } = threeProducts();
    setEditScope('product');
    setInput('pilotFte', '6');
    const pf = s.getState().portfolio;
    expect(pf.products[0]!.overrides.dom?.values?.pilotFte).toBe('6');
    expect(programmeValuesOf(pf.common.BPMN).pilotFte).toBe('3');
    expect(caseValues(resolveProduct(pf, ids[0])).pilotFte).toBe('6');
    expect(caseValues(resolveProduct(pf, ids[1])).pilotFte).toBe('3');
    setInput('pilotFte', '3');   // back to the common value: the override goes
    expect(s.getState().portfolio.products[0]!.overrides.dom?.values?.pilotFte).toBe('3');
  });
  it('a product with its own process document reads the common values (no copy), and an edit of the common value reaches it', () => {
    const { s, ids } = threeProducts();
    setEditScope('product');
    s.dispatch({ type: 'test.processOverride', payload: null, label: 'override', undoable: true,
      run: (d) => { d.BPMN = { ...d.BPMN, after: '\n\n' }; } });
    const own = s.getState().portfolio.products[0]!.overrides.BPMN;
    expect(own).toBeDefined();
    expect(programmeValuesOf(own)).toEqual({});
    setEditScope('all');
    const total = computeCase(resolveProduct(s.getState().portfolio, ids[0])).model.setupTotal;
    setInput('setupTooling', '50000');
    const pf = s.getState().portfolio;
    expect(caseValues(resolveProduct(pf, ids[0])).setupTooling).toBe('50000');
    expect(computeCase(resolveProduct(pf, ids[0])).model.setupTotal).toBeCloseTo(total + 15000, 6);
  });
});

describe('import: a Replace import of an AgentCase file reads its programme back', () => {
  const file = (text: string) => ({ name: 'p.bpmn', size: text.length, text: async () => text });
  it('export "both" -> import (replace) -> export is byte-identical; a value changed in the file is read back', async () => {
    const s = freshStore();
    setInput('pilotFte', '4'); setInput('optHypercare', 'on'); setInput('costProfile_tooling', 'one-off'); setInput('activityDesc_pilot', 'Own text');
    const [a] = exportProcessFiles('shown', false, NOW, false, 'both'), r = await readProcessFile(file(a!.text));
    if (!r.ok) throw new Error(r.errors.join());
    const doc = s.getState().portfolio.common.BPMN;
    expect(importProcess(r, { ...DEFAULT_CHOICES, mode: 'replace' })).not.toBeNull();
    expect(exportProcessFiles('shown', false, NOW, false, 'both')[0]!.text).toBe(a!.text);
    expect(programmeValuesOf(s.getState().portfolio.common.BPMN)).toEqual(programmeValuesOf(doc));
    s.undo();
    setInput('pilotFte', '2'); setInput('costProfile_tooling', 'spread'); setInput('activityDesc_pilot', '');
    const back = await readProcessFile(file(a!.text));
    if (!back.ok) throw new Error(back.errors.join());
    importProcess(back, { ...DEFAULT_CHOICES, mode: 'replace' });
    const v = caseValues(s.getState().doc);
    expect([v.pilotFte, v.costProfile_tooling, v.activityDesc_pilot]).toEqual(['4', 'one-off', 'Own text']);
    expect(exportProcessFiles('shown', false, NOW, false, 'both')[0]!.text).toBe(a!.text);
  });
});
