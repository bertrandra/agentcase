/** @calc-zone workspace-config */
import type { MenuGroup } from '../pdc/personas';
import { bySeq, groupsByOrder, reachable, type NavSection, type PersonaLists, type PersonaOrder } from './layout';

/**
 * First reachable section of a group (legacy firstSectionOfGroup): Welcome never counts. Advanced walks the catalogue, the others their own
 * list in stored order (not their display order — the legacy picks the first id of the list).
 */
export function firstOfGroup(persona: string, group: string, sections: NavSection[], lists: PersonaLists): string | null {
  const inGroup = (id: string) => sections.find((s) => s.id === id)?.group === group && id !== 'home';
  const ids = persona === 'advanced' ? sections.map((s) => s.id) : lists[persona] ?? [];
  return ids.find(inGroup) ?? null;
}

export interface GroupBar { groups: MenuGroup[]; selected: string; sections: NavSection[] }

/**
 * The in-content navigation of the hide-menu mode (legacy renderGroupNavBar) for the open section: the groups the persona can reach (a group
 * holding only Welcome is not offered), the group shown in the selector (the section's own, else the first offered) and that group's sections.
 * `sections` may be a filtered list (Fast Path); the open section is still looked up in `all`.
 */
export function groupBar(persona: string, active: string, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists, order: PersonaOrder, all: NavSection[] = sections): GroupBar | null {
  const sec = all.find((s) => s.id === active);
  if (!sec) return null;
  const offered = groupsByOrder(groups).filter((g) => firstOfGroup(persona, g.id, sections, lists));
  const selected = offered.some((g) => g.id === sec.group) ? sec.group : offered[0]?.id ?? '';
  return { groups: offered, selected, sections: reachable(persona, sections, lists).filter((s) => s.group === sec.group).sort(bySeq(persona, order)) };
}
