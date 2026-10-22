import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildOrder } from '@/domain/refshare/depTree';
import { catalogueOrder, incomingCount, liveEdges, participating, pruneDeps, sourceIds, tagMismatch, type DepEdges, type DepGroup, type DepSection } from '@/domain/refshare/deps';
import { fromSnapshot } from '@/store/persistence/snapshot';
// the legacy page knows the 79 case sections and 14 groups; the Portfolio group (multi-product) is not part of its catalogue
import { LEGACY_GROUPS as GROUPS, LEGACY_SECTIONS as SECTIONS } from '@/ui/zones/registry';

const IDS = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
const extra = (name: string, id: string) => JSON.parse(readFileSync(`fixtures/extras/${name}/${id}.json`, 'utf8'));
const sections = SECTIONS as DepSection[], groups = GROUPS as DepGroup[];
const depsOf = (id: string) => fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))).SECTION_DEPS as DepEdges;

describe('section dependency maths reproduces the legacy page', () => {
  it.each(IDS)('%s: the section catalogue is the legacy one', (id) => {
    const leg = extra('catalogue', id) as { sections: [string, string, number, string][]; groups: [string, number][] };
    expect(sections.map((s) => [s.id, s.group, s.groupSeq, s.tag ?? ''])).toEqual(leg.sections);
    expect(groups.map((g) => [g.id, g.order]).sort()).toEqual(leg.groups.sort());
  });
  it.each(IDS)('%s: edge count, sources, participation, incoming counts, tag mismatches', (id) => {
    const deps = depsOf(id), leg = extra('depsStats', id);
    expect(liveEdges(deps, sections)).toHaveLength(leg.edges);
    expect(sourceIds(deps, sections, groups)).toEqual(leg.sources);
    expect([...participating(deps, sections)].sort()).toEqual(leg.participating);
    expect(sections.map((s) => [s.id, incomingCount(deps, s.id)])).toEqual(leg.incoming);
    expect(sections.filter((s) => tagMismatch(deps, s)).map((s) => s.id)).toEqual(leg.mismatch);
  });
  it.each(IDS)('%s: the build-order proposal (layers, depth, new sequence, feedback links)', (id) => {
    const deps = depsOf(id), leg = extra('depTree', id), t = buildOrder(deps, sections, groups);
    expect(t.gOrder).toEqual(leg.gOrder);
    expect(t.gLayer).toEqual(leg.gLayer);
    expect(t.newGroupOrder).toEqual(leg.newGroupOrder);
    expect(t.depth).toEqual(leg.depth);
    expect(t.newSeq).toEqual(leg.newSeq);
    expect(t.gBroken.map((e) => e.join('>'))).toEqual(leg.gBroken);
    expect(t.gEdges.map((e) => e.join('>'))).toEqual(leg.gEdges);
  });
});

describe('dependency helpers', () => {
  it('catalogue order follows group order then position', () => {
    const o = catalogueOrder(sections, groups);
    expect(o[0]?.group).toBe('frame');
    expect(o.at(-1)?.group).not.toBe('frame');
  });
  it('prune drops edges to deleted sections and sources that are gone', () => {
    const r = pruneDeps({ params: { financial: 'S', ghost: 'I' }, nope: { params: 'S' } }, { nope: 'x', params: 'y' }, sections);
    expect(r.deps).toEqual({ params: { financial: 'S' } });
    expect(r.desc).toEqual({ params: 'y' });
    expect(r.dropped).toEqual(['params → ghost', 'nope (source)']);
  });
});
