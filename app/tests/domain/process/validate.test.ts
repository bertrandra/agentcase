import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { catalogueProcess, processFromCase, scopeKeysOf, serialize, withScope } from '@/domain/process';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { DEFAULT_PROCESS_FILE } from '../../../scripts/lib/defaultProcess';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';

/**
 * docs/SPEC_BPMN.md § 5.3: the default process and the case documents processFromCase writes are valid BPMN 2.0.2 + DI + ac: (OMG XSDs,
 * docs/bpmn/agentcase-bpmn-1.0.xsd, the profile check that every ac: name is declared, references resolved). Needs xmllint, like samples.test.ts.
 */
const report = (files: string[]) => validate(files).results.map((r) => ({ file: r.file.split('/').pop(), schema: r.schema, errors: r.errors,
  warnings: r.warnings }));

describe.skipIf(!schemaTestsRun())('BPMN B1 — generated documents validate (xmllint)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b1-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it('catalog/defaultProcess.bpmn: schema and profile, 0 errors, 0 warnings', () => {
    expect(report([DEFAULT_PROCESS_FILE])).toEqual([{ file: 'defaultProcess.bpmn', schema: 'valid', errors: [], warnings: [] }]);
  }, 60000);
  it('a case document carrying every case mark (positions, null ramp-up, partial edits, unmatched entries, absent keys)', () => {
    const c = {
      ...structuredClone(defaultDoc), selectedArtefacts: ['A017', 'A001', 'X1', 'A017'], selectedRegArtefacts: ['R002', 'R001'],
      phaseOff: ['V3', 'L0', 'Cross-cutting'],
      selectedNorms: ['MED:ISO 13485', 'ISO 26262', 'AERO:DO-178C'], artefactsEdited: [{ id: 'A002', effort: 4 }, { id: 'A001', seq: 3, humanSup: 50 }],
      regArtefactsEdited: [], phaseSeq: [{ id: 'V3', seq: 2 }, { id: 'L0', seq: null }], regInclude: false,
    } as Record<string, unknown>;
    delete c.skillMap;
    const file = join(dir, 'case-marks.bpmn');
    writeFileSync(file, serialize(processFromCase(c)));
    expect(report([file])).toEqual([{ file: 'case-marks.bpmn', schema: 'valid', errors: [], warnings: [] }]);
    const normal = join(dir, 'case-normal.bpmn');   // B3: the same keys in the normal form the migration writes (withScope)
    writeFileSync(normal, serialize(withScope(catalogueProcess(), scopeKeysOf(c))));
    expect(report([normal])).toEqual([{ file: 'case-normal.bpmn', schema: 'valid', errors: [], warnings: [] }]);
  }, 60000);
});
