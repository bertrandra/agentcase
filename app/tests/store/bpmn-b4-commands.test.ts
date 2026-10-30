import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addProcessActivity } from '@/controllers/process';
import { importProcess, readProcessFile, resetProcessTo } from '@/controllers/processImport';
import { moveProcessActivity, setProcessDiagram, setProcessRework } from '@/controllers/processLayout';
import { computeCase } from '@/domain';
import { DEFAULT_CHOICES, exportCaseText, readProcess, serialize } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { CUSTOM } from './samples/process';
import { freshStore } from './helpers';

/**
 * Phase B4 commands on the store (docs/SPEC_BPMN.md § 9): one undoable step each, node-level patches, the import refused before anything is
 * written, undo of an import or a reset restoring the exact document, and the figures of a case unchanged by importing its own export.
 */
const tree = (s: AppStore) => s.getState().doc.BPMN;
const lastPatch = (s: AppStore): string => JSON.stringify(s.getState().history.undo.at(-1)?.patches ?? []);
const fileOf = (name: string, text: string) => ({ name, size: text.length, text: async () => text });

describe('phase B4 commands', { timeout: 30_000 }, () => {
  it('setDiagram and setReworkFlow are attribute patches, coalesced per element; moveActivity never patches the whole document', () => {
    const s = freshStore(), steps = s.getState().history.undo.length;
    setProcessDiagram('A017', { x: 10, y: 20, w: 100, h: 80 });
    setProcessDiagram('A017', { x: 30, y: 20, w: 100, h: 80 });
    expect(s.getState().history.undo.length).toBe(steps + 1);
    expect(lastPatch(s).length).toBeLessThan(1_500);
    setProcessRework('LP001', { probability: 0.3 });
    expect(lastPatch(s).length).toBeLessThan(600);
    moveProcessActivity('A019', 'V4');
    expect(lastPatch(s)).not.toContain('"kind":"document"');
    expect(readProcess(tree(s)).activities.find((a) => a.id === 'A019')?.phase).toBe('V4');
  });
  it('an import is one step that undo reverts exactly; importing the case\'s own export changes no figure', async () => {
    const s = freshStore(), before = serialize(tree(s)), figures = JSON.stringify(computeCase(s.getState().doc).headline);
    const r = await readProcessFile(fileOf('own.bpmn', exportCaseText(s.getState().doc)));
    if (!r.ok) throw new Error(r.errors.join());
    const steps = s.getState().history.undo.length, report = importProcess(r, { ...DEFAULT_CHOICES, mode: 'replace' });
    expect(report?.before).toEqual(report?.after);
    expect(JSON.stringify(computeCase(s.getState().doc).headline)).toBe(figures);
    expect(s.getState().history.undo.length).toBe(steps + 1);
    expect(s.getState().history.undo.at(-1)?.label).toBe('Import process own.bpmn (replace)');
    s.undo();
    expect(serialize(tree(s))).toBe(before);
  });
  it('a refused file or an unmapped import writes nothing', async () => {
    const s = freshStore(), d = tree(s), steps = s.getState().history.undo.length;
    const bad = await readProcessFile(fileOf('x.bpmn', readFileSync('fixtures/bpmn/hostile/billion-laughs.bpmn', 'utf8')));
    expect(bad.ok).toBe(false);
    const zeebe = await readProcessFile(fileOf('z.bpmn', readFileSync('fixtures/bpmn/foreign-camunda8-zeebe.bpmn', 'utf8')));
    if (!zeebe.ok) throw new Error(zeebe.errors.join());
    expect(importProcess(zeebe, DEFAULT_CHOICES)).toBeNull();
    expect(tree(s)).toBe(d);
    expect(s.getState().history.undo.length).toBe(steps);
  });
  it('reset (whole or a phase) is one step; undo gives the edited process back', () => {
    const s = freshStore();
    addProcessActivity(CUSTOM);
    const edited = serialize(tree(s));
    resetProcessTo('V2');
    expect(readProcess(tree(s)).activities.some((a) => a.id === 'X100')).toBe(false);
    s.undo();
    expect(serialize(tree(s))).toBe(edited);
    resetProcessTo();
    expect(readProcess(tree(s)).activities.some((a) => a.id === 'X100')).toBe(false);
    s.undo();
    expect(serialize(tree(s))).toBe(edited);
  });
});
