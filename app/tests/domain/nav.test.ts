import { describe, expect, it } from 'vitest';
import { groupBar, firstOfGroup } from '@/domain/nav/groupBar';
import { landingSection, navGroups, resolveSections } from '@/domain/nav/layout';
import { placeForPersona, placeSection, shiftGroup, shiftSection, shiftToGroup } from '@/domain/nav/moves';
import { activeSeq, flatten, generateSeq, membershipDiff, respaceOrders, syncOrderToSeq } from '@/domain/nav/sequence';
import type { Persona } from '@/domain/pdc/personas';
import { SECTIONS } from '@/ui/zones/registry';
import { legacyNav, legacyNavDyn, NAV_FIXTURES, navInputs } from '../helpers/nav';
import { caseOf } from '../helpers/pdc';

describe('navigation parity with the legacy sidebar (oracle)', () => {
  it('records the three navigation recipes besides the base fixtures', () => expect(NAV_FIXTURES).toEqual(expect.arrayContaining(['golden', 'nav-custom-group', 'nav-persona-order', 'nav-guided-seq'])));
  it.each(NAV_FIXTURES)('groups, sections, landing, group bar, hide-menu flag and guided walk equal the legacy for every persona (%s)', (id) => {
    const doc = caseOf(id), legacy = legacyNav(id), { sections, groups, lists, order } = navInputs(doc), personas = doc.PERSONAS as Persona[];
    expect(Object.keys(legacy.personas)).toEqual(personas.map((p) => p.id));
    expect(doc.SECTION_NAV_STYLE ?? 'buttons').toBe(legacy.style);
    for (const p of personas) {
      const want = legacy.personas[p.id]!;
      const got = navGroups(p.id, sections, groups, lists, order).map((g) => ({ group: g.group.id, sections: g.sections.map((s) => s.id) }));
      expect(got, `${p.id} sidebar`).toEqual(want.groups);
      expect(landingSection(p.id, sections, groups, lists, order), `${p.id} landing`).toBe(want.landing);
      for (const g of groups) expect(firstOfGroup(p.id, g.id, sections, lists), `${p.id} first of ${g.id}`).toBe(want.first[g.id]);
      if (want.locked) continue;   // the legacy keeps Advanced locked: no group bar / walk to compare
      expect(!!p.compactNav, `${p.id} hide menu`).toBe(want.compact);
      const bar = groupBar(p.id, want.landing, sections, groups, lists, order);
      expect(bar && { group: bar.selected, sections: bar.sections.map((s) => s.id), groups: bar.groups.map((g) => g.id) }, `${p.id} group bar`).toEqual(want.bar);
      const seq = activeSeq(p.seq);
      expect(seq ? flatten(seq).map((f) => [f.si, f.step, f.sec]) : null, `${p.id} walk`).toEqual(want.wiz);
    }
  });
});

describe('dynamic sections in the sidebar (oracle: a Board dashboard added to the legacy page)', () => {
  it.each(NAV_FIXTURES)('every persona sees it where the legacy shows it (%s)', (id) => {
    const doc = caseOf(id), { groups, lists, order } = navInputs(doc), legacy = legacyNavDyn(id);
    const sections = resolveSections(SECTIONS, doc.sectionGroups as never, [{ id: 'dyn-groups-1', title: 'Dashboard — Tune', archetype: 'GROUPS:tune', menuGroup: 'tune', order: 15 }]);
    const withIt = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, [...v, 'dyn-groups-1']]));
    for (const p of doc.PERSONAS as Persona[]) {
      const got = navGroups(p.id, sections, groups, withIt, order).map((g) => ({ group: g.group.id, sections: g.sections.map((s) => s.id) }));
      expect(got, `${id} / ${p.id}`).toEqual(legacy[p.id]);
    }
  });
});

