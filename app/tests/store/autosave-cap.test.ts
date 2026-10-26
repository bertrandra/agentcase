import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { AUTOSAVE_FAILED, configureSessions, listSessions, saveSessionNow, SESSION_CAP } from '@/controllers/sessions';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc } from '@/store/instance';
import { AUTOSAVE_CAP, memoryStorage, restoreRecord, startAutosave, type AutosaveRecord, type AutosaveStorage } from '@/store/persistence/autosave';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { SNAPSHOT_SCHEMA_VERSION, VERSION_KEY } from '@/store/persistence/schema/version';
import { freshStore } from './helpers';

afterEach(() => configureSessions(null));
const manual = { setTimer: () => 1, clearTimer: () => undefined };
const old = (i: number): AutosaveRecord => ({ tabId: `old-${i}`, savedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), label: `Old ${i}`,
  snapshot: toPortfolioSnapshot(createAppStore(makeDefaultDoc()).getState().portfolio, undefined, true), history: { undo: [], redo: [] },
  format: 'portfolio' });
const failing = (inner: AutosaveStorage, fail: { on: boolean }): AutosaveStorage => ({ ...inner,
  put: async (r) => { if (fail.on) throw new DOMException('Quota exceeded', 'QuotaExceededError'); await inner.put(r); } });

describe('autosave records are capped (lot 10)', () => {
  it('after a save only the most recent records stay, this tab\'s own one included; the oldest go first', async () => {
    const storage = memoryStorage(), s = freshStore();
    for (let i = 0; i < AUTOSAVE_CAP + 5; i++) await storage.put(old(i));
    const a = startAutosave(s, storage, 'me', manual);
    expect(await a.flush()).toBe(true);
    const ids = (await storage.list()).map((r) => r.tabId);
    expect(ids).toHaveLength(AUTOSAVE_CAP);
    expect(ids).toContain('me');
    expect(ids).not.toContain('old-0');
    expect(ids).not.toContain('old-5');   // 25 old records + mine: the 6 oldest go
    expect(ids).toContain('old-6');
    expect(SESSION_CAP).toBe(AUTOSAVE_CAP);
    a.stop();
  });
  it('a failed save never throws: it is reported once per failure streak, and saveSessionNow tells the user', async () => {
    const fail = { on: true }, storage = failing(memoryStorage(), fail), errors: unknown[] = [], s = freshStore();
    const a = startAutosave(s, storage, 'me', { ...manual, onError: (e) => errors.push(e) });
    expect(await a.flush()).toBe(false);
    expect(await a.flush()).toBe(false);
    expect(errors).toHaveLength(1);
    fail.on = false; expect(await a.flush()).toBe(true);
    fail.on = true; expect(await a.flush()).toBe(false);
    expect(errors).toHaveLength(2);
    a.stop();
    configureSessions({ storage, tabId: 'me' });
    await expect(saveSessionNow()).rejects.toThrow(AUTOSAVE_FAILED);
    fail.on = false; await saveSessionNow();
    expect((await listSessions()).map((r) => r.tabId)).toEqual(['me']);
  });
});

describe('restoring a record of an older file schema (lot 10)', () => {
  it('the history comes back only when the record is of the current schema (a migration may have changed the shape its patches address)', async () => {
    const storage = memoryStorage(), s = freshStore(), a = startAutosave(s, storage, 'T', manual);
    setInput('y1Ramp', 31);
    await a.flush(); a.stop();
    const rec = (await storage.list())[0]!;
    expect(rec.snapshot[VERSION_KEY]).toBe(SNAPSHOT_SCHEMA_VERSION);
    const now = createAppStore(makeDefaultDoc());
    restoreRecord(now, rec);
    expect(now.getState().history.undo).toHaveLength(1);
    const older = createAppStore(makeDefaultDoc());
    restoreRecord(older, { ...rec, snapshot: { ...rec.snapshot, [VERSION_KEY]: SNAPSHOT_SCHEMA_VERSION - 1 } });
    expect(older.getState().doc.dom.values.y1Ramp).toBe('31');
    expect(older.getState().history.undo).toHaveLength(0);
  });
});
