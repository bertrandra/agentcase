import { describe, expect, it } from 'vitest';
import { addBuiltinPersona, deleteStructure, duplicateStructure, renameStructure, setPersonaMenuStructure } from '@/controllers/menuStructures';
import { placeSections, setGroupOrders } from '@/controllers/navLayout';
import { addGroup, deleteGroup, deletePersona, renameGroup, setGroupColor, setGroupDescription, setGroupOrder } from '@/controllers/pdcPersonas';
import { BUILTIN_STRUCTURES, type MenuStructure } from '@/domain/nav/structures';
import type { Persona } from '@/domain/pdc/personas';
import { freshStore, snap } from './helpers';

const BJ = 'business-journey';
const STANDARD_KEYS = ['GROUPS', 'GROUP_COLORS', 'sectionGroups', 'dynamicSections'] as const;
type S = ReturnType<typeof freshStore>;
const standard = (s: S) => JSON.stringify(STANDARD_KEYS.map((k) => s.getState().doc[k]));
const stored = (s: S) => (s.getState().doc.MENU_STRUCTURES ?? []) as MenuStructure[];
const bj = (s: S) => stored(s).find((x) => x.id === BJ)!;
const personas = (s: S) => s.getState().doc.PERSONAS as Persona[];

/** Each edit of another structure: changes only that structure, leaves the standard one byte-identical, undoes to the exact previous document, redoes. */
const EDITS: [string, () => void, (s: S) => unknown][] = [
  ['add a group', () => addGroup('Extra', BJ), (s) => bj(s).groups.at(-1)],
  ['rename a group', () => renameGroup('frame', 'Start', BJ), (s) => bj(s).groups.find((g) => g.id === 'frame')!.label],
  ['delete a group', () => deleteGroup('today', BJ), (s) => bj(s).groups.some((g) => g.id === 'today')],
  ['set a group order', () => setGroupOrder('frame', 99, BJ), (s) => bj(s).groups.find((g) => g.id === 'frame')!.order],
  ['describe a group', () => setGroupDescription('frame', 'Why?', BJ), (s) => bj(s).groups.find((g) => g.id === 'frame')!.description],
  ['colour a group', () => setGroupColor('frame', '#123456', BJ), (s) => bj(s).colors.frame],
  ['place sections', () => placeSections('Move Financial', [{ id: 'financial', group: 'frame', groupSeq: 5 }], BJ), (s) => bj(s).placement.financial],
  ['move a group', () => setGroupOrders('Move frame', { frame: 85 }, BJ), (s) => bj(s).groups.find((g) => g.id === 'frame')!.order],
];

describe('menu structure commands', () => {
  it.each(EDITS)('%s in the Business journey structure: the standard structure is untouched; undo / redo', (_n, run, read) => {
    const s = freshStore(), before = snap(s), std = standard(s), builtin = JSON.stringify(BUILTIN_STRUCTURES[0]);
    run();
    expect(standard(s)).toBe(std);
    expect(stored(s).map((x) => x.id)).toEqual([BJ]);   // the built-in is copied into the case on its first edit
    expect(read(s)).not.toEqual(read({ getState: () => ({ doc: { MENU_STRUCTURES: [BUILTIN_STRUCTURES[0]] } }) } as unknown as S));
    expect(JSON.stringify(BUILTIN_STRUCTURES[0])).toBe(builtin);   // never the shipped definition itself
    const after = snap(s);
    expect(s.undo()).toBe(true);
    expect(snap(s)).toBe(before);
    expect(s.redo()).toBe(true);
    expect(snap(s)).toBe(after);
  });
  it('a standard edit leaves every other structure alone and keeps its legacy payload (no structure key)', () => {
    const s = freshStore();
    renameGroup('frame', 'Framing');
    expect((s.getState().doc.GROUPS as { id: string; label: string }[]).find((g) => g.id === 'frame')!.label).toBe('Framing');
    expect(s.getState().doc.MENU_STRUCTURES).toBeUndefined();
    expect(s.getState().history.undo.at(-1)!.label).toBe('Rename the menu group frame to Framing');
  });
  it('duplicate creates a structure with a unique id, rename relabels it, delete removes it only when no persona uses it; built-ins are protected', () => {
    const s = freshStore(), src = BUILTIN_STRUCTURES[0]!;
    duplicateStructure('Lean', src); duplicateStructure('Lean', src);
    expect(stored(s).map((x) => [x.id, x.label])).toEqual([['lean', 'Lean'], ['lean-2', 'Lean']]);
    expect(stored(s)[0]!.placement).toEqual(src.placement);
    renameStructure('lean', 'Leaner');
    expect(stored(s)[0]!.label).toBe('Leaner');
    renameStructure('standard', 'Nope');
    expect(stored(s).some((x) => x.id === 'standard')).toBe(false);
    setPersonaMenuStructure('admin', 'lean');
    deleteStructure('lean');
    expect(stored(s).some((x) => x.id === 'lean')).toBe(true);   // in use by Admin
    setPersonaMenuStructure('admin', 'standard');
    expect('menuStructure' in personas(s).find((p) => p.id === 'admin')!).toBe(false);   // standard = the absent field
    deleteStructure('lean'); deleteStructure(BJ); deleteStructure('standard');
    expect(stored(s).map((x) => x.id)).toEqual(['lean-2']);
    expect(s.undo()).toBe(true);
    expect(stored(s).map((x) => x.id)).toEqual(['lean', 'lean-2']);
  });
  it('a persona cannot be pointed at an unknown structure', () => {
    const s = freshStore(), before = snap(s);
    setPersonaMenuStructure('admin', 'ghost');
    expect(snap(s)).toBe(before);
  });
  it('the built-in persona can be added back to a case that lacks it, once', () => {
    const s = freshStore();
    deletePersona(BJ);
    expect(personas(s).some((p) => p.id === BJ)).toBe(false);
    addBuiltinPersona(BJ, ['home', 'financial']); addBuiltinPersona(BJ, ['home']);
    expect(personas(s).filter((p) => p.id === BJ)).toHaveLength(1);
    expect(personas(s).find((p) => p.id === BJ)!.menuStructure).toBe(BJ);
    expect((s.getState().doc.PERSONA_SECTIONS as Record<string, string[]>)[BJ]).toEqual(['home', 'financial']);
  });
});
