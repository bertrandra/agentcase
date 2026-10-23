/** @calc-zone workspace-config */
import { groupsByOrder, type MenuGroup, type Persona } from '../pdc/personas';
import businessJourney from './businessJourney.json';
import type { NavSection } from './layout';

/**
 * Menu structures (DEV-MENU-STRUCTURES): several named sets of menu groups can coexist. The built-in "standard" one is the document's own
 * GROUPS / GROUP_COLORS / sectionGroups (the legacy single global structure, untouched); any other one carries its own groups, colours and the
 * group + order of every section. A persona navigates with one structure (`Persona.menuStructure`, absent = standard).
 */
export const STANDARD_STRUCTURE = 'standard';
export const STANDARD_LABEL = 'Standard';

/** Where a section sits in a structure. */
export interface Slot { group: string; groupSeq: number }
export interface MenuStructure { id: string; label: string; groups: MenuGroup[]; colors: Record<string, string>; placement: Record<string, Slot> }
/** A structure as a picker lists it: built-ins (standard and the shipped ones) cannot be deleted. */
export interface StructureRef { id: string; label: string; builtin: boolean }

/** The structures shipped with the app besides the standard one (a document copy with the same id overrides it). */
export const BUILTIN_STRUCTURES: readonly MenuStructure[] = [businessJourney.structure as MenuStructure];
/** The personas shipped with those structures (the default document carries them; an older case can add them). */
export const BUILTIN_PERSONAS: readonly Persona[] = [businessJourney.persona as Persona];

/** The structure a persona navigates with. */
export const structureOf = (p: Pick<Persona, 'menuStructure'> | undefined): string => p?.menuStructure || STANDARD_STRUCTURE;
export const isBuiltinStructure = (id: string): boolean => id === STANDARD_STRUCTURE || BUILTIN_STRUCTURES.some((s) => s.id === id);

/** A non-standard structure by id: the document's copy first, else the built-in one. Null for the standard structure or an unknown id. */
export function findStructure(id: string, stored: readonly MenuStructure[] | undefined): MenuStructure | null {
  if (id === STANDARD_STRUCTURE) return null;
  return stored?.find((s) => s.id === id) ?? BUILTIN_STRUCTURES.find((s) => s.id === id) ?? null;
}

/** Every structure a persona can pick: standard, the built-ins (label from the document copy when renamed), then the document's own. */
export function structureList(stored: readonly MenuStructure[] | undefined): StructureRef[] {
  const out: StructureRef[] = [{ id: STANDARD_STRUCTURE, label: STANDARD_LABEL, builtin: true }];
  for (const b of BUILTIN_STRUCTURES) out.push({ id: b.id, label: stored?.find((s) => s.id === b.id)?.label ?? b.label, builtin: true });
  for (const s of stored ?? []) if (!out.some((o) => o.id === s.id)) out.push({ id: s.id, label: s.label, builtin: false });
  return out;
}

/**
 * The catalogue as a structure places it: a placed section takes the structure's group and order; a section the structure does not place yet
 * (a dashboard added later) keeps its own group when the structure has it, else goes to the structure's last group.
 */
export function placeIn(sections: NavSection[], st: MenuStructure): NavSection[] {
  const ids = new Set(st.groups.map((g) => g.id)), last = groupsByOrder(st.groups).at(-1)?.id ?? '';
  return sections.map((s) => {
    const p = st.placement[s.id];
    if (p) return { ...s, group: p.group, groupSeq: p.groupSeq };
    return ids.has(s.group) ? s : { ...s, group: last };
  });
}

/** A new structure that copies what a navigation shows today (Duplicate): its groups, their colours and every section's group and order. */
export function snapshotStructure(id: string, label: string, groups: MenuGroup[], colors: Record<string, string>, sections: NavSection[]): MenuStructure {
  const gids = new Set(groups.map((g) => g.id));
  return {
    id, label, groups: groups.map((g) => ({ ...g })), colors: Object.fromEntries(Object.entries(colors).filter(([k]) => gids.has(k))),
    placement: Object.fromEntries(sections.map((s) => [s.id, { group: s.group, groupSeq: s.groupSeq || 0 }])),
  };
}

/** The personas that navigate with a structure (a structure still in use cannot be deleted). */
export const personasUsing = (personas: readonly Persona[], id: string): Persona[] => personas.filter((p) => structureOf(p) === id);

/** Does a structure place every section of the catalogue in exactly one of its own groups? Returns the ids that are not (coverage check). */
export function unplaced(st: MenuStructure, sectionIds: readonly string[]): string[] {
  const gids = new Set(st.groups.map((g) => g.id));
  return sectionIds.filter((id) => !st.placement[id] || !gids.has(st.placement[id]!.group));
}
