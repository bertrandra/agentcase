import { readdirSync, readFileSync } from 'node:fs';
import { resolveSections, type DynRow, type NavSection, type PersonaLists, type PersonaOrder, type SectionRow } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';
import type { Doc } from '@/store/types';
import { SECTIONS } from '@/ui/zones/registry';

/** What the legacy page showed for one persona (tools/oracle-extras.d/nav.mjs). */
export interface LegacyPersonaNav {
  locked: boolean; landing: string; compact: boolean; groups: { group: string; sections: string[] }[]; first: Record<string, string | null>
  bar: { group: string | null; sections: string[]; groups: string[] } | null; wiz: [number, string, string][] | null
}
export interface LegacyNav { style: string; personas: Record<string, LegacyPersonaNav> }

export const NAV_FIXTURES = readdirSync('fixtures/extras/nav').map((f) => f.replace('.json', '')).sort();
export const legacyNav = (id: string): LegacyNav => JSON.parse(readFileSync(`fixtures/extras/nav/${id}.json`, 'utf8')) as LegacyNav;

/** The navigation inputs the document holds (what the sidebar is built from). */
export function navInputs(doc: Doc): { sections: NavSection[]; groups: MenuGroup[]; lists: PersonaLists; order: PersonaOrder } {
  return {
    sections: resolveSections(SECTIONS, doc.sectionGroups as SectionRow[], doc.dynamicSections as DynRow[]),
    groups: doc.GROUPS as MenuGroup[], lists: doc.PERSONA_SECTIONS as PersonaLists, order: (doc.PERSONA_SECTION_ORDER ?? {}) as PersonaOrder,
  };
}
/** The legacy sidebar of every persona with a Board dashboard added (tools/oracle-extras.d/nav.mjs, navDyn). */
export const legacyNavDyn = (id: string): Record<string, { group: string; sections: string[] }[]> => JSON.parse(readFileSync(`fixtures/extras/navDyn/${id}.json`, 'utf8')) as Record<string, { group: string; sections: string[] }[]>;
