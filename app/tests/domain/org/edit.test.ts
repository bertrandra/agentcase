import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { addUnit, clearRaci, defaultUnitInput, orgOf, organisationView, readRaci, readStoredOrg, removeUnit, setRaci, updateUnit } from '@/domain/org';
import { catalogueProcess, readProcess, serialize } from '@/domain/process';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validate } from '../../helpers/bpmnValidate';
import { goldenAndB } from '../../helpers/portfolio';

/** Phase B6b (docs/SPEC_BPMN.md § 16.3, § 16.4): units and RACI are written in the case's BPMN document, read back, and stay valid BPMN. */
const base = catalogueProcess(), DEF = defaultUnitInput('Acme');
const VENDOR = { id: 'unit-1', name: 'Nearshore vendor', type: 'vendor' as const, parent: 'unit-delivery', location: 'Portugal', sourcing: 'vendor' as const };
const raciOf = (d: typeof base, id: string) => readRaci(d).find((a) => a.id === id)!;
const sameTree = (d: typeof base) => { const r = parseBpmn(serialize(d)); expect(r.errors).toEqual([]); expect(r.doc).toStrictEqual(d); };

describe('units (ac:orgUnit in the collaboration)', () => {
  it('a unit under the default unit writes the default unit first; both read back; the text reads back as the same tree', () => {
    const d = addUnit(base, VENDOR, DEF), units = readStoredOrg(d).units;
    expect(units.map((u) => [u.id, u.parent])).toEqual([['unit-delivery', undefined], ['unit-1', 'unit-delivery']]);
    expect(units[0]!.name).toBe('Acme delivery');
    sameTree(d);
    expect(orgOf(goldenAndB(), d).units.filter((u) => u.id === 'unit-delivery')).toHaveLength(1);
  });
  it('refusals: blank name, used id, unknown parent, cycle; removal refused while units sit below', () => {
    const d = addUnit(base, VENDOR, DEF);
    expect(addUnit(d, { ...VENDOR, name: ' ' })).toBe(d);
    expect(addUnit(d, { ...VENDOR, id: 'A017' })).toBe(d);
    expect(addUnit(d, { ...VENDOR, id: 'unit-2', parent: 'nope' })).toBe(d);
    expect(updateUnit(d, 'unit-delivery', { parent: 'unit-1' })).toBe(d);
    expect(removeUnit(d, 'unit-delivery')).toBe(d);
    expect(updateUnit(d, 'unit-1', { name: '' })).toBe(d);
  });
  it('update and remove; removing every unit gives back the original document exactly', () => {
    const d = updateUnit(addUnit(base, VENDOR, DEF), 'unit-1', { name: 'Vendor B', costCentre: 'CC-1' });
    expect(readStoredOrg(d).units[1]).toMatchObject({ name: 'Vendor B', costCentre: 'CC-1', location: 'Portugal' });
    expect(serialize(removeUnit(removeUnit(d, 'unit-1'), 'unit-delivery'))).toBe(serialize(base));
  });
  it('editing the derived default unit writes it into the document', () => {
    const d = updateUnit(base, 'unit-delivery', { name: 'Delivery centre' }, DEF);
    expect(readStoredOrg(d).units).toEqual([{ id: 'unit-delivery', name: 'Delivery centre', type: 'department', sourcing: 'internal' }]);
  });
});

describe('RACI (resource roles + ac:raci)', () => {
  it('default: the legacy skill is R and A to confirm; the agent is the performer', () => {
    const a = raciOf(base, 'A017');
    expect(a).toMatchObject({ source: 'default', agent: 'agent-coding', primary: 'role-dev', accountableToConfirm: true,
      raci: { R: ['role-dev'], A: 'role-dev' } });
  });
  it('set: the humanPerformer stays first R, the rest are resource roles, the figures read the same activity', () => {
    const d = setRaci(base, 'A017', { R: ['role-arch'], A: 'role-lead', C: ['role-qa', 'role-qa'], I: ['role-po'] });
    expect(raciOf(d, 'A017')).toMatchObject({ source: 'explicit', accountableToConfirm: false, raci: { R: ['role-dev', 'role-arch'], A: 'role-lead',
      C: ['role-qa'], I: ['role-po'] } });
    expect(readProcess(d).activities.find((a) => a.id === 'A017')).toStrictEqual(readProcess(base).activities.find((a) => a.id === 'A017'));
    sameTree(d);
    expect(serialize(clearRaci(d, 'A017'))).toBe(serialize(base));
  });
  it('refused: unknown activity or role', () => {
    expect(setRaci(base, 'nope', { R: [], C: [], I: [] })).toBe(base);
    expect(setRaci(base, 'A017', { R: ['role-ghost'], C: [], I: [] })).toBe(base);
  });
  it('the standard resource roles alone are read (a tool that dropped ac:raci)', () => {
    const d = setRaci(base, 'A017', { R: [], A: 'role-lead', C: [], I: [] });
    const text = serialize(d).replace(/\s*<ac:raci [^>]*\/>/, ''), r = parseBpmn(text);
    expect(raciOf(r.doc!, 'A017').raci).toEqual({ R: ['role-dev'], A: 'role-lead', C: [], I: [] });
  });
});

describe.skipIf(!schemaTestsRun())('valid BPMN 2.0.2 + ac: (xmllint): units, RACI, organisation view', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b6b-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it('a document with units and RACI, and its organisation view', () => {
    const d = setRaci(addUnit(base, VENDOR, DEF), 'A017', { R: ['role-arch'], A: 'role-lead', C: ['role-qa'], I: ['role-po'] });
    const pf = goldenAndB(), view = organisationView(d, orgOf(pf, d), 'p1');
    expect(serialize(view)).toContain('<bpmn:childLaneSet');
    const files = [['org.bpmn', d], ['org-view.bpmn', view]] as const;
    for (const [n, x] of files) writeFileSync(join(dir, n), serialize(x));
    expect(validate(files.map(([n]) => join(dir, n))).results.map((r) => [r.schema, r.errors])).toEqual([['valid', []], ['valid', []]]);
  }, 60000);
});
