/** @calc-zone workspace-config */
import { duplicateOf, uniqueId, type MenuGroup, type Persona } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

type Lists = Record<string, string[]>;
const personas = (d: Doc): Persona[] => ((d.PERSONAS ??= []) as Persona[]);
const sections = (d: Doc): Lists => ((d.PERSONA_SECTIONS ??= {}) as Lists);
const groups = (d: Doc): MenuGroup[] => ((d.GROUPS ??= []) as MenuGroup[]);
const omit = <T extends object>(o: T, key: string): T => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key)) as T;
const maxOrder = (l: { order: number }[]): number => Math.max(0, ...l.map((x) => x.order));

// ---- Personas -----------------------------------------------------------------------------------------------------------
const addPersonaCmd = defineCommand<{ label: string }>({
  type: 'persona.add', label: (p) => `Add the persona ${p.label}`,
  run(d, p) {
    const id = uniqueId(p.label, personas(d).map((x) => x.id)), label = p.label.trim().slice(0, 120);
    if (!id || !label) return;
    personas(d).push({ id, label, protected: false, order: maxOrder(personas(d)) + 1 });
    sections(d)[id] = [];
  },
});
const duplicateCmd = defineCommand<{ id: string; catalogue: string[] }>({
  type: 'persona.duplicate', label: (p) => `Duplicate the persona ${p.id}`,
  run(d, p) {
    const src = personas(d).find((x) => x.id === p.id);
    if (!src) return;
    const copy = duplicateOf(src, personas(d).map((x) => x.id), maxOrder(personas(d)));
    personas(d).push(copy);
    sections(d)[copy.id] = (p.id === 'advanced' ? p.catalogue : sections(d)[p.id] ?? []).slice();   // Advanced has no list of its own: it sees the whole catalogue
  },
});
const deleteCmd = defineCommand<{ id: string }>({
  type: 'persona.delete', label: (p) => `Delete the persona ${p.id}`,
  run(d, p) {
    if (personas(d).find((x) => x.id === p.id)?.protected !== false) return;
    d.PERSONAS = personas(d).filter((x) => x.id !== p.id);
    d.PERSONA_SECTIONS = omit(sections(d), p.id);   // rebuilt (not `delete`d), so undo restores the key in its place
    d.PERSONA_SECTION_ORDER = omit((d.PERSONA_SECTION_ORDER ?? {}) as Record<string, unknown>, p.id);
    if (d.currentPersona === p.id) d.currentPersona = 'advanced';
  },
});
const renameCmd = defineCommand<{ id: string; label: string }>({
  type: 'persona.rename', label: (p) => `Rename the persona ${p.id} to ${p.label}`,
  run(d, p) { const x = personas(d).find((y) => y.id === p.id), v = p.label.trim(); if (x && !x.protected && v) x.label = v; },
});
const orderCmd = defineCommand<{ id: string; order: number }>({
  type: 'persona.setOrder', label: (p) => `Set the order of the persona ${p.id} to ${p.order}`, coalesceKey: (p) => `persona.setOrder:${p.id}`,
  run(d, p) { const x = personas(d).find((y) => y.id === p.id); if (x && !x.protected && !isNaN(p.order)) x.order = p.order; },
});
const compactCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'persona.setCompactNav', label: (p) => `${p.on ? 'Hide' : 'Show'} the sidebar by default for ${p.id}`,
  run(d, p) { const x = personas(d).find((y) => y.id === p.id); if (x) x.compactNav = p.on; },
});
const defaultCmd = defineCommand<{ id: string }>({
  type: 'persona.setDefault', label: (p) => `Open the app on the persona ${p.id}`,
  run(d, p) { if (personas(d).some((x) => x.id === p.id)) d.PERSONAS = personas(d).map((x) => (x.id === p.id ? { ...x, default: true } : omit(x, 'default'))); },
});
const addSectionCmd = defineCommand<{ persona: string; section: string }>({
  type: 'persona.addSection', label: (p) => `Add ${p.section} to the menu of ${p.persona}`,
  run(d, p) { const l = (sections(d)[p.persona] ??= []); if (!l.includes(p.section)) l.push(p.section); },
});
const removeSectionCmd = defineCommand<{ persona: string; section: string }>({
  type: 'persona.removeSection', label: (p) => `Remove ${p.section} from the menu of ${p.persona}`,
  run(d, p) { sections(d)[p.persona] = (sections(d)[p.persona] ?? []).filter((x) => x !== p.section); },
});

