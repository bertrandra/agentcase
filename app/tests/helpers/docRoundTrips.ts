import { expect } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { serialize } from '@/domain/process';
import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { freshStore } from '../store/helpers';
import { channelBus } from './channels';

/**
 * Round trips of content kept in the case's BPMN document (organisation B6b, audit B7): `edit` runs the commands under test on the installed store;
 * the document must come back identical through an autosave record (with its undo history) and reach another tab as patches.
 */
const bpmnOf = (s: AppStore) => s.getState().portfolio.common.BPMN;

export async function expectAutosaveRestores(edit: () => void): Promise<void> {
  const s = freshStore((): number => Date.now()), storage = memoryStorage(), a = startAutosave(s, storage, 'tab-1', { delayMs: 1 });
  edit();
  expect(await a.flush()).toBe(true);
  a.stop();
  const t = createAppStore(s.getState().doc);
  restoreRecord(t, (await storage.list())[0]!);
  expect(bpmnOf(t)).toStrictEqual(bpmnOf(s));
  t.undo(); s.undo();
  expect(serialize(bpmnOf(t))).toBe(serialize(bpmnOf(s)));
}

export function expectTabSync(edit: () => void): void {
  const bus = channelBus();
  const mk = (id: string) => { const x = createAppStore(makeDefaultDoc(), { now: () => 0 }); connectBroadcast(x, bus.end(), id); return x; };
  const A = mk('A'), B = mk('B');
  setAppStore(A); setInput('y1Ramp', 40); edit();
  expect(serialize(bpmnOf(B))).toBe(serialize(bpmnOf(A)));
}
