import { beforeEach, describe, expect, it } from 'vitest';
import { addProcessActor } from '@/controllers/process';
import { readProcess, serialize } from '@/domain/process';
import { appStore } from '@/store/instance';
import { freshStore } from './helpers';

/**
 * SPEC_FIXES FX-06: a new role's resource is appended at the end of the definitions' root elements (the last place the BPMN schema allows, just
 * before the diagrams), so the undo step patches a handful of nodes, not every root element after the resources.
 */
beforeEach(() => freshStore());
const doc = () => appStore().getState().doc.BPMN;

describe('adding a role (FX-06)', () => {
  it('one small undo patch; the role reads back; undo restores the exact document', () => {
    const before = serialize(doc());
    addProcessActor({ id: 'role-qa-lead', name: 'QA lead', kind: 'role', teamSkill: 'QA' });
    const e = appStore().getState().history.undo.at(-1)!;
    expect(e.type).toBe('process.addActor');
    // only the diagram (which the schema keeps after every root element) and the white space around it move: 1.35 MB before FX-06, about 0.29 MB
    const moved = (e.patches as { value?: { local?: string } }[]).map((x) => x.value?.local).filter(Boolean);
    expect(moved.sort()).toEqual(['BPMNDiagram', 'resource']);   // no process, no collaboration copied into the step
    expect(JSON.stringify(e.patches).length).toBeLessThan(400_000);
    expect(readProcess(doc()).actors.some((a) => a.id === 'role-qa-lead')).toBe(true);
    const defs = doc().root.children.filter((c) => c.kind === 'element').map((c) => (c as { local: string }).local);
    expect(defs.lastIndexOf('resource')).toBeLessThan(defs.indexOf('BPMNDiagram'));   // still before the diagrams (schema order)
    appStore().undo();
    expect(serialize(doc())).toBe(before);
  });
});
