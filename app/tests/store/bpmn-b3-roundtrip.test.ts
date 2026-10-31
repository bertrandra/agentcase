import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setEffort } from '@/controllers/artefacts';
import { togglePhase } from '@/controllers/scope';
import { computeCase, engineNow, makeCtx, type CaseState } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { serialize } from '@/domain/process';
import { createAppStore } from '@/store/core';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked, SNAPSHOT_SCHEMA_VERSION } from '@/store/persistence/schema';
import { freshStore } from './helpers';

/**
 * Phase B3 gates (docs/SPEC_BPMN.md § 6.1, § 11): a version 2 file opens (migration 2 -> 3) with the SAME figures as the version 2 engine computed on
 * its keys; open -> save -> open is identical (the process document travels as XML text and comes back as the same node tree); the autosave keeps
 * its undo history across the text form.
 */
const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const raw = (id: string): Record<string, unknown> => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as Record<string, unknown>;
const opened = (file: unknown) => openChecked(file).portfolio;
const figures = (c: CaseState) => {
  const eng = engineNow(makeCtx(c));
  return JSON.stringify({ c: computeCase(c), years: eng.years() }, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v));
};

describe('identical figures: the version 2 case (its keys) and the opened version 3 case (its process document)', () => {
  it.each(ids)('%s', (id) => {
    const c = raw(id), pf = opened(c);
    expect(figures(resolveProduct(pf, pf.activeProductId))).toBe(figures(c as unknown as CaseState));
  });
});

describe('round trip: v2 file -> open (v3) -> save -> open is identical; the saved document is XML text', () => {
  it.each(ids.filter((_, i) => i % 9 === 0))('%s', (id) => {
    const a = opened(raw(id)), saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(a, () => new Date(0)))) as Record<string, unknown>;
    expect(typeof saved.BPMN).toBe('string');
    expect(saved).not.toHaveProperty('selectedArtefacts');
    expect(saved._schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    const b = opened(saved);
    expect(b).toStrictEqual(a);
    expect(JSON.stringify(toPortfolioSnapshot(b, () => new Date(0)))).toBe(JSON.stringify(saved));
  });
  it('the node tree reads back from its text as the very same tree (the undo patches address its nodes)', () => {
    const d = opened(raw('golden')).common.BPMN, r = parseBpmn(serialize(d));
    expect(r.errors).toEqual([]);
    expect(r.doc).toStrictEqual(d);
  });
  it('size of a version 3 case file (golden): JSON with the document as XML text', () => {
    const text = JSON.stringify(toPortfolioSnapshot(opened(raw('golden')), () => new Date(0)));
    const xml = serialize(opened(raw('golden')).common.BPMN);
    expect(xml.length).toBeGreaterThan(300_000);
    expect(text.length).toBeLessThan(xml.length * 1.2 + 400_000);
  });
});

describe('autosave: the record holds XML text and its undo history restores exactly', () => {
  it('edit, autosave, restore in another store: same document, and undo walks back through the node patches', async () => {
    const s = freshStore((): number => Date.now()), storage = memoryStorage(), a = startAutosave(s, storage, 'tab-1', { delayMs: 1 });
    togglePhase('V3', false);
    setEffort('A017', 9);
    expect(await a.flush()).toBe(true);
    a.stop();
    const rec = (await storage.list())[0]!;
    expect(typeof (rec.snapshot as { common: { BPMN: unknown } }).common.BPMN).toBe('string');
    const t = createAppStore(s.getState().doc);
    restoreRecord(t, rec);
    expect(t.getState().portfolio.common.BPMN).toStrictEqual(s.getState().portfolio.common.BPMN);
    expect(s.getState().history.undo.map((e) => e.type)).toEqual(['scope.togglePhase', 'artefact.setEffort']);
    expect(t.getState().history.undo).toHaveLength(2);
    t.undo(); s.undo();
    expect(t.getState().portfolio.common.BPMN).toStrictEqual(s.getState().portfolio.common.BPMN);
    t.undo(); s.undo();
    expect(serialize(t.getState().portfolio.common.BPMN)).toBe(serialize(s.getState().portfolio.common.BPMN));
  });
});
