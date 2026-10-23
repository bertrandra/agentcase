/** @calc-zone workspace-config */
import { BUILTIN_STRUCTURES, STANDARD_STRUCTURE, type MenuStructure } from '@/domain/nav/structures';
import type { MenuGroup } from '@/domain/pdc/personas';
import type { Doc } from '@/store/types';

/**
 * Which menu structure a group / placement command edits. The standard structure is the document's GROUPS / GROUP_COLORS / sectionGroups (so a
 * command without a structure behaves exactly as before); any other one lives in MENU_STRUCTURES. Helpers for command `run`s (Immer drafts).
 */
export const isStandard = (id: string | undefined): boolean => !id || id === STANDARD_STRUCTURE;
/** " in <id>" for a command label when the target is not the standard structure. */
export const inStructure = (id: string | undefined): string => (isStandard(id) ? '' : ` in the menu structure ${id}`);

export const storedStructures = (d: Doc): MenuStructure[] => ((d.MENU_STRUCTURES ??= []) as MenuStructure[]);

/** The document's editable copy of a non-standard structure: a built-in one is copied into the document on its first edit. Null when unknown. */
export function editableStructure(d: Doc, id: string): MenuStructure | null {
  const have = ((d.MENU_STRUCTURES ?? []) as MenuStructure[]).find((s) => s.id === id);
  if (have) return have;
  const builtin = BUILTIN_STRUCTURES.find((s) => s.id === id);
  if (!builtin) return null;
  const list = storedStructures(d);
  list.push(JSON.parse(JSON.stringify(builtin)) as MenuStructure);
  return list[list.length - 1]!;
}

/** The group list a command edits (null: unknown structure, nothing to do). */
export function groupsIn(d: Doc, structure: string | undefined): MenuGroup[] | null {
  return isStandard(structure) ? ((d.GROUPS ??= []) as MenuGroup[]) : editableStructure(d, structure!)?.groups ?? null;
}
/** Replace the group list (rebuilt rather than spliced, so undo keeps the order of keys). */
export function setGroupsIn(d: Doc, structure: string | undefined, groups: MenuGroup[]): void {
  if (isStandard(structure)) { d.GROUPS = groups; return; }
  const st = editableStructure(d, structure!);
  if (st) st.groups = groups;
}
/** Set one group colour. */
export function setColorIn(d: Doc, structure: string | undefined, id: string, color: string): void {
  if (isStandard(structure)) { d.GROUP_COLORS = { ...((d.GROUP_COLORS ?? {}) as Record<string, string>), [id]: color }; return; }
  const st = editableStructure(d, structure!);
  if (st) st.colors = { ...st.colors, [id]: color };
}
