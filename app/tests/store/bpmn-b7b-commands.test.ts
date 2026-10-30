import { describe, expect, it } from 'vitest';
import { companionFiles, hasDecisions } from '@/controllers/decisionFiles';
import { bindProcessDecision, importDecisionsFile, importRunCaseFile } from '@/controllers/decisions';
import { addProcessActivity } from '@/controllers/process';
import { computeCase } from '@/domain';
import { cmmnDocument, readCmmn } from '@/domain/cmmn';
import { decisionsOf, dmnFile, FAMILY_IDS, ruleFamilies, writeDmn } from '@/domain/dmn';
import { readProcess, serialize } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { freshStore } from './helpers';

/**
 * Phase B7b commands on the store (docs/SPEC_BPMN.md F-B62, F-B63): the `.dmn` export (the case's rule families when its process holds no
 * decision), its import back as one undoable step (refused before anything is written when it is not DMN, has a cycle or reuses a process id),
 * binding a business-rule task, and the `.cmmn` read-back.
 */
const tree = (s: AppStore) => s.getState().doc.BPMN;
const fileOf = (name: string, text: string) => ({ name, size: text.length, text: async () => text });
const headline = (s: AppStore): string => JSON.stringify(computeCase(s.getState().doc).headline);

describe('phase B7b commands', { timeout: 30_000 }, () => {
  it('the default case exports its rule families as .dmn; importing them back is one step, figures unchanged until a task is bound', async () => {
    const s = freshStore(), before = serialize(tree(s)), figures = headline(s);
    expect(hasDecisions()).toBe(false);
    const [dmn, cmmn] = companionFiles('AgentCase_process_x.bpmn', { dmn: true, cmmn: true });
    expect([dmn?.filename, cmmn?.filename]).toEqual(['AgentCase_process_x.dmn', 'AgentCase_process_x_run.cmmn']);
    const steps = s.getState().history.undo.length, r = await importDecisionsFile(fileOf('rules.dmn', dmn?.text ?? ''));
    expect(r).toMatchObject({ ok: true, warnings: [] });
    expect(s.getState().history.undo.length).toBe(steps + 1);
    expect(s.getState().history.undo.at(-1)?.label).toBe('Import decisions rules.dmn');
    expect(decisionsOf(tree(s).root)?.model.decisions.map((d) => d.id)).toEqual(Object.values(FAMILY_IDS));
    expect(hasDecisions()).toBe(true);
    expect(companionFiles('a.bpmn', { dmn: true, cmmn: false })[0]?.text).toBe(dmn?.text);
    expect(headline(s)).toBe(figures);
    addProcessActivity({ id: 'C010', name: 'Authority rule', phase: 'V3', value: 'NVA', skill: 'Dev', aiAuth: 'Copilot', humanSup: 50, agentSup: 50,
      effort: 1, deliverable: '', agentActivityType: 'BusinessRule' });
    const withTask = headline(s);
    bindProcessDecision('C010', FAMILY_IDS.supervision);
    expect(s.getState().history.undo.at(-1)?.label).toBe(`Bind C010 to decision ${FAMILY_IDS.supervision}`);
    expect(headline(s)).not.toBe(withTask);
    s.undo(); s.undo(); s.undo();
    expect(serialize(tree(s))).toBe(before);
  });
  it('a refused file writes nothing: not DMN, a requirement cycle, an id the process already uses', async () => {
    const s = freshStore(), steps = s.getState().history.undo.length;
    const fam = ruleFamilies([]);
    const cyc = { ...fam, decisions: fam.decisions.map((d) => (d.id === FAMILY_IDS.authority ? { ...d, requiredDecisions: [FAMILY_IDS.gate] } : d)) };
    const clash = { ...fam, inputs: [{ id: 'A017', name: 'activity' }], decisions: [] };
    const text = (m: typeof fam) => serialize(dmnFile(writeDmn(m)));
    const out = await Promise.all([fileOf('x.dmn', '<a/>'), fileOf('c.dmn', text(cyc)), fileOf('i.dmn', text(clash))]
      .map((f) => importDecisionsFile(f)));
    expect(out.map((o) => (o.ok ? 'ok' : o.errors[0]))).toEqual(['the root element is not a DMN 1.3 dmn:definitions',
      `${FAMILY_IDS.authority}: its requirements form a cycle`, 'id "A017" is already used by the process']);
    expect(s.getState().history.undo.length).toBe(steps);
  });
  it('a .cmmn file read back renames an activity of the run phase (one step); an unchanged one writes nothing', async () => {
    const s = freshStore(), text = serialize(cmmnDocument(tree(s), 'x')), id = readProcess(tree(s)).activities.find((a) => a.phase === 'L9')?.id ?? '';
    const steps = s.getState().history.undo.length;
    expect(await importRunCaseFile(fileOf('run.cmmn', text))).toMatchObject({ ok: true, warnings: [] });
    expect(s.getState().history.undo.length).toBe(steps);
    const r = await importRunCaseFile(fileOf('run.cmmn', text.replace(new RegExp(`(id="${id}" name=")[^"]*"`), '$1Renamed"')));
    const notRead = Object.values(readCmmn(cmmnDocument(tree(s), 'x').root).ignored).reduce((a, n) => a + n, 0);
    expect(r.ok && r.message).toBe(`Run case run.cmmn: 1 element(s) updated, 0 unknown, ${notRead} not read (Ctrl+Z undoes)`);
    expect(readProcess(tree(s)).activities.find((a) => a.id === id)?.name).toBe('Renamed');
    expect(s.getState().history.undo.length).toBe(steps + 1);
  });
});
