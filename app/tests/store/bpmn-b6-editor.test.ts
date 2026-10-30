import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editorSource, saveEditorXml } from '@/controllers/processEditor';
import { computeCase } from '@/domain';
import { readProcess, serialize } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { drawTask, editorSave } from '../helpers/editorModdle';
import { freshStore } from './helpers';

/**
 * Phase B6 (docs/SPEC_BPMN.md D-B6 b): the BPMN editor's save on the store. A save is ONE undoable command (`process.applyEditor`) whose patch is
 * the nodes that changed; a save without a change and a refused save write nothing; undo gives the exact document back.
 */
const tree = (s: AppStore) => s.getState().doc.BPMN;
const steps = (s: AppStore) => s.getState().history.undo.length;
const lastPatch = (s: AppStore): string => JSON.stringify(s.getState().history.undo.at(-1)?.patches ?? []);

describe('phase B6 editor command', { timeout: 30_000 }, () => {
  it('open → save without a change: no command, the same document', async () => {
    const s = freshStore(), d = tree(s), n = steps(s);
    const { xml } = await editorSave(editorSource());
    expect(saveEditorXml(xml)).toEqual({ status: 'unchanged', messages: ['No change to save.'] });
    expect(tree(s)).toBe(d);
    expect(steps(s)).toBe(n);
  });
  it('a save with edits is one step with a node-level patch; undo restores the exact document; the new activity counts', async () => {
    const s = freshStore(), before = serialize(tree(s)), n = steps(s), figures = JSON.stringify(computeCase(s.getState().doc).headline);
    const { xml } = await editorSave(editorSource(), (e) => {
      ((e.byId.A017_di as unknown as { bounds: { y: number } }).bounds).y += 10;
      drawTask(e, 'V3', 'Activity_1b6', 'Pair review');
    });
    const r = saveEditorXml(xml);
    expect(r.status).toBe('applied');
    expect(r.messages[0]).toMatch(/^1 activity added \(Activity_1b6\)/);
    expect(steps(s)).toBe(n + 1);
    expect(s.getState().history.undo.at(-1)?.label).toBe('Edit the process diagram (BPMN editor)');
    expect(lastPatch(s)).not.toContain('"kind":"document"');
    expect(lastPatch(s).length).toBeLessThan(6_000);
    expect(readProcess(tree(s)).activities.some((a) => a.id === 'Activity_1b6')).toBe(true);
    expect(JSON.stringify(computeCase(s.getState().doc).headline)).not.toBe(figures);
    s.undo();
    expect(serialize(tree(s))).toBe(before);
  });
  it('a file the B2 reader refuses, or a structure change, writes nothing and says why', async () => {
    const s = freshStore(), d = tree(s), n = steps(s);
    const bad = saveEditorXml(readFileSync('fixtures/bpmn/hostile/xxe-external-entity.bpmn', 'utf8'));
    expect(bad.status).toBe('refused');
    expect(bad.messages.join()).toMatch(/DOCTYPE/);
    const { xml } = await editorSave(editorSource(), (e) => {
      const ph = e.byId.Process as unknown as { flowElements: unknown[] };
      ph.flowElements = ph.flowElements.filter((x) => x !== e.byId.V7);
    });
    expect(saveEditorXml(xml).messages.join()).toMatch(/Phase V7/);
    expect(tree(s)).toBe(d);
    expect(steps(s)).toBe(n);
  });
});
