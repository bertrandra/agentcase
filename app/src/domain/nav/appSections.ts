/** @calc-zone workspace-config */
import type { PersonaLists } from './layout';

/**
 * App sections (catalogue `app: true`, e.g. 🎨 Brand & theme, DEV-APP-SECTION-PERSONAS) have no legacy equivalent, so they never enter the case's
 * legacy-shaped `PERSONA_SECTIONS`. Who sees one is its catalogue default (`personas`) unless the case overrides it per persona in the optional
 * `PERSONA_APP_SECTIONS` = { persona: { appSectionId: shown } }. Absent key / persona / section = the catalogue default (the build before lot 7).
 * An app section a persona's legacy list already names (added by hand before lot 7) counts as part of its default.
 */
export interface AppSectionDef { id: string; personas?: readonly string[] }
export type AppOverrides = Record<string, Record<string, boolean>>;

/** The overrides of a case, read defensively (only `true` / `false` values count; anything else is the default). */
export function readAppOverrides(raw: unknown): AppOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: AppOverrides = {};
  for (const [p, m] of Object.entries(raw as Record<string, unknown>)) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
    const ok = Object.entries(m as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean') as [string, boolean][];
    if (ok.length) out[p] = Object.fromEntries(ok);
  }
  return out;
}

/** Shown without an override: named by the catalogue entry, or already in the persona's legacy list. */
export const appDefault = (s: AppSectionDef, persona: string, list: readonly string[] = []): boolean =>
  list.includes(s.id) || (s.personas ?? []).includes(persona);

/** Does this persona's menu show the app section? */
export const appSectionShown = (s: AppSectionDef, persona: string, list: readonly string[] | undefined, ov: AppOverrides): boolean =>
  ov[persona]?.[s.id] ?? appDefault(s, persona, list);

/** The persona lists with the app sections resolved: appended after the case's own sections when shown, dropped when hidden. */
export function withAppSections(lists: PersonaLists, apps: readonly AppSectionDef[], ov: AppOverrides = {}): PersonaLists {
  const out: PersonaLists = { ...lists };
  for (const [p, list] of Object.entries(lists)) {
    let l = list;
    for (const s of apps) {
      const on = appSectionShown(s, p, list, ov), has = l.includes(s.id);
      if (on && !has) l = [...l, s.id];
      else if (!on && has) l = l.filter((x) => x !== s.id);
    }
    out[p] = l;
  }
  return out;
}

/**
 * The overrides once `persona` shows (`on`) or hides the app section `s`; normalised: an entry equal to the default is dropped, an empty persona is
 * dropped, and `undefined` means "no override left" (the caller removes the key, so a case edited back to its defaults saves as before).
 */
export function nextAppOverrides(ov: AppOverrides, s: AppSectionDef, persona: string, list: readonly string[] | undefined,
  on: boolean): AppOverrides | undefined {
  const mine = Object.fromEntries(Object.entries(ov[persona] ?? {}).filter(([k]) => k !== s.id));
  if (on !== appDefault(s, persona, list)) mine[s.id] = on;
  const rest = Object.entries(ov).filter(([p]) => p !== persona);
  const next = Object.fromEntries(Object.keys(mine).length ? [...rest, [persona, mine]] : rest) as AppOverrides;
  return Object.keys(next).length ? next : undefined;
}

/** Split a whole menu (ids in order) into its legacy part and the app sections it names. */
export function splitMenu(ids: readonly string[], apps: readonly AppSectionDef[]): { legacy: string[]; app: Set<string> } {
  const appIds = new Set(apps.map((s) => s.id));
  return { legacy: ids.filter((id) => !appIds.has(id)), app: new Set(ids.filter((id) => appIds.has(id))) };
}
