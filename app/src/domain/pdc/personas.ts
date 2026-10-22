/** @calc-zone workspace-config */
export interface PersonaSeq { on: boolean; steps: { label: string; sections: string[] }[] }
export interface Persona { id: string; label: string; protected: boolean; order: number; compactNav?: boolean; default?: boolean; seq?: PersonaSeq }
export interface MenuGroup { id: string; label: string; order: number; description?: string }

export const slugify = (s: string): string => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** An id derived from `label` that is not taken yet ("x", "x-2", "x-3" …). Null when the label has no letter or digit. */
export function uniqueId(label: string, taken: string[]): string | null {
  const base = slugify(label);
  if (!base) return null;
  let id = base, n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}

/** Personas in picker order (stable for equal orders). */
export const personasByOrder = (list: Persona[]): Persona[] => [...list].sort((a, b) => a.order - b.order);
export const groupsByOrder = (list: MenuGroup[]): MenuGroup[] => [...list].sort((a, b) => a.order - b.order);

/** The persona created by "Duplicate": same menu and guided sequence, next order, not protected, no compact nav (legacy pmDuplicatePersona). */
export function duplicateOf(src: Persona, taken: string[], maxOrder: number): Persona {
  const label = `${src.label} (copy)`;
  let id = slugify(label), n = 2;
  while (taken.includes(id)) id = `${slugify(src.label)}-copy-${n++}`;
  const copy: Persona = { id, label, protected: false, order: maxOrder + 1 };
  if (src.seq && Array.isArray(src.seq.steps)) copy.seq = JSON.parse(JSON.stringify(src.seq)) as PersonaSeq;
  return copy;
}
