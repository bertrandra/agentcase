import { describe, expect, it } from 'vitest';
import { navGroups, type NavSection } from '@/domain/nav/layout';
import { previewMenu } from '@/domain/nav/preview';
import { placeForPersona, placeSection } from '@/domain/nav/moves';

const groups = [{ id: 'a', label: 'A', order: 1, description: '' }, { id: 'b', label: 'B', order: 2, description: '' }];
const sec = (id: string, group: string, groupSeq: number): NavSection => ({ id, label: id.toUpperCase(), description: '', group, groupSeq });
const sections = [sec('x', 'a', 10), sec('y', 'a', 20), sec('z', 'b', 10)];
const lists = { p: ['x', 'y', 'z'] };
const ids = (m: ReturnType<typeof previewMenu>) => m.nav.map((g) => [g.group.id, g.sections.map((s) => s.id)]);

describe('previewMenu', () => {
  it('without a pending drop it is the persona sidebar', () => {
    const m = previewMenu('p', sections, groups, lists, {}, null, 'global');
    expect(m.nav).toEqual(navGroups('p', sections, groups, lists, {}));
    expect(m.moved).toBeNull();
  });
  it('a pending global drop moves the card across groups, equal to the committed placement, without touching the inputs', () => {
    const frozen = JSON.stringify(sections);
    const m = previewMenu('p', sections, groups, lists, {}, { id: 'x', group: 'b', index: 0 }, 'global');
    expect(ids(m)).toEqual([['a', ['y']], ['b', ['x', 'z']]]);
    expect(m.moved).toBe('x');
    const done = new Map(placeSection(sections, 'x', 'b', 0).map((p) => [p.id, p]));
    expect(m.nav[1]!.sections.map((s) => s.groupSeq)).toEqual(['x', 'z'].map((i) => done.get(i)!.groupSeq));
    expect(JSON.stringify(sections)).toBe(frozen);
  });
  it('a pending persona drop reorders for that persona only and leaves the order object alone', () => {
    const order = {};
    const m = previewMenu('p', sections, groups, lists, order, { id: 'y', group: 'a', index: 0 }, 'persona');
    expect(ids(m)).toEqual([['a', ['y', 'x']], ['b', ['z']]]);
    expect(order).toEqual({});
    expect(placeForPersona(sections, 'p', order, 'y', 0)).toEqual({ y: 10, x: 20 });
    expect(ids(previewMenu('q', sections, groups, { q: ['x', 'y'] }, order, { id: 'y', group: 'a', index: 0 }, 'persona'))[0]).toEqual(['a', ['y', 'x']]);
  });
  it('an unknown card is ignored; a card the persona cannot see does not appear', () => {
    expect(previewMenu('p', sections, groups, lists, {}, { id: 'nope', group: 'a', index: 0 }, 'global').moved).toBeNull();
    expect(ids(previewMenu('p', sections, groups, { p: ['y'] }, {}, { id: 'x', group: 'b', index: 0 }, 'global'))).toEqual([['a', ['y']]]);
  });
});
