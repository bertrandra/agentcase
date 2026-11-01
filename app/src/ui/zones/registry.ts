import sectionCatalog from './data/sectionCatalog.json';
import groups from './data/groups.json';
import personaSections from './data/personaSections.json';

/** One screen section (legacy `tab-content`) as the navigation sees it. */
export interface SectionDef { id: string; group: string; groupSeq: number; label: string; description: string; tag?: string; mvp?: boolean; app?: boolean;
  personas?: string[] }
export interface GroupDef { id: string; label: string; order: number; description?: string }

/** The Portfolio group (multi-product, spec 6.3): in the catalogue like any group, but only shown from two products on (`ui/zones/portfolioNav.ts`). */
export const PORTFOLIO_GROUP_ID = 'portfolio';
export const SECTIONS = sectionCatalog as SectionDef[];
export const GROUPS = [...(groups as GroupDef[])].sort((a, b) => a.order - b.order);
/**
 * App sections (`app: true`): added by the TS app with no legacy equivalent (🎨 Brand & theme). Like the Portfolio ones they stay out of the
 * legacy-shaped artefacts and the case's persona lists; shown by default to the personas their `personas` field names, overridden per persona in
 * `PERSONA_APP_SECTIONS` (`domain/nav/appSections.ts` `withAppSections`, DEV-APP-SECTION-PERSONAS).
 */
export const APP_SECTIONS = SECTIONS.filter((s) => s.app);
/** The 79 case sections / 14 groups of the legacy file: what the legacy-shaped artefacts (parameters workbook, legacy oracle tests) describe. */
export const LEGACY_SECTIONS = SECTIONS.filter((s) => s.group !== PORTFOLIO_GROUP_ID && !s.app);
export const LEGACY_GROUPS = GROUPS.filter((g) => g.id !== PORTFOLIO_GROUP_ID);
export const DEFAULT_PERSONA_SECTIONS = personaSections as Record<string, string[]>;
export const sectionById = (id: string): SectionDef | undefined => SECTIONS.find((s) => s.id === id);
/**
 * The title a section's screen shows where it differs from its menu label (the menu keeps the legacy label, DEV-B9D-PLAN-SCREEN): a link names the
 * screen it opens (SPEC_FIXES FX-19).
 */
export const SECTION_TITLES: Readonly<Record<string, string>> = { gantt: '📅 Plan' };
export const linkLabel = (id: string): string => SECTION_TITLES[id] ?? sectionById(id)?.label ?? id;

/** Advanced sees everything; other personas see their configured list (the doc's PERSONA_SECTIONS, else the defaults). */
export function visibleSections(persona: string, configured?: Record<string, string[]>): SectionDef[] {
  if (persona === 'advanced') return SECTIONS;
  const ids = new Set((configured ?? DEFAULT_PERSONA_SECTIONS)[persona] ?? DEFAULT_PERSONA_SECTIONS[persona] ?? []);
  return SECTIONS.filter((s) => ids.has(s.id));
}

export interface NavGroup { group: GroupDef; sections: SectionDef[] }

/** Sections grouped by navigation group, groups by `order`, sections by `groupSeq`; empty groups are dropped. */
export function groupedNav(sections: SectionDef[]): NavGroup[] {
  return GROUPS.map((group) => ({ group, sections: sections.filter((s) => s.group === group.id).sort((a, b) => a.groupSeq - b.groupSeq) }))
    .filter((g) => g.sections.length > 0);
}
