/** @calc-zone workspace-config */
import type { DynRow, PersonaOrder, SectionRow } from '@/domain/nav/layout';
import type { Placement } from '@/domain/nav/moves';
import type { MenuGroup } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const rows = (d: Doc): SectionRow[] => ((d.sectionGroups ??= []) as SectionRow[]);
const dyn = (d: Doc): DynRow[] => ((d.dynamicSections ??= []) as DynRow[]);
const orders = (d: Doc): PersonaOrder => ((d.PERSONA_SECTION_ORDER ??= {}) as PersonaOrder);

// ---- Menu layout: where a section sits (group + order), shared by every persona --------------------------------------------
// A static section is a row of `sectionGroups`; a dynamic one carries its own menuGroup / order (legacy keeps both in sync, here the dynamic row is the truth).
const placeCmd = defineCommand<{ title: string; rows: Placement[] }>({
  type: 'nav.placeSections', label: (p) => p.title,
  run(d, p) {
    for (const pl of p.rows) {
      const dr = dyn(d).find((x) => x.id === pl.id);
      if (dr) { dr.menuGroup = pl.group; dr.order = pl.groupSeq; continue; }
      const r = rows(d).find((x) => x.id === pl.id);
      if (r) { r.group = pl.group; r.groupSeq = pl.groupSeq; } else rows(d).push({ id: pl.id, group: pl.group, groupSeq: pl.groupSeq });
    }
  },
});
const groupOrdersCmd = defineCommand<{ title: string; orders: Record<string, number> }>({
  type: 'nav.setGroupOrders', label: (p) => p.title,
  run(d, p) { d.GROUPS = ((d.GROUPS ?? []) as MenuGroup[]).map((g) => (g.id in p.orders ? { ...g, order: p.orders[g.id]! } : g)); },
});

// ---- Per-persona section order (sparse override of the global order) -------------------------------------------------------
const personaOrderCmd = defineCommand<{ title: string; persona: string; entries: Record<string, number> }>({
  type: 'nav.setPersonaOrder', label: (p) => p.title,
  run(d, p) { orders(d)[p.persona] = { ...(orders(d)[p.persona] ?? {}), ...p.entries }; },
});
const clearOrderCmd = defineCommand<{ persona: string; id: string }>({
  type: 'nav.clearPersonaOrder', label: (p) => `Inherit the global order of ${p.id} for ${p.persona}`,
  run(d, p) { orders(d)[p.persona] = Object.fromEntries(Object.entries(orders(d)[p.persona] ?? {}).filter(([k]) => k !== p.id)); },   // rebuilt, not `delete`d: undo keeps key order
});
const membersCmd = defineCommand<{ persona: string; ids: string[] }>({
  type: 'nav.setPersonaSections', label: (p) => `Set the menu of ${p.persona} to ${p.ids.length} section(s)`,
  run(d, p) { d.PERSONA_SECTIONS = { ...((d.PERSONA_SECTIONS ?? {}) as Record<string, string[]>), [p.persona]: p.ids.slice() }; },
});

// ---- Sidebar display of the current group's sections in the compact (hide-menu) bar -----------------------------------------
const styleCmd = defineCommand<{ style: 'buttons' | 'tabs' }>({
  type: 'nav.setSectionNavStyle', label: (p) => `Show the group sections as ${p.style}`, run(d, p) { d.SECTION_NAV_STYLE = p.style === 'tabs' ? 'tabs' : 'buttons'; },
});

const go = <P>(c: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(c(p));
/** Group and order of one or several sections (a card dropped or shifted on the Menu layout board). */
export const placeSections = (title: string, placements: Placement[]): void => { if (placements.length) go(placeCmd, { title, rows: placements }); };
/** New `order` of some menu groups (a group column moved on the board). */
export const setGroupOrders = (title: string, byGroup: Record<string, number>): void => { if (Object.keys(byGroup).length) go(groupOrdersCmd, { title, orders: byGroup }); };
/** Order of sections in one persona's menu (a card shifted on the persona board, respace, sync to the sequence). */
export const setPersonaSectionOrder = (title: string, persona: string, entries: Record<string, number>): void => { if (Object.keys(entries).length) go(personaOrderCmd, { title, persona, entries }); };
export const clearPersonaSectionOrder = (persona: string, id: string): void => go(clearOrderCmd, { persona, id });
/** Replace the persona's whole menu (Sync menu to sequence). */
export const setPersonaSections = (persona: string, ids: string[]): void => go(membersCmd, { persona, ids });
export const setSectionNavStyle = (style: 'buttons' | 'tabs'): void => go(styleCmd, { style });
