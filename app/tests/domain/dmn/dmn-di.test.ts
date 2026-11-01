import { describe, expect, it } from 'vitest';
import { dmnFile, readDmn, ruleFamilies, writeDmn } from '@/domain/dmn';
import { DMNDI_NS } from '@/domain/dmn/dmnDi';
import { kids, serialize } from '@/domain/process';
import { parseXml } from '@/store/persistence/bpmn/read';

/** SPEC_FIXES FX-26: the exported `.dmn` carries its diagram (DMNDI): a shape per decision and input data; the decisions read back the same. */
describe('DMN diagram interchange', () => {
  it('a shape per decision, the file reads back to the same model', () => {
    const dmn = writeDmn(ruleFamilies([])), text = serialize(dmnFile(dmn)), back = parseXml(text, text.length).doc!.root;
    const decisions = readDmn(dmn).model.decisions;
    expect(text).toContain(`xmlns:dmndi="${DMNDI_NS}"`);
    for (const d of decisions) expect(text).toContain(`dmnElementRef="${d.id}"`);
    expect(kids(back, DMNDI_NS, 'DMNDI')).toHaveLength(1);
    expect(readDmn(back).model).toEqual(readDmn(dmn).model);
    expect(readDmn(back).issues).toEqual(readDmn(dmn).issues);
  });
});

describe('decisions on the diagram (FX-26)', () => {
  it('a bound business-rule task is labelled with the decision it applies', async () => {
    const { addProcessActivity } = await import('@/controllers/process');
    const { bindProcessDecision, importDecisions } = await import('@/controllers/decisions');
    const { decisionLabels, FAMILY_IDS } = await import('@/domain/dmn');
    const { freshStore } = await import('../../store/helpers');
    const s = freshStore(), dmn = writeDmn(ruleFamilies([]));
    expect(importDecisions('rules.dmn', dmn)).toMatchObject({ ok: true });
    addProcessActivity({ id: 'C010', name: 'Authority rule', phase: 'V3', value: 'NVA', skill: 'Dev', aiAuth: 'Copilot', humanSup: 50, agentSup: 50,
      effort: 1, deliverable: '', agentActivityType: 'BusinessRule' });
    bindProcessDecision('C010', FAMILY_IDS.supervision);
    const name = readDmn(dmn).model.decisions.find((d) => d.id === FAMILY_IDS.supervision)!.name;
    expect(decisionLabels(s.getState().doc.BPMN.root).get('C010')).toBe(name);
  });
});
