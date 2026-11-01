import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyseImport, applyImport, DEFAULT_CHOICES, readProcess, serialize, type XDocument } from '@/domain/process';
import { annotationsOf, readCollab, readData, readEvents } from '@/domain/process/profile';
import { passText, passThroughOf } from '@/domain/process/importPass';
import { makeDefaultDoc } from '@/store/instance';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../../helpers/bpmnValidate';

/**
 * Phase B5b, F-B11 for foreign files (B4 listed what it did not map; § 9.1): the import keeps that content in the case's process — root
 * definitions, the events, gateways, flows and data of the units mapped to a phase (references following the renamed tasks), black-box pools and
 * their message flows, vendor extensions on the tasks — written with the case's prefixes, and reports what it kept and what it could not.
 */
const sample = (name: string): XDocument => parseBpmn(readFileSync(`fixtures/bpmn/${name}.bpmn`, 'utf8')).doc as XDocument;
const importAll = (name: string, phase = 'L9') => {
  const f = sample(name), base = makeDefaultDoc().BPMN, a = analyseImport(base, f);
  const c = { ...DEFAULT_CHOICES, phaseOf: Object.fromEntries(a.units.map((u) => [u.key, u.phase ?? phase])),
    teamSkillOf: Object.fromEntries(a.roles.map((r) => [r.name, 'Dev'])) };
  return { base, ...applyImport(base, f, c) };
};

describe('foreign content kept on import (F-B11)', () => {
  it('OMG plain: root definitions, events, gateways and flows join the phase; the call activity calls its global task; the counts are reported', () => {
    const r = importAll('foreign-omg-plain'), ev = readEvents(r.doc.root);
    expect(r.kept?.kept).toMatchObject({ itemDefinition: 1, message: 2, error: 1, dataStore: 1, exclusiveGateway: 1, inclusiveGateway: 2, boundaryEvent: 1,
      callActivity: 1, messageFlow: 1 });
    expect(ev.unresolved).toEqual([]);
    expect(ev.boundary).toHaveLength(1);
    expect(readData(r.doc.root).nodes.filter((n) => n.store)).toHaveLength(1);
    // FX-24: what crosses phases is kept in the pass-through container (as written), no longer dropped
    expect(r.kept?.passThrough).toEqual({ dataStoreReference: 1, textAnnotation: 1, association: 1 });
    const pass = passThroughOf(r.doc);
    expect(pass.map((p) => p.kind).sort()).toEqual(['association', 'dataStoreReference', 'textAnnotation']);
    expect(passText(pass.find((p) => p.kind === 'association')!.text)).toMatch(/^<bpmn:association id="_assoc1" sourceRef="_note1"/);
  });
  it('Camunda 7: the black-box pool and its message flow, the vendor extensions of the tasks under their own namespace', () => {
    const r = importAll('foreign-camunda7-bpmnio'), text = serialize(r.doc);
    expect(readCollab(r.doc.root).pools.map((p) => p.name)).toEqual(['Delivery process', 'Offshore vendor']);
    expect(readCollab(r.doc.root).flows).toHaveLength(1);
    expect(text).toContain('xmlns:camunda="http://camunda.org/schema/1.0/bpmn"');
    expect(text.match(/<camunda:/g)?.length).toBeGreaterThan(0);
  });
  it('Signavio (BPMN as the default namespace): kept elements are written with the case\'s bpmn: prefix', () => {
    const r = importAll('foreign-signavio'), text = serialize(r.doc);
    expect(r.kept?.kept).toMatchObject({ dataStore: 1, startEvent: 1, endEvent: 1 });
    expect(text).not.toMatch(/<(startEvent|sequenceFlow|dataStore) /);
    expect(text).toContain('xmlns:signavio=');
  });
  it('Camunda 8 replace: the content of the mapped sub-process is kept; what sits in an unmapped lane goes to the pass-through container', () => {
    const f = sample('foreign-camunda8-zeebe'), base = makeDefaultDoc().BPMN, map = { phaseOf: { 'sub:Activity_hypercare': 'L9' },
      teamSkillOf: { 'QA Engineers': 'Test/QA' } };
    const r = applyImport(base, f, { ...DEFAULT_CHOICES, ...map, mode: 'replace' });
    expect(r.kept).toEqual({ kept: { message: 1, startEvent: 2, endEvent: 2, sequenceFlow: 4 }, dropped: {},
      passThrough: { startEvent: 1, callActivity: 1, boundaryEvent: 1, endEvent: 2, intermediateCatchEvent: 1, sequenceFlow: 6 } });
    expect(readProcess(r.doc).activities.map((a) => a.id).sort()).toEqual(['A006', 'Activity_monitor']);
  });
  it('the figures read only what they read before: kept events and flows add no activity', () => {
    const r = importAll('foreign-camunda7-bpmnio');
    expect(readProcess(r.doc).activities).toHaveLength(readProcess(r.base).activities.length + (r.added?.length ?? 0));
    expect(annotationsOf(r.doc.root)).toEqual([]);
  });
  it.runIf(schemaTestsRun())('every imported document stays valid (OMG XSDs + ac: + profile)', () => {
    for (const n of ['foreign-omg-plain', 'foreign-camunda7-bpmnio', 'foreign-signavio']) {
      expect(validateText(serialize(importAll(n).doc), `${n}.bpmn`), n).toMatchObject({ schema: 'valid', errors: [], warnings: [] });
    }
  }, 60_000);
});
