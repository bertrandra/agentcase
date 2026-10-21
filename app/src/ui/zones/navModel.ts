import { useMemo } from 'react';
import { landingSection, navGroups, resolveSections, type DynRow, type NavGroupView, type NavSection, type PersonaLists, type PersonaOrder, type SectionRow } from '@/domain/nav/layout';
import { fastPathSections } from '@/domain/nav/fastPath';
import { activeSeq } from '@/domain/nav/sequence';
import { personasByOrder, type MenuGroup, type Persona, type PersonaSeq } from '@/domain/pdc/personas';
import { useDoc } from '@/store/hooks';
import { useUi } from '../uiState';
import { DEFAULT_PERSONA_SECTIONS, GROUPS, SECTIONS } from './registry';

const FALLBACK: Persona[] = [{ id: 'builder', label: 'Builder', protected: false, order: 1 }, { id: 'clientcase', label: 'Client case', protected: false, order: 2 },
  { id: 'admin', label: 'Admin', protected: false, order: 3 }, { id: 'advanced', label: 'Advanced', protected: true, order: 0 }];
const NO_COLORS: Record<string, string> = {}, NO_ORDER: PersonaOrder = {};
/** A group colour reaches inline styles: only #rgb … #rrggbbaa is accepted (legacy groupColor). */
export { groupColor } from '@/domain/nav/layout';

/** Everything the navigation shows, read from the document: the static registry stays only as the default. */
export interface NavModel {
  persona: string; personas: Persona[]; groups: MenuGroup[]; colors: Record<string, string>; sections: NavSection[]; visible: NavSection[]; fastPath: boolean; lists: PersonaLists; order: PersonaOrder
  style: 'buttons' | 'tabs'; nav: NavGroupView[]; compact: boolean; seq: PersonaSeq | null; landing: (persona: string) => string
}

export function useNavModel(): NavModel {
  const persona = useDoc((d) => (d.currentPersona as string) ?? 'builder'), docPersonas = useDoc((d) => d.PERSONAS as Persona[] | undefined);
  const docGroups = useDoc((d) => d.GROUPS as MenuGroup[] | undefined), colors = useDoc((d) => (d.GROUP_COLORS as Record<string, string> | undefined) ?? NO_COLORS);
  const rows = useDoc((d) => d.sectionGroups as SectionRow[] | undefined), dyn = useDoc((d) => d.dynamicSections as DynRow[] | undefined);
  const docLists = useDoc((d) => d.PERSONA_SECTIONS as PersonaLists | undefined), order = useDoc((d) => (d.PERSONA_SECTION_ORDER as PersonaOrder | undefined) ?? NO_ORDER);
  const style = useDoc((d) => (d.SECTION_NAV_STYLE === 'tabs' ? 'tabs' : 'buttons'));
  const fastPath = useUi((s) => s.fastPath);
  return useMemo(() => {
    const groups = docGroups?.length ? docGroups : (GROUPS as MenuGroup[]), lists = docLists ?? DEFAULT_PERSONA_SECTIONS;
    const personas = personasByOrder(docPersonas?.length ? docPersonas : FALLBACK), sections = resolveSections(SECTIONS, rows, dyn), visible = fastPathSections(sections, fastPath), current = personas.find((p) => p.id === persona);
    return { persona, personas, groups, colors, sections, visible, fastPath, lists, order, style, nav: navGroups(persona, visible, groups, lists, order), compact: !!current?.compactNav,
      seq: activeSeq(current?.seq), landing: (id: string) => landingSection(id, sections, groups, lists, order) };
  }, [persona, docPersonas, docGroups, colors, rows, dyn, docLists, order, style, fastPath]);
}
