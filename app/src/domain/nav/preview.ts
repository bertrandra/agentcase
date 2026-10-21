import type { MenuGroup } from '../pdc/personas';
import { navGroups, type NavGroupView, type NavSection, type PersonaLists, type PersonaOrder } from './layout';
import { placeForPersona, placeSection } from './moves';

/** A drop that has not happened yet: the card being dragged and where it is currently hovering. */
export interface Pending { id: string; group: string; index: number }
/** `global` = Menu layout board (group + order for everyone), `persona` = Persona layout board (order for one persona only). */
export type PendingScope = 'global' | 'persona';
export interface MenuPreview { nav: NavGroupView[]; moved: string | null }

/**
 * The sidebar `persona` would see if the pending drop were committed. Pure and read-only: it reuses the board's own move functions on
 * copies, so what is previewed is exactly what the drop would write, and nothing is written.
 */
export function previewMenu(persona: string, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists, order: PersonaOrder, pending: Pending | null, scope: PendingScope): MenuPreview {
  if (!pending || !sections.some((s) => s.id === pending.id)) return { nav: navGroups(persona, sections, groups, lists, order), moved: null };
  if (scope === 'global') {
    const at = new Map(placeSection(sections, pending.id, pending.group, pending.index).map((p) => [p.id, p]));
    const next = sections.map((s) => { const p = at.get(s.id); return p ? { ...s, group: p.group, groupSeq: p.groupSeq } : s; });
    return { nav: navGroups(persona, next, groups, lists, order), moved: pending.id };
  }
  const entries = placeForPersona(sections, persona, order, pending.id, pending.index);
  return { nav: navGroups(persona, sections, groups, lists, { ...order, [persona]: { ...(order[persona] ?? {}), ...entries } }), moved: pending.id };
}