// ---- Menu groups --------------------------------------------------------------------------------------------------------
const addGroupCmd = defineCommand<{ label: string }>({
  type: 'persona.addGroup', label: (p) => `Add the menu group ${p.label}`,
  run(d, p) { const id = uniqueId(p.label, groups(d).map((x) => x.id)), label = p.label.trim().slice(0, 120); if (id && label) groups(d).push({ id, label, order: maxOrder(groups(d)) + 1, description: '' }); },
});
const renameGroupCmd = defineCommand<{ id: string; label: string }>({
  type: 'persona.renameGroup', label: (p) => `Rename the menu group ${p.id} to ${p.label}`,
  run(d, p) { const g = groups(d).find((x) => x.id === p.id), v = p.label.trim().slice(0, 120); if (g && v) g.label = v; },
});
const deleteGroupCmd = defineCommand<{ id: string }>({ type: 'persona.deleteGroup', label: (p) => `Delete the menu group ${p.id}`, run(d, p) { d.GROUPS = groups(d).filter((x) => x.id !== p.id); } });
const groupOrderCmd = defineCommand<{ id: string; order: number }>({
  type: 'persona.setGroupOrder', label: (p) => `Set the order of the menu group ${p.id} to ${p.order}`, coalesceKey: (p) => `persona.setGroupOrder:${p.id}`,
  run(d, p) { const g = groups(d).find((x) => x.id === p.id); if (g && !isNaN(p.order)) g.order = p.order; },
});
const groupDescCmd = defineCommand<{ id: string; description: string }>({
  type: 'persona.setGroupDescription', label: (p) => `Describe the menu group ${p.id}`, coalesceKey: (p) => `persona.setGroupDescription:${p.id}`,
  run(d, p) { const g = groups(d).find((x) => x.id === p.id); if (g) g.description = p.description; },
});
const groupColorCmd = defineCommand<{ id: string; color: string }>({
  type: 'persona.setGroupColor', label: (p) => `Set the colour of the menu group ${p.id}`, coalesceKey: (p) => `persona.setGroupColor:${p.id}`,
  run(d, p) { if (/^#[0-9a-fA-F]{3,8}$/.test(p.color)) d.GROUP_COLORS = { ...((d.GROUP_COLORS ?? {}) as Record<string, string>), [p.id]: p.color }; },
});

const go = <P>(c: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(c(p));
export const addPersona = (label: string): void => go(addPersonaCmd, { label });
export const duplicatePersona = (id: string, catalogue: string[]): void => go(duplicateCmd, { id, catalogue });
export const deletePersona = (id: string): void => go(deleteCmd, { id });
export const renamePersona = (id: string, label: string): void => go(renameCmd, { id, label });
export const setPersonaOrder = (id: string, order: number): void => go(orderCmd, { id, order });
export const setPersonaCompactNav = (id: string, on: boolean): void => go(compactCmd, { id, on });
export const setDefaultPersona = (id: string): void => go(defaultCmd, { id });
export const addPersonaSection = (persona: string, section: string): void => go(addSectionCmd, { persona, section });
export const removePersonaSection = (persona: string, section: string): void => go(removeSectionCmd, { persona, section });
export const addGroup = (label: string): void => go(addGroupCmd, { label });
export const renameGroup = (id: string, label: string): void => go(renameGroupCmd, { id, label });
export const deleteGroup = (id: string): void => go(deleteGroupCmd, { id });
export const setGroupOrder = (id: string, order: number): void => go(groupOrderCmd, { id, order });
export const setGroupDescription = (id: string, description: string): void => go(groupDescCmd, { id, description });
export const setGroupColor = (id: string, color: string): void => go(groupColorCmd, { id, color });
