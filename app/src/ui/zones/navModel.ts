import { useMemo } from 'react';
import { landingSection, navGroups, resolveSections, type DynRow, type NavGroupView, type NavSection, type PersonaLists, type PersonaOrder,
  type SectionRow } from '@/domain/nav/layout';
import { fastPathSections } from '@/domain/nav/fastPath';
import { activeSeq } from '@/domain/nav/sequence';
import { findStructure, placeIn, STANDARD_LABEL, STANDARD_STRUCTURE, structureList, structureOf, type MenuStructure,
  type StructureRef } from '@/domain/nav/structures';
import { personasByOrder, type MenuGroup, type Persona, type PersonaSeq } from '@/domain/pdc/personas';
import { useDoc } from '@/store/hooks';
import { useIsMulti, usePersona } from '@/store/portfolioHooks';
import { useUi } from '../uiState';
import { withAppSections, withPortfolio } from './portfolioNav';
import { DEFAULT_PERSONA_SECTIONS, GROUPS, SECTIONS } from './registry';

const FALLBACK: Persona[] = [{ id: 'builder', label: 'Builder', protected: false, order: 1 },
  { id: 'clientcase', label: 'Client case', protected: false, order: 2 },
  { id: 'admin', label: 'Admin', protected: false, order: 3 }, { id: 'advanced', label: 'Advanced', protected: true, order: 0 }];
const NO_COLORS: Record<string, string> = {}, NO_ORDER: PersonaOrder = {};
/** A group colour reaches inline styles: only #rgb … #rrggbbaa is accepted (legacy groupColor). */
export { groupColor } from '@/domain/nav/layout';

/** One menu structure as the navigation shows it: its groups and colours, the sections it places (`all` keeps the Portfolio ones of a single case).
 *  `own` = the groups the structure itself stores (the navigation may add the Portfolio group to `groups`): what the group editor lists. */
export interface StructureView { id: string; label: string; groups: MenuGroup[]; own: MenuGroup[]; colors: Record<string, string>; sections: NavSection[];
  all: NavSection[] }

/** Everything the navigation shows, read from the document: the static registry stays only as the default. Groups, colours and sections follow the
 *  active persona's menu structure; `view(id)` resolves any structure (Persona management edits the one it selects). */
export interface NavModel {
  persona: string; personas: Persona[]; groups: MenuGroup[]; colors: Record<string, string>; sections: NavSection[]; visible: NavSection[]; fastPath: boolean;
    lists: PersonaLists; order: PersonaOrder
  style: 'buttons' | 'tabs'; nav: NavGroupView[]; compact: boolean; seq: PersonaSeq | null; landing: (persona: string) => string
  structure: string; structures: StructureRef[]; view: (id: string) => StructureView; structureOfPersona: (persona: string) => string
}

export function useNavModel(): NavModel {
  const wanted = usePersona(), docPersonas = useDoc((d) => d.PERSONAS as Persona[] | undefined);
  const docGroups = useDoc((d) => d.GROUPS as MenuGroup[] | undefined),
    docColors = useDoc((d) => (d.GROUP_COLORS as Record<string, string> | undefined) ?? NO_COLORS);
  const rows = useDoc((d) => d.sectionGroups as SectionRow[] | undefined), dyn = useDoc((d) => d.dynamicSections as DynRow[] | undefined);
  const docLists = useDoc((d) => d.PERSONA_SECTIONS as PersonaLists | undefined),
    order = useDoc((d) => (d.PERSONA_SECTION_ORDER as PersonaOrder | undefined) ?? NO_ORDER);
  const stored = useDoc((d) => d.MENU_STRUCTURES as MenuStructure[] | undefined);
  const style = useDoc((d) => (d.SECTION_NAV_STYLE === 'tabs' ? 'tabs' : 'buttons'));
  const fastPath = useUi((s) => s.fastPath), multi = useIsMulti();
  return useMemo(() => {
    const base = resolveSections(SECTIONS, rows, dyn), stdGroups = docGroups?.length ? docGroups : (GROUPS as MenuGroup[]),
      allLists = withAppSections(docLists ?? DEFAULT_PERSONA_SECTIONS);
    const personas = personasByOrder(docPersonas?.length ? docPersonas : FALLBACK), lists = withPortfolio(multi, base, stdGroups, allLists).lists,
      cache = new Map<string, StructureView>();
    const view = (id: string): StructureView => {
      const st = findStructure(id, stored), key = st?.id ?? STANDARD_STRUCTURE, hit = cache.get(key);
      if (hit) return hit;
      const all = st ? placeIn(base, st) : base, pf = withPortfolio(multi, all, st ? st.groups : stdGroups, allLists);
      const v = { id: key, label: st?.label ?? STANDARD_LABEL, groups: pf.groups, own: st ? st.groups : stdGroups, colors: st ? st.colors : docColors,
        sections: pf.sections, all };
      cache.set(key, v);
      return v;
    };
    // deleted in another tab: Advanced
    const known = (id: string) => personas.some((p) => p.id === id), persona = known(wanted) || !known('advanced') ? wanted : 'advanced';
    const structureOfPersona = (id: string): string => view(structureOf(personas.find((p) => p.id === id))).id;
    const current = personas.find((p) => p.id === persona), mine = view(structureOfPersona(persona)), { groups, sections, colors } = mine,
      visible = fastPathSections(sections, fastPath);
    return { persona, personas, groups, colors, sections, visible, fastPath, lists, order, style, nav: navGroups(persona, visible, groups, lists, order),
      compact: !!current?.compactNav,
      seq: activeSeq(current?.seq), structure: mine.id, structures: structureList(stored), view, structureOfPersona,
      landing: (id: string) => { const v = view(structureOfPersona(id)); return landingSection(id, v.sections, v.groups, lists, order); } };
  }, [wanted, docPersonas, docGroups, docColors, rows, dyn, docLists, order, stored, style, fastPath, multi]);
}
