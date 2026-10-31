import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { computeCase, engineNow, makeCtx, type CaseState } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { programmeValuesOf, serialize, storedElement, withoutStoredValues } from '@/domain/process';
import { isProgrammeKey } from '@/domain/programme/storedKeys';
import { createAppStore } from '@/store/core';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked, SNAPSHOT_SCHEMA_VERSION } from '@/store/persistence/schema';
import { freshStore } from './helpers';

/**
 * Phase B9c gates (docs/SPEC_BPMN.md § 6.1 schema v4, § 19.13): a version 3 file (the programme's values in its case keys) opens with the values in
 * the document and the SAME figures; v3 -> open -> save -> open is identical; a saved file holds no programme key in its form values; the
 * autosave keeps its undo history across the text form.
 */
type Rec = Record<string, unknown>;
const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const raw = (id: string): Rec => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as Rec;
const opened = (file: unknown) => openChecked(file).portfolio;
const saved = (pf: ReturnType<typeof opened>): Rec => JSON.parse(JSON.stringify(toPortfolioSnapshot(pf, () => new Date(0)))) as Rec;
const figures = (c: CaseState) => JSON.stringify({ c: computeCase(c), years: engineNow(makeCtx(c)).years() },
  (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v));

/** The version 3 form of a saved case (what a B9b build wrote): the values as case keys, the document without them, stamped 3. */
function asV3(file: Rec): Rec {
  const d = parseBpmn(file.BPMN as string).doc!, dom = file.dom as { values: Rec; checked: Rec };
  return { ...file, _schemaVersion: 3, BPMN: serialize(withoutStoredValues(d)), dom: { ...dom, values: { ...dom.values, ...programmeValuesOf(d) } } };
}

describe('a version 3 file opens as schema v4 with identical figures', () => {
  it.each(ids.filter((_, i) => i % 5 === 0))('%s', (id) => {
    const v4 = saved(opened(raw(id))), v3 = asV3(v4), pf = opened(v3);
    expect(Object.keys(pf.common.dom.values).filter(isProgrammeKey)).toEqual([]);
    expect(storedElement(pf.common.BPMN)).toBeDefined();
    expect(figures(resolveProduct(pf, pf.activeProductId))).toBe(figures(raw(id) as unknown as CaseState));
    expect(pf).toStrictEqual(opened(raw(id)));
  });
});

describe('round trip: v3 -> open (v4) -> save -> open is identical', () => {
  it.each(ids.filter((_, i) => i % 11 === 0))('%s', (id) => {
    const a = opened(asV3(saved(opened(raw(id))))), file = saved(a);
    expect(file._schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(Object.keys((file.dom as { values: Rec }).values).filter(isProgrammeKey)).toEqual([]);
    expect(file.BPMN as string).toContain('<ac:programmeValues>');
    const b = opened(file);
    expect(b).toStrictEqual(a);
    expect(JSON.stringify(saved(b))).toBe(JSON.stringify(file));
  });
  it('the shipped version 3 portfolio example opens, saves and opens identically; every product keeps its figures', () => {
    const v3 = JSON.parse(readFileSync('../docs/examples/AgentCase_Portfolio_Example.json', 'utf8')) as Rec, a = opened(v3), file = saved(a), b = opened(file);
    expect(b).toStrictEqual(a);
    expect(Object.keys(a.common.dom.values).filter(isProgrammeKey)).toEqual([]);
    for (const p of a.products) expect(figures(resolveProduct(b, p.id))).toBe(figures(resolveProduct(a, p.id)));
  });
});

describe('autosave: a programme edit restores with its undo history', () => {
  it('two programme edits, autosave, restore: same document; undo walks back through the node patches', async () => {
    const s = freshStore((): number => Date.now()), storage = memoryStorage(), a = startAutosave(s, storage, 'tab-1', { delayMs: 1 });
    setInput('pilotFte', '5');
    setInput('optHypercare', 'on');
    expect(await a.flush()).toBe(true);
    a.stop();
    const rec = (await storage.list())[0]!, t = createAppStore(s.getState().doc);
    restoreRecord(t, rec);
    expect(t.getState().portfolio.common.BPMN).toStrictEqual(s.getState().portfolio.common.BPMN);
    expect(t.getState().history.undo).toHaveLength(2);
    t.undo(); s.undo();
    expect(serialize(t.getState().portfolio.common.BPMN)).toBe(serialize(s.getState().portfolio.common.BPMN));
    expect(programmeValuesOf(t.getState().portfolio.common.BPMN).optHypercare).toBeUndefined();
    t.undo();
    expect(programmeValuesOf(t.getState().portfolio.common.BPMN).pilotFte).toBe('3');
  });
});
