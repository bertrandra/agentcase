/**
 * BPMN B2 — BPSim 2.0 (spec § 5.4, decision D-B5): written on export as a derived encoding (processing time = effort, probability of each rework
 * flow, quantity = team FTE of each role), read on import only where the `ac:` value is absent.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { attr, BPSIM_NS, exportDocument, kids, NS, readBpsim, readProcess, withAttrs, type XDocument, type XElement } from '@/domain/process';
import { mapElements } from '@/domain/process/defaultProcess';
import { bpsimParams, withBpsim } from '@/domain/process/exportCase';
import { REPO } from '../helpers/bpmnValidate';
import { rawFixture } from '../helpers/bpmnRoundTrip';

const golden = rawFixture('golden'), d = exportDocument(golden), view = readProcess(d), sim = readBpsim(d.root);
const rels = (x: XElement): XElement[] => kids(x, NS.bpmn, 'relationship');
/** The document with attributes changed on the `ac:<local>` element of the element `owner` (an undefined value removes the attribute). */
const patchAc = (x: XDocument, owner: string, local: string, patch: Record<string, string | undefined>): XDocument => ({ ...x, root:
  mapElements(x.root, (e) => (attr(e, 'id') === owner ? mapElements(e, (c) => (c.ns === NS.ac && c.local === local ? withAttrs(c, patch) : c)) : e)) });

describe('B2 BPSim: the namespace and placement of BPSim 2.0', () => {
  it('the namespace is the targetNamespace of the official schema (docs/bpmn/omg/BPSim-2.0.xsd)', () => {
    expect(BPSIM_NS).toBe('http://www.bpsim.org/schemas/2.0');
    expect(readFileSync(join(REPO, 'docs', 'bpmn', 'omg', 'BPSim-2.0.xsd'), 'utf8')).toContain(`targetNamespace="${BPSIM_NS}"`);
  });
  it('one bpmn:relationship type="BPSimData" with one scenario, source and target the process; xmlns:bpsim on the definitions', () => {
    const [rel] = rels(d.root);
    expect(rels(d.root).map((r) => [attr(r, 'id'), attr(r, 'type')])).toEqual([['BPSimData', 'BPSimData']]);
    expect([...kids(rel as XElement, NS.bpmn, 'source'), ...kids(rel as XElement, NS.bpmn, 'target')].map((e) => e.children)).toEqual(
      [[{ kind: 'text', text: 'Process' }], [{ kind: 'text', text: 'Process' }]]);
    expect(attr(d.root, 'xmlns:bpsim')).toBe(BPSIM_NS);
    const off = exportDocument(golden, { bpsim: false });
    expect([rels(off.root), attr(off.root, 'xmlns:bpsim')]).toEqual([[], undefined]);
  });
});

describe('B2 BPSim: the values are the ac: values (derived, never a second source)', () => {
  it('processing time = effort of every activity; probability of every rework flow; quantity = FTE of the role\'s team skill', () => {
    for (const a of view.activities) expect(sim.get(a.id), a.id).toEqual({ time: a.effort });
    const rework = view.flows.filter((f) => f.rework);
    expect(rework.length).toBeGreaterThan(0);
    for (const f of rework) expect(sim.get(f.id), f.id).toEqual({ probability: f.rework?.probability });
    const fte = new Map<string, number>();
    for (const r of golden.teamIn) fte.set(r.skill, (fte.get(r.skill) ?? 0) + r.etp);
    const roles = view.actors.filter((r) => r.kind === 'role' && fte.get(r.teamSkill ?? ''));
    expect(roles.length).toBeGreaterThan(0);
    for (const r of roles) expect(r.quantity, r.id).toBe(fte.get(r.teamSkill ?? ''));
  });
});

describe('B2 BPSim on import: read only where the ac: value is absent', () => {
  const a = view.activities[0] as { id: string; effort: number }, f = view.flows.find((x) => x.rework) as { id: string };
  it('an ac: value wins over a different BPSim value', () => {
    expect(readProcess(patchAc(d, a.id, 'activity', { effort: String(a.effort + 7) })).activities[0]?.effort).toBe(a.effort + 7);
  });
  it('without ac: effort / probability, the BPSim processing time / probability are read', () => {
    const v = readProcess(patchAc(patchAc(d, a.id, 'activity', { effort: undefined }), f.id, 'rework', { probability: undefined }));
    expect(v.activities.find((x) => x.id === a.id)?.effort).toBe(a.effort);
    expect(v.flows.find((x) => x.id === f.id)?.rework?.probability).toBe(sim.get(f.id)?.probability);
    expect(readProcess(patchAc(exportDocument(golden, { bpsim: false }), a.id, 'activity', { effort: undefined })).activities[0]?.effort).toBe(0);
  });
  it('a flow without ac:rework gets the BPSim probability as its branching probability', () => {
    const plain = mapElements(d.root, (e) => (attr(e, 'id') === f.id ? { ...e, children: [] } : e));
    expect(readProcess({ ...d, root: plain }).flows.find((x) => x.id === f.id)).toMatchObject({ probability: sim.get(f.id)?.probability });
    expect(readProcess({ ...d, root: plain }).flows.find((x) => x.id === f.id)?.rework).toBeUndefined();
  });
  it('a re-export replaces the AgentCase scenario and keeps any other BPSim data', () => {
    const own = rels(d.root)[0] as XElement, other = withAttrs(own, { id: 'Other' });
    const again = withBpsim({ ...d.root, children: [...d.root.children, other] }, bpsimParams(d, golden));
    expect(rels(again).map((r) => attr(r, 'id'))).toEqual(['Other', 'BPSimData']);
  });
});