describe('resolved catalogue', () => {
  const doc = caseOf('nav-guided-seq'), base = navInputs(doc), { groups, lists, order } = base;
  const sections = resolveSections(SECTIONS, doc.sectionGroups as never, [{ id: 'dyn-groups-1', title: 'Dashboard — Tune', archetype: 'GROUPS:tune', menuGroup: 'tune', order: 15 }]);
  it('adds the stored dynamic sections under their group, ordered by their own order', () => {
    const dyn = sections.find((s) => s.id === 'dyn-groups-1')!;
    expect(dyn).toMatchObject({ dynamic: true, group: 'tune', groupSeq: 15, label: 'Dashboard — Tune' });
    expect(navGroups('advanced', sections, groups, lists, order).find((g) => g.group.id === 'tune')!.sections.map((s) => s.id)).toContain('dyn-groups-1');
  });
  it('a persona whose list lacks the section does not see it; a section of a missing group is shown nowhere', () => {
    const withIt = { ...lists, admin: [...lists.admin!, 'dyn-groups-1'] };
    expect(navGroups('admin', sections, groups, withIt, order).flatMap((g) => g.sections.map((s) => s.id))).toContain('dyn-groups-1');
    expect(navGroups('admin', sections, groups, lists, order).flatMap((g) => g.sections.map((s) => s.id))).not.toContain('dyn-groups-1');
    const orphan = navGroups('advanced', sections, groups.filter((g) => g.id !== 'tune'), lists, order).flatMap((g) => g.sections.map((s) => s.id));
    expect(orphan).not.toContain('risk');
  });
  it('without any stored placement the static catalogue is the default', () => expect(resolveSections(sections.filter((s) => !s.dynamic), undefined, undefined)).toEqual(sections.filter((s) => !s.dynamic)));
});

describe('moves', () => {
  const { sections, groups } = navInputs(caseOf('golden')), ids = (g: string) => sections.filter((s) => s.group === g).sort((a, b) => a.groupSeq - b.groupSeq).map((s) => s.id);
  it('dropping a card renumbers the target group and the group it left (10, 20 …)', () => {
    const rows = placeSection(sections, 'risk', 'frame', 1), frame = rows.filter((r) => r.group === 'frame');
    expect(frame.map((r) => r.id)).toEqual([ids('frame')[0], 'risk', ...ids('frame').slice(1)]);
    expect(frame.map((r) => r.groupSeq)).toEqual(frame.map((_, i) => (i + 1) * 10));
    expect(rows.filter((r) => r.group === 'tune').map((r) => r.id)).toEqual(ids('tune').filter((x) => x !== 'risk'));
  });
  it('arrows stay inside the group, and the group arrows stop at both ends', () => {
    expect(shiftSection(sections, ids('frame')[0]!, -1)).toEqual([]);
    expect(shiftSection(sections, ids('frame')[0]!, 1).map((r) => r.id).slice(0, 2)).toEqual([ids('frame')[1], ids('frame')[0]]);
    expect(shiftToGroup(sections, groups, 'home', -1)).toEqual([]);
    expect(shiftToGroup(sections, groups, 'home', 1).find((r) => r.id === 'home')!.group).toBe('baseline');
  });
  it('a persona order is a sparse 10, 20 … renumbering of the group; groups swap their orders', () => {
    expect(placeForPersona(sections, 'builder', {}, ids('frame')[2]!, 0)[ids('frame')[2]!]).toBe(10);
    expect(shiftGroup(groups, 'frame', 1)).toEqual({ frame: 20, baseline: 10 });
    expect(shiftGroup(groups.map((g) => ({ ...g, order: 1 })), 'frame', 1)).not.toEqual({});
  });
});

describe('sequence helpers', () => {
  const doc = caseOf('golden'), { sections, groups, lists, order } = navInputs(doc), seq = (doc.PERSONAS as Persona[]).find((p) => p.id === 'builder')!.seq!;
  it('generates one step per reachable group without Welcome', () => {
    const g = generateSeq('clientcase', sections, groups, lists, order)!;
    expect(g.on).toBe(true);
    expect(g.steps.flatMap((s) => s.sections)).not.toContain('home');
    const rank = g.steps.map((s) => groups.find((x) => x.label === s.label)!.order);
    expect(rank).toEqual([...rank].sort((a, b) => a - b));
  });
  it('syncs the persona order to the sequence and the menu to its sections', () => {
    const r = syncOrderToSeq('builder', seq, sections, order);
    expect(r.entries['engagement-context']).toBe(1);
    const d = membershipDiff(seq, ['home', 'zzz'], sections);
    expect(d.toRemove).toContain('zzz');
    expect(d.finalList[0]).toBe('home');
  });
  it('respace numbers the assigned sections in menu order', () => {
    const assigned = sections.filter((s) => (lists.builder ?? []).includes(s.id));
    const r = respaceOrders('builder', assigned, groups, order);
    expect(Object.keys(r)).toHaveLength(assigned.length);
    expect(Math.max(...Object.values(r))).toBe(assigned.length * 10);
  });
});
