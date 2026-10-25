/** @calc-zone workspace-config */
import { nextAppOverrides, readAppOverrides, type AppSectionDef } from '@/domain/nav/appSections';
import type { Persona } from '@/domain/pdc/personas';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/**
 * Who sees an app section (🎨 Brand & theme, DEV-APP-SECTION-PERSONAS): an override in the optional `PERSONA_APP_SECTIONS`, never a change of the
 * legacy-shaped `PERSONA_SECTIONS`. Edited back to the catalogue default, the key disappears again (the case saves as before it was touched).
 * A protected persona (Advanced) sees every section: it takes no override, so every case keeps a way back to the screen.
 */
export function setAppOverride(d: Doc, persona: string, s: AppSectionDef, on: boolean): void {
  if (((d.PERSONAS ?? []) as Persona[]).find((x) => x.id === persona)?.protected !== false) return;
  const list = ((d.PERSONA_SECTIONS ?? {}) as Record<string, string[]>)[persona];
  const next = nextAppOverrides(readAppOverrides(d.PERSONA_APP_SECTIONS), s, persona, list, on);
  if (next) d.PERSONA_APP_SECTIONS = next;
  else if ('PERSONA_APP_SECTIONS' in d) delete d.PERSONA_APP_SECTIONS;
}

/** The overrides without a deleted persona (rebuilt, not `delete`d, so undo restores the key in its place). */
export function dropAppOverrides(d: Doc, persona: string): void {
  const ov = d.PERSONA_APP_SECTIONS as Record<string, unknown> | undefined;
  if (!ov || !(persona in ov)) return;
  const rest = Object.entries(ov).filter(([k]) => k !== persona);
  if (rest.length) d.PERSONA_APP_SECTIONS = Object.fromEntries(rest);
  else delete d.PERSONA_APP_SECTIONS;
}

/** `defaults` = the personas the catalogue entry names (the section's default audience), carried so the command needs no UI catalogue. */
const setCmd = defineCommand<{ persona: string; section: string; on: boolean; defaults: string[] }>({
  type: 'persona.setAppSection', label: (p) => `${p.on ? 'Add' : 'Remove'} ${p.section} ${p.on ? 'to' : 'from'} the menu of ${p.persona}`,
  run(d, p) { setAppOverride(d, p.persona, { id: p.section, personas: p.defaults }, p.on); },
});

/** Show (`on`) or hide an app section in a persona's menu: one undoable step. */
export const setPersonaAppSection = (persona: string, s: AppSectionDef, on: boolean): void =>
  appStore().dispatch(setCmd({ persona, section: s.id, on, defaults: [...(s.personas ?? [])] }));
