import { setPersonaAppSection } from '@/controllers/appSections';
import { setPersonaSections } from '@/controllers/navLayout';
import { addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { readAppOverrides, withAppSections } from '@/domain/nav/appSections';
import { APP_SECTIONS } from '@/ui/zones/registry';

/** The case's persona lists with the app sections resolved (what each persona's menu shows), the Portfolio sections left as stored. */
export const effectiveLists = (lists: Record<string, string[]>, overrides: unknown): Record<string, string[]> =>
  withAppSections(lists, APP_SECTIONS, readAppOverrides(overrides));

/** Add (`on`) or remove a section from a persona's menu: an app section (DEV-APP-SECTION-PERSONAS) through its override, any other in the list. */
export function assignSection(persona: string, id: string, on: boolean): void {
  const app = APP_SECTIONS.find((s) => s.id === id);
  if (app) setPersonaAppSection(persona, app, on);
  else if (on) addPersonaSection(persona, id);
  else removePersonaSection(persona, id);
}

/** Replace a persona's whole menu (Sync menu to sequence), app sections included. */
export const syncPersonaMenu = (persona: string, ids: string[]): void => setPersonaSections(persona, ids, APP_SECTIONS);
