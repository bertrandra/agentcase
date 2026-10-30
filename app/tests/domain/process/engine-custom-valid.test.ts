import { describe, expect, it } from 'vitest';
import { exportDocument, readProcess, serialize, viewsOf } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';
import { adding, custom, opened, withAgent, withBoundary, withRole } from '../../helpers/processCases';

/**
 * Phase B5: a process with custom activities, a custom role and agent and error boundary events carrying `ac:rework` (F-B47, D-B20) exports as
 * a valid document (OMG XSDs + `ac:` XSD + profile), and reads back with the same rework loops.
 */
const golden = opened('golden');
const doc = () => withBoundary(withBoundary(adding(withAgent(withRole(golden.BPMN, 'Prompt engineering', 'Arch/Design'), 'Translation'),
  custom('C001', { skill: 'Prompt engineering', deliverable: 'Prompt library' }), custom('C002', { agentActivityType: 'Agent', capability: 'Translation' })),
{ id: 'BE1', container: 'Process', on: 'V4', to: 'V3', p: 0.2, share: 0.5, pair: 'LP001' }),
{ id: 'BE2', container: 'V3', on: 'C001', to: 'C002', p: 0.1, share: 0.2 });

describe('custom process content in a BPMN file', () => {
  it('reads back through the BPMN reader with the same loops and activities', () => {
    const d = doc(), back = parseBpmn(serialize(d));
    expect(back.errors).toEqual([]);
    expect(viewsOf(back.doc!).loopPairs).toStrictEqual(viewsOf(d).loopPairs);
    expect(viewsOf(d).loopPairs.map((l) => l.id)).toEqual(['LP001', 'LP002', 'LP003', 'BE2']);
    expect(readProcess(back.doc!).activities.filter((a) => a.id.startsWith('C00')).map((a) => a.deliverable)).toEqual(['Prompt library', undefined]);
  });
  it.runIf(schemaTestsRun())('the export validates (OMG XSDs + ac: + profile)', () => {
    const r = validateText(serialize(exportDocument({ ...golden, BPMN: doc() }, {})), 'custom.bpmn');
    expect(r).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
  }, 60_000);
});
