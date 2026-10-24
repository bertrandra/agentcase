import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook } from '@/controllers/excelParams';
import { exportSnapshotJson } from '@/controllers/files';
import { setInput } from '@/controllers/inputs';
import { openCaseText } from '@/controllers/openFile';
import { setPersona } from '@/controllers/persona';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc } from '@/store/instance';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { readFileSync } from 'node:fs';
import { channelPair } from '../helpers/channels';
import { ENV } from '../helpers/excelParams';
import { freshStore } from './helpers';

/** The current persona is view state of the tab (decision D3, `store/persona.ts`). */
const persona = () => appStore().getState().portfolio.persona;
const golden = () => readFileSync('fixtures/cases/golden.json', 'utf8');

describe('persona = view state of the tab', () => {
  it('a switch is never an undo step, never in the case, and an undo does not move it', () => {
    const s = freshStore();
    expect(persona()).toBe('builder');
    setInput('y1Ramp', 33); setPersona('advanced');
    expect(s.getState().history.undo).toHaveLength(1);
    expect('currentPersona' in s.getState().doc).toBe(false);
    expect('currentPersona' in s.getState().portfolio.common).toBe(false);
    s.undo(); expect(persona()).toBe('advanced');
    s.redo(); expect(persona()).toBe('advanced');
  });
  it('switching in one tab does not change another tab (not broadcast); document edits still are', () => {
    const A = freshStore(), B = createAppStore(makeDefaultDoc());
    const [ca, cb] = channelPair(); connectBroadcast(A, ca, 'A'); connectBroadcast(B, cb, 'B');
    setPersona('advanced');
    expect(B.getState().portfolio.persona).toBe('builder');
    setInput('y1Ramp', 33);
    expect(B.getState().doc.dom.values.y1Ramp).toBe('33');
    expect(B.getState().portfolio.persona).toBe('builder');
  });
  it('an old file with currentPersona opens on that persona; undoing the open keeps the persona', () => {
    const s = freshStore();
    openCaseText(golden().replace('"currentPersona":"builder"', '"currentPersona":"clientcase"'));
    expect(persona()).toBe('clientcase');
    expect('currentPersona' in s.getState().doc).toBe(false);
    s.undo(); expect(persona()).toBe('clientcase');
    openCaseText(golden().replace('"currentPersona":"builder",', ''));   // a file without one opens on the default persona
    expect(persona()).toBe('builder');
  });
  it('saved files keep the legacy key as the persona they open on (this tab\'s), first key of the case', () => {
    freshStore(); setPersona('advanced');
    const json = exportSnapshotJson().json;
    expect(json.startsWith('{"currentPersona":"advanced",')).toBe(true);
    freshStore(); openCaseText(json);
    expect(persona()).toBe('advanced');
  });
  it('the persona-only JSON companion of the parameters workbook names this tab\'s persona (legacy currentPersona)', async () => {
    freshStore(); setPersona('admin');
    const out = await exportParamsWorkbook('persona-only', ENV);
    expect((JSON.parse(await out.companion!.blob.text()) as { currentPersona: string }).currentPersona).toBe('admin');
  });
  it('a stray currentPersona coming from a command or a remote patch never lands in the case', () => {
    const s = freshStore();
    s.batch('old', [{ type: 'x', payload: null, label: 'x', undoable: true, run: (d) => { d.currentPersona = 'admin'; d.customerName = 'X'; } }]);
    expect('currentPersona' in s.getState().portfolio.common).toBe(false);
    expect(persona()).toBe('builder');
    s.applyRemote([{ op: 'add', path: ['common', 'currentPersona'], value: 'admin' }]);
    expect('currentPersona' in s.getState().portfolio.common).toBe(false);
  });
});
