/** @calc-zone workspace-config */
import { groupsByOrder, type MenuGroup } from '../pdc/personas';
import { THEME_DEFAULT, tokIn } from '../theme';

/** One section as the navigation sees it (catalogue entry overlaid with the document's placement). */
export interface NavSection { id: string; label: string; description: string; group: string; groupSeq: number; tag?: string; mvp?: boolean; dynamic?: boolean }
/** A row of the document's `sectionGroups` (legacy STATE_REGISTRY key): sparse overlay of group / order / tag / MVP flag. */
export interface SectionRow { id: string; group?: string | null; groupSeq?: number | null; tag?: string; mvp?: boolean }
/** The fields of a stored dynamic section the navigation needs. */
export interface DynRow { id: string; title: string; archetype?: string; menuGroup: string; order?: number | null }
export type PersonaOrder = Record<string, Record<string, number>>;
export type PersonaLists = Record<string, string[]>;
export interface NavGroupView { group: MenuGroup; sections: NavSection[] }

/**
 * The live section catalogue (legacy SECTION_CATALOG after a restore): static entries overlaid with `sectionGroups` (an absent field keeps the
 * default, `tag`/`mvp` present-but-empty clear it), then one entry per stored dynamic section, whose own row is the source of truth for group and order.
 */
export function resolveSections(catalogue: NavSection[], rows: SectionRow[] | undefined, dyn: DynRow[] | undefined): NavSection[] {
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const base = catalogue.map((s) => {
    const r = byId.get(s.id);
    if (!r) return s;
    const out: NavSection = { ...s };
    if (r.group != null) out.group = r.group;
    if (r.groupSeq != null) out.groupSeq = r.groupSeq;
    if ('tag' in r) { if (r.tag) out.tag = r.tag; else delete out.tag; }
    if ('mvp' in r) { if (r.mvp) out.mvp = true; else delete out.mvp; }
    return out;
  });
  const known = new Set(base.map((s) => s.id)), live = new Map((dyn ?? []).map((d) => [d.id, d]));
  const extra = (dyn ?? []).filter((d) => !known.has(d.id)).map((d, i): NavSection => ({
    id: d.id, label: d.title, description: `Dynamic section (${d.archetype ?? ''})`, group: d.menuGroup, groupSeq: d.order ?? base.length + i, dynamic: true }));
  return [...base, ...extra].map((s) => {
    const d = live.get(s.id);
    return d ? { ...s, label: d.title, group: d.menuGroup, groupSeq: d.order ?? s.groupSeq, dynamic: true } : s;
  });
}

export { groupsByOrder } from '../pdc/personas';

/** The neutral grey of a group without a colour, as data (the parameters workbook): the default theme's `slate-600` (legacy #667089). */
export const GROUP_COLOR_DEFAULT = tokIn(THEME_DEFAULT, 'slate-600');
/**
 * A group colour reaches inline styles and exports: only #rgb … #rrggbbaa is accepted, else `fallback` (legacy groupColor). The UI passes the
 * theme's `slate-600`; an export keeps the default (the colour is data there, not paint).
 */
export const groupColor = (colors: Record<string, string> | undefined, id: string | undefined, fallback: string = GROUP_COLOR_DEFAULT): string => {
  const c = id ? colors?.[id] : undefined;
  return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
};
/** The persona's own order for a section, else the section's global order (legacy effectiveGroupSeq). */
export const effectiveSeq = (s: NavSection, persona: string, order: PersonaOrder): number => order[persona]?.[s.id] ?? (s.groupSeq || 0);
export const bySeq = (persona: string, order: PersonaOrder) => (a: NavSection, b: NavSection): number => effectiveSeq(a, persona, order) - effectiveSeq(b, persona, order);

/** Sections a persona can reach: Advanced sees everything, the others exactly their list (unknown ids are dropped). */
export function reachable(persona: string, sections: NavSection[], lists: PersonaLists): NavSection[] {
  if (persona === 'advanced') return sections;
  const ids = new Set(lists[persona] ?? []);
  return sections.filter((s) => ids.has(s.id));
}

/** The sidebar of a persona (legacy renderPersonaNav): groups by order, a group with nothing for the persona absent, sections by the persona's order.
 *  A section whose group no longer exists is not shown anywhere (the legacy never reassigns it). */
export function navGroups(persona: string, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists, order: PersonaOrder): NavGroupView[] {
  const pool = reachable(persona, sections, lists);
  return groupsByOrder(groups)
    .map((group) => ({ group, sections: pool.filter((s) => s.group === group.id).sort(bySeq(persona, order)) }))
    .filter((g) => g.sections.length > 0);
}

/** A missing group sorts last (legacy: order 99). */
const groupRank = (groups: MenuGroup[], id: string): number => groups.find((g) => g.id === id)?.order ?? 99;

/** Sections sorted by group order then the persona's order (legacy: the Assigned table, respace and the persona landing). */
export function appOrder(persona: string, list: NavSection[], groups: MenuGroup[], order: PersonaOrder): NavSection[] {
  return [...list].sort((a, b) => groupRank(groups, a.group) - groupRank(groups, b.group) || effectiveSeq(a, persona, order) - effectiveSeq(b, persona, order));
}

/** Where a persona lands when selected: Advanced on Welcome, the others on the first section of their menu (else Welcome). */
export function landingSection(persona: string, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists, order: PersonaOrder): string {
  if (persona === 'advanced') return 'home';
  return appOrder(persona, reachable(persona, sections, lists), groups, order)[0]?.id ?? 'home';
}
