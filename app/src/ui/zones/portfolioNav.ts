import type { NavSection, PersonaLists } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';
import { GROUPS, PORTFOLIO_GROUP_ID, SECTIONS } from './registry';

/** The "Portefeuille" group (spec 6.3): registered in the bundled catalogue, shown to every persona, but only from two products on. */
export const PORTFOLIO_GROUP = PORTFOLIO_GROUP_ID;
const IDS = new Set(SECTIONS.filter((s) => s.group === PORTFOLIO_GROUP).map((s) => s.id));
export const isPortfolioSection = (id: string): boolean => IDS.has(id);

/**
 * Progressive disclosure of the navigation (spec F23). With one product the Portefeuille sections are not in the catalogue at all (no group, no entry
 * in the persona board, nothing in the sidebar; the first product is added from Welcome). From two products on, the group is added when the document's
 * GROUPS (older files) lack it, and its sections are added to every persona's list, so all personas see it by default.
 */
export function withPortfolio(multi: boolean, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists): { sections: NavSection[]; groups: MenuGroup[]; lists: PersonaLists } {
  if (!multi) return { sections: sections.filter((s) => !IDS.has(s.id)), groups, lists };
  const own = groups.some((g) => g.id === PORTFOLIO_GROUP) ? groups : [...groups, ...(GROUPS.filter((g) => g.id === PORTFOLIO_GROUP) as MenuGroup[])];
  const ids = [...IDS], out: PersonaLists = {};
  for (const [persona, list] of Object.entries(lists)) out[persona] = ids.every((id) => list.includes(id)) ? list : [...list, ...ids.filter((id) => !list.includes(id))];
  return { sections, groups: own, lists: out };
}
