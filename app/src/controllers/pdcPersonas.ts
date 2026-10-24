/** @calc-zone workspace-config */
import { duplicateOf, uniqueId, type Persona } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { currentPersona, setPersona } from './persona';
import type { Doc } from '@/store/types';
import { groupsIn, inStructure, setColorIn, setGroupsIn } from './menuTarget';

type Lists = Record<string, string[]>;
const personas = (d: Doc): Persona[] => ((d.PERSONAS ??= []) as Persona[]);
const sections = (d: Doc): Lists => ((d.PERSONA_SECTIONS ??= {}) as Lists);
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

// ---- Menu groups (of the standard structure, or of the menu structure named in the payload) --------------------------------
type In = { structure?: string };
const addGroupCmd = defineCommand<{ label: string } & In>({
  type: 'persona.addGroup', label: (p) => `Add the menu group ${p.label}${inStructure(p.structure)}`,
  run(d, p) {
    const l = groupsIn(d, p.structure);
    const id = l && uniqueId(p.label, l.map((x) => x.id)), label = p.label.trim().slice(0, 120);
    if (l && id && label) l.push({ id, label, order: maxOrder(l) + 1, description: '' });
  },
});
const renameGroupCmd = defineCommand<{ id: string; label: string } & In>({
  type: 'persona.renameGroup', label: (p) => `Rename the menu group ${p.id} to ${p.label}${inStructure(p.structure)}`,
  run(d, p) { const g = groupsIn(d, p.structure)?.find((x) => x.id === p.id), v = p.label.trim().slice(0, 120); if (g && v) g.label = v; },
});
const deleteGroupCmd = defineCommand<{ id: string } & In>({
  type: 'persona.deleteGroup', label: (p) => `Delete the menu group ${p.id}${inStructure(p.structure)}`,
  run(d, p) { const l = groupsIn(d, p.structure); if (l) setGroupsIn(d, p.structure, l.filter((x) => x.id !== p.id)); },
});
const groupOrderCmd = defineCommand<{ id: string; order: number } & In>({
  type: 'persona.setGroupOrder', label: (p) => `Set the order of the menu group ${p.id} to ${p.order}${inStructure(p.structure)}`, coalesceKey: (p) => `persona.setGroupOrder:${p.structure ? `${p.structure}:` : ''}${p.id}`,
  run(d, p) { const g = groupsIn(d, p.structure)?.find((x) => x.id === p.id); if (g && !isNaN(p.order)) g.order = p.order; },
});
const groupDescCmd = defineCommand<{ id: string; description: string } & In>({
  type: 'persona.setGroupDescription', label: (p) => `Describe the menu group ${p.id}${inStructure(p.structure)}`, coalesceKey: (p) => `persona.setGroupDescription:${p.structure ? `${p.structure}:` : ''}${p.id}`,
  run(d, p) { const g = groupsIn(d, p.structure)?.find((x) => x.id === p.id); if (g) g.description = p.description; },
});
const groupColorCmd = defineCommand<{ id: string; color: string } & In>({
  type: 'persona.setGroupColor', label: (p) => `Set the colour of the menu group ${p.id}${inStructure(p.structure)}`, coalesceKey: (p) => `persona.setGroupColor:${p.structure ? `${p.structure}:` : ''}${p.id}`,
  run(d, p) { if (/^#[0-9a-fA-F]{3,8}$/.test(p.color)) setColorIn(d, p.structure, p.id, p.color); },
});

const go = <P>(c: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(c(p));
/** The payload, with the structure only when it is not the standard one (a standard edit stays byte-identical to before). */
const at = <P extends object>(p: P, structure: string | undefined): P & In => (structure && structure !== 'standard' ? { ...p, structure } : p);
export const addPersona = (label: string): void => go(addPersonaCmd, { label });
export const duplicatePersona = (id: string, catalogue: string[]): void => go(duplicateCmd, { id, catalogue });
/** Delete a persona; a tab showing it moves to Advanced (its persona is view state: the switch is not part of the undo step). */
export function deletePersona(id: string): void {
  go(deleteCmd, { id });
  if (currentPersona() === id && !personas(editBase()).some((x) => x.id === id)) setPersona('advanced');
}
export const renamePersona = (id: string, label: string): void => go(renameCmd, { id, label });
export const setPersonaOrder = (id: string, order: number): void => go(orderCmd, { id, order });
export const setPersonaCompactNav = (id: string, on: boolean): void => go(compactCmd, { id, on });
export const setDefaultPersona = (id: string): void => go(defaultCmd, { id });
export const addPersonaSection = (persona: string, section: string): void => go(addSectionCmd, { persona, section });
export const removePersonaSection = (persona: string, section: string): void => go(removeSectionCmd, { persona, section });
/** Group edits target the standard structure unless a menu structure id is given. */
export const addGroup = (label: string, structure?: string): void => go(addGroupCmd, at({ label }, structure));
export const renameGroup = (id: string, label: string, structure?: string): void => go(renameGroupCmd, at({ id, label }, structure));
export const deleteGroup = (id: string, structure?: string): void => go(deleteGroupCmd, at({ id }, structure));
export const setGroupOrder = (id: string, order: number, structure?: string): void => go(groupOrderCmd, at({ id, order }, structure));
export const setGroupDescription = (id: string, description: string, structure?: string): void => go(groupDescCmd, at({ id, description }, structure));
export const setGroupColor = (id: string, color: string, structure?: string): void => go(groupColorCmd, at({ id, color }, structure));
