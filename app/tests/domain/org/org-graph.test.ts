import { describe, expect, it } from 'vitest';
import { orgGraph } from '@/domain/org/graph';
import type { OrgModel } from '@/domain/org';

/** The organisation graph (owner's request 2026-11-02): units as a tree, teams as leaves, parents centred over their children, no overlap. */
const m = {
  units: [{ id: 'c', name: 'Company', type: 'company' }, { id: 'b1', name: 'BU 1', type: 'businessUnit', parent: 'c' },
    { id: 'b2', name: 'BU 2', type: 'businessUnit', parent: 'c' }, { id: 'x', name: 'Loop', type: 'other', parent: 'x' }],
  teams: [{ id: 't1', name: 'Team 1', unit: 'b1', lines: [{ etp: 3 }, { etp: 2 }], serves: [], shared: false },
    { id: 't2', name: 'Team 2', unit: 'b1', lines: [], serves: [], shared: false }],
} as unknown as Pick<OrgModel, 'units' | 'teams'>;

describe('orgGraph', () => {
  const g = orgGraph(m), at = (id: string) => g.nodes.find((n) => n.id === id)!;
  it('every unit and team once; an edge from each parent to each child', () => {
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['b1', 'b2', 'c', 'team:t1', 'team:t2', 'x']);
    expect(g.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['b1>team:t1', 'b1>team:t2', 'c>b1', 'c>b2']);
    expect(at('team:t1').sub).toBe('5 FTE');
  });
  it('depth goes down, a parent sits centred over its first and last child, nothing overlaps', () => {
    expect(at('c').y).toBeLessThan(at('b1').y);
    expect(at('b1').y).toBeLessThan(at('team:t1').y);
    expect(at('b1').x).toBe((at('team:t1').x + at('team:t2').x) / 2);
    const same = g.nodes.filter((n) => n.y === at('team:t1').y).map((n) => n.x).sort((a, b) => a - b);
    same.slice(1).forEach((x, i) => expect(x - same[i]!).toBeGreaterThanOrEqual(at('c').w));
    expect(at('x').depth).toBe(0);   // a unit that is its own parent is a root
  });
});
