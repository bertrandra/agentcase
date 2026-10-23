/** @calc-zone workspace-config */
import { BUILTIN_PERSONAS, isBuiltinStructure, personasUsing, structureList, type MenuStructure } from '@/domain/nav/structures';
import { uniqueId, type Persona } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import { editableStructure, isStandard, storedStructures } from './menuTarget';

const personas = (d: Doc): Persona[] => ((d.PERSONAS ??= []) as Persona[]);
const stored = (d: Doc): MenuStructure[] => (d.MENU_STRUCTURES ?? []) as MenuStructure[];

// ---- Menu structures: create (a copy of an existing one), rename, delete ---------------------------------------------------------
/** `source` is the structure being copied as the navigation resolves it now (the caller builds it: the standard one needs the catalogue). */
const duplicateCmd = defineCommand<{ label: string; source: MenuStructure }>({
  type: 'menu.duplicateStructure', label: (p) => `Create the menu structure ${p.label} (copy of ${p.source.label})`,
  run(d, p) {
    const label = p.label.trim().slice(0, 120), id = uniqueId(label, structureList(stored(d)).map((s) => s.id));
    if (!id || !label) return;
    storedStructures(d).push({ ...(JSON.parse(JSON.stringify(p.source)) as MenuStructure), id, label });
  },
});
const renameCmd = defineCommand<{ id: string; label: string }>({
  type: 'menu.renameStructure', label: (p) => `Rename the menu structure ${p.id} to ${p.label}`,
  run(d, p) { const v = p.label.trim().slice(0, 120); if (isStandard(p.id) || !v) return; const st = editableStructure(d, p.id); if (st) st.label = v; },
});
const deleteCmd = defineCommand<{ id: string }>({
  type: 'menu.deleteStructure', label: (p) => `Delete the menu structure ${p.id}`,
  run(d, p) {
    if (isBuiltinStructure(p.id) || personasUsing(personas(d), p.id).length) return;   // built-ins are protected; a structure in use is kept
    d.MENU_STRUCTURES = stored(d).filter((s) => s.id !== p.id);
  },
});

// ---- Which structure a persona navigates with --------------------------------------------------------------------------------
const setCmd = defineCommand<{ persona: string; structure: string }>({
  type: 'persona.setMenuStructure', label: (p) => `Navigate ${p.persona} with the menu structure ${p.structure}`,
  run(d, p) {
    if (!structureList(stored(d)).some((s) => s.id === p.structure)) return;
    d.PERSONAS = personas(d).map((x) => {
      if (x.id !== p.persona) return x;
      const rest = Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'menuStructure')) as Persona;   // standard = the absent field (older files stay byte-identical)
      return isStandard(p.structure) ? rest : { ...rest, menuStructure: p.structure };
    });
  },
});
/** A persona shipped with the app (Business journey) added to a case saved before it existed; `catalogue` = every section id (it sees them all). */
const addBuiltinCmd = defineCommand<{ id: string; catalogue: string[] }>({
  type: 'persona.addBuiltin', label: (p) => `Add the built-in persona ${p.id}`,
  run(d, p) {
    const src = BUILTIN_PERSONAS.find((x) => x.id === p.id);
    if (!src || personas(d).some((x) => x.id === p.id)) return;
    personas(d).push(JSON.parse(JSON.stringify(src)) as Persona);
    d.PERSONA_SECTIONS = { ...((d.PERSONA_SECTIONS ?? {}) as Record<string, string[]>), [p.id]: p.catalogue.slice() };
  },
});

const go = <P>(c: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(c(p));
export const duplicateStructure = (label: string, source: MenuStructure): void => go(duplicateCmd, { label, source });
export const renameStructure = (id: string, label: string): void => go(renameCmd, { id, label });
export const deleteStructure = (id: string): void => go(deleteCmd, { id });
export const setPersonaMenuStructure = (persona: string, structure: string): void => go(setCmd, { persona, structure });
export const addBuiltinPersona = (id: string, catalogue: string[]): void => go(addBuiltinCmd, { id, catalogue });
