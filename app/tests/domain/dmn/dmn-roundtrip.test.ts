import { describe, expect, it } from 'vitest';
import { bindDecision, decisionsEl, decisionsOf, dmnFile, idClashes, readDmn, ruleFamilies, withDecisions, writeDmn, type DmnModel } from '@/domain/dmn';
import { readProcess, serialize, type XDocument } from '@/domain/process';
import { collaborationText, exportCaseText } from '@/domain/process';
import { caseViews } from '@/domain/process/engineInputs';
import { parseXml } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';
import { adding, custom, opened, withDoc } from '../../helpers/processCases';

/**
 * Phase B7b, F-B62 / D-B24: the DMN reader and writer round trip (write → parse → write byte-identical, read(write(m)) = m), the place of the
 * decisions in the case's single BPMN document (D-B1 / D-B26: the main process's extension elements) and the XSD validity of the `.dmn` file and of
 * a BPMN export embedding decisions (OMG DMN13.xsd imported by the validation schema).
 */
const golden = opened('golden');
const families = (): DmnModel => ruleFamilies(caseViews(golden)?.sdlc ?? []);
const full: DmnModel = { id: 'dmn_all', name: 'Every feature', namespace: 'https://example.org/dmn',
  inputs: [{ id: 'in_score', name: 'score', typeRef: 'number' }],
  decisions: [
    { id: 'd_band', name: 'band', question: 'Which band?', requiredDecisions: [], requiredInputs: ['in_score'],
      table: { id: 'd_band_t', hitPolicy: 'COLLECT', aggregation: 'SUM', outputLabel: 'Points', annotations: ['Why'],
        inputs: [{ id: 'd_band_i', label: 'Score', expression: 'score', typeRef: 'number', values: '[0..100]' }],
        outputs: [{ id: 'd_band_o', name: 'points', typeRef: 'number', defaultValue: '0' }],
        rules: [{ id: 'd_band_r1', inputs: ['>= 50'], outputs: ['10'], annotations: ['pass'] }, { inputs: ['-'], outputs: ['1'], annotations: [''] }] } },
    { id: 'd_label', name: 'label', requiredDecisions: ['d_band'], requiredInputs: [], literal: 'band * 2' },
  ] };
const text = (m: DmnModel): string => serialize(dmnFile(writeDmn(m)));
const reparse = (t: string): XDocument => { const r = parseXml(t); if (!r.doc) throw new Error(r.errors[0]?.message); return r.doc; };

describe('DMN round trip (F-B62)', () => {
  it.each([['the three rule families of the golden case', families], ['every feature of the reader', () => full]])('%s: write → parse → write', (_, m) => {
    const t = text(m()), back = reparse(t);
    expect(serialize(back)).toBe(t);
    expect(readDmn(back.root).model).toEqual(m());
    expect(text(readDmn(back.root).model)).toBe(t);
  });
  it('the reader reports what it does not evaluate, and leaves it in the tree', () => {
    const t = text(full).replace('<dmn:literalExpression>', '<dmn:context><dmn:contextEntry><dmn:literalExpression>')
      .replace('</dmn:literalExpression>', '</dmn:literalExpression></dmn:contextEntry></dmn:context>');
    const back = reparse(t);
    expect(readDmn(back.root).issues).toEqual([{ at: 'd_label', message: 'a context is not evaluated (kept in the file)' }]);
    expect(serialize(back)).toBe(t);
  });
});

describe('the decisions inside the case document (D-B1, D-B26)', () => {
  const base = adding(golden.BPMN, custom('C010', { name: 'Authority rule', agentActivityType: 'BusinessRule' }));
  const withRules = bindDecision(withDecisions(base, writeDmn(families())), 'C010', 'dec_ai_authority');
  it('the default process holds none; the decisions sit in the main process extension elements and come back typed', () => {
    expect(decisionsEl(golden.BPMN.root)).toBeUndefined();
    expect(decisionsOf(withRules.root)?.model).toEqual(families());
    expect(serialize(withRules)).toContain('<bpmn:businessRuleTask id="C010" name="Authority rule" ac:inScope="true" ac:decisionRef="dec_ai_authority">');
    expect(readProcess(withRules).activities.length).toBe(readProcess(base).activities.length);
  });
  it('replacing and removing them restores the document exactly; binding refuses a task that is not a rule task', () => {
    expect(serialize(withDecisions(withRules, writeDmn(full)))).toBe(serialize(withDecisions(bindDecision(withDecisions(base, writeDmn(full)), 'C010',
      'dec_ai_authority'), writeDmn(full))));
    expect(serialize(withDecisions(withDecisions(base, writeDmn(full)), null))).toBe(serialize(base));
    expect(bindDecision(base, 'A001', 'dec_ai_authority')).toBe(base);
  });
  it('the `.dmn` file of the embedded decisions is the standalone file; ids already used by the process clash', () => {
    expect(serialize(dmnFile(decisionsEl(withRules.root) as NonNullable<ReturnType<typeof decisionsEl>>))).toBe(text(families()));
    expect(idClashes(withRules.root, writeDmn({ ...full, decisions: [{ ...full.decisions[1] as DmnModel['decisions'][number], id: 'A001' }] })))
      .toEqual(['A001']);
    expect(idClashes(withRules.root, writeDmn(families()))).toEqual([]);
  });
  it('an export keeps them byte for byte through parse → write', () => {
    const t = exportCaseText(withDoc(golden, withRules));
    expect(serialize(reparse(t))).toBe(t);
    expect(decisionsOf(reparse(t).root)?.model).toEqual(families());
  });
  describe.skipIf(!schemaTestsRun())('XSD (xmllint: OMG DMN 1.3, BPMN 2.0.2, ac:)', () => {
    const ok = { schema: 'valid', errors: [], warnings: [] };
    it('the `.dmn` files validate against DMN13.xsd', () => {
      expect(validateText(text(families()), 'rules.dmn')).toMatchObject(ok);
      expect(validateText(text(full), 'all.dmn')).toMatchObject(ok);
    });
    it('a BPMN export embedding decisions validates (the embedded DMN strictly), and so does a portfolio file (ids prefixed)', () => {
      const c = withDoc(golden, withRules);
      expect(validateText(exportCaseText(c))).toMatchObject(ok);
      const collab = collaborationText([{ code: 'P1', name: 'One', case: c }, { code: 'P2', name: 'Two', case: c }]);
      expect(collab).toContain('ac:decisionRef="P2_dec_ai_authority"');
      expect(collab).toContain('href="#P2_dec_ai_authority"');
      expect(validateText(collab)).toMatchObject(ok);
    });
    it('a wrong hit policy is refused by the schema', () => {
      expect(validateText(text(full).replace('hitPolicy="COLLECT"', 'hitPolicy="SOME"'), 'bad.dmn')?.schema).toBe('invalid');
    });
  });
});
