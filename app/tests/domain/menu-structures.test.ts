import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSections, type NavSection } from '@/domain/nav/layout';
import { respaceGroupSeq } from '@/domain/nav/moves';
import { BUILTIN_STRUCTURES, findStructure, isBuiltinStructure, personasUsing, placeIn, snapshotStructure, STANDARD_STRUCTURE, structureList, structureOf, type MenuStructure } from '@/domain/nav/structures';
import { duplicateOf, type Persona } from '@/domain/pdc/personas';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import { GROUPS, SECTIONS } from '@/ui/zones/registry';

const BJ = BUILTIN_STRUCTURES[0]!;
const mine: MenuStructure = { id: 'lean', label: 'Lean', groups: [{ id: 'a', label: 'A', order: 1 }, { id: 'b', label: 'B', order: 2 }], colors: { a: '#112233' }, placement: { home: { group: 'a', groupSeq: 5 } } };

describe('menu structures: resolution', () => {
  it('a persona without the field navigates with the standard structure; an unknown structure resolves to nothing (standard)', () => {
    expect(structureOf(undefined)).toBe(STANDARD_STRUCTURE);
    expect(structureOf({ menuStructure: undefined })).toBe(STANDARD_STRUCTURE);
    expect(structureOf({ menuStructure: 'business-journey' })).toBe('business-journey');
    expect(findStructure('standard', [mine])).toBeNull();
    expect(findStructure('nope', [mine])).toBeNull();
    expect(findStructure('lean', [mine])).toBe(mine);
    expect(findStructure('business-journey', undefined)).toBe(BJ);
  });
  it('lists Standard, the built-ins (renamed by a stored copy) and the case’s own structures, once each', () => {
    expect(structureList(undefined)).toEqual([{ id: 'standard', label: 'Standard', builtin: true }, { id: 'business-journey', label: 'Business journey', builtin: true }]);
    const renamed = { ...BJ, label: 'Journey' };
    expect(structureList([renamed, mine]).map((s) => [s.id, s.label, s.builtin])).toEqual([['standard', 'Standard', true], ['business-journey', 'Journey', true], ['lean', 'Lean', false]]);
    expect(findStructure('business-journey', [renamed])!.label).toBe('Journey');
    expect([isBuiltinStructure('standard'), isBuiltinStructure('business-journey'), isBuiltinStructure('lean')]).toEqual([true, true, false]);
  });
  it('placeIn: placed sections take the structure’s group and order; others keep their group if the structure has it, else go to the last group', () => {
    const secs: NavSection[] = [{ id: 'home', label: 'H', description: '', group: 'frame', groupSeq: 20 }, { id: 'x', label: 'X', description: '', group: 'a', groupSeq: 7 }, { id: 'y', label: 'Y', description: '', group: 'zz', groupSeq: 3 }];
    expect(placeIn(secs, mine).map((s) => [s.id, s.group, s.groupSeq])).toEqual([['home', 'a', 5], ['x', 'a', 7], ['y', 'b', 3]]);
    expect(secs[0]!.group).toBe('frame');   // pure
  });
  it('snapshotStructure copies the groups, their colours and every section’s place (Duplicate)', () => {
    const secs = resolveSections(SECTIONS, undefined, undefined), st = snapshotStructure('copy', 'Copy', GROUPS, { frame: '#000000', ghost: '#ffffff' }, secs);
    expect(st.groups).toEqual(GROUPS);
    expect(st.groups[0]).not.toBe(GROUPS[0]);
    expect(st.colors).toEqual({ frame: '#000000' });
    expect(Object.keys(st.placement)).toHaveLength(SECTIONS.length);
    expect(placeIn(secs, st)).toEqual(secs);   // a copy of the standard structure lays the menu out exactly like the standard one
  });
  it('personasUsing counts the absent field as standard; duplicating a persona keeps its structure only when it has one', () => {
    const ps: Persona[] = [{ id: 'a', label: 'A', protected: false, order: 1 }, { id: 'b', label: 'B', protected: false, order: 2, menuStructure: 'lean' }];
    expect(personasUsing(ps, 'standard').map((p) => p.id)).toEqual(['a']);
    expect(personasUsing(ps, 'lean').map((p) => p.id)).toEqual(['b']);
    expect(duplicateOf(ps[1]!, ['a', 'b'], 2).menuStructure).toBe('lean');
    expect('menuStructure' in duplicateOf(ps[0]!, ['a', 'b'], 2)).toBe(false);
  });
  it('respaceGroupSeq renumbers 10, 20 … inside each group, keeping the order, and returns only changed rows', () => {
    const secs: NavSection[] = [{ id: 'p', label: '', description: '', group: 'g', groupSeq: 7 }, { id: 'q', label: '', description: '', group: 'g', groupSeq: 3 }, { id: 'r', label: '', description: '', group: 'h', groupSeq: 10 }];
    expect(respaceGroupSeq(secs)).toEqual([{ id: 'q', group: 'g', groupSeq: 10 }, { id: 'p', group: 'g', groupSeq: 20 }]);
  });
});

describe('menu structures: migration', () => {
  const raw = JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8')) as Record<string, unknown>;
  it('an older case file has no structure: it loads with every persona on the standard structure and saves back without new keys', () => {
    const doc = fromSnapshot(raw);
    expect('MENU_STRUCTURES' in doc).toBe(false);
    expect((doc.PERSONAS as Persona[]).every((p) => structureOf(p) === STANDARD_STRUCTURE && !('menuStructure' in p))).toBe(true);
    const saved = toSnapshot(doc, () => new Date(0));
    expect(Object.keys(saved).filter((k) => !(k in raw) && !['savedAt', '_schema', '_schemaVersion', 'calculationPackage'].includes(k))).toEqual([]);
    expect(saved.PERSONAS).toEqual(raw.PERSONAS);
    expect(saved.GROUPS).toEqual(raw.GROUPS);
    expect(saved.sectionGroups).toEqual(raw.sectionGroups);
  });
  it('a case with structures round-trips through the snapshot JSON', () => {
    const doc = { ...fromSnapshot(raw), MENU_STRUCTURES: [mine], PERSONAS: [...(raw.PERSONAS as Persona[]), { id: 'z', label: 'Z', protected: false, order: 9, menuStructure: 'lean' }] };
    const back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(doc))));
    expect(back.MENU_STRUCTURES).toEqual([mine]);
    expect((back.PERSONAS as Persona[]).find((p) => p.id === 'z')!.menuStructure).toBe('lean');
  });
});
