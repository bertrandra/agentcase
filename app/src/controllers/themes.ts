/** @calc-zone workspace-config */
/**
 * The theme library of the case (docs/THEME.md §8.4): undoable commands on `THEMES` (the user themes), `ACTIVE_THEME` and `THEME_SEQ`. Built-in
 * themes are protected (activate and duplicate only). A sequence id is issued once per case and never reused, even after a delete.
 */
import { AXES, AXIS_NAMES, isAxisValue, type AxisName } from '@/domain/theme/axes';
import { activeSeq, findTheme, isBuiltinSeq, nextSeq, uniqueName, userThemes, type ThemeContent } from '@/domain/theme/library';
import { cleanName, isColourKey, MAX_USER_THEMES, normHex, type ColourKey, type ThemeDef } from '@/domain/theme/themeDef';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** A stored user theme (what `doc.THEMES` holds). */
type Stored = Pick<ThemeDef, 'seq' | 'name' | 'colours' | 'axes'> & { description?: string };
const stored = (d: Doc): Stored[] => userThemes(d).map((t) => ({ seq: t.seq, name: t.name, ...(t.description ? { description: t.description } : {}), colours: { ...t.colours }, axes: { ...t.axes } }));
/** Add themes with fresh sequence ids (returns nothing when the library is full). */
function append(d: Doc, items: ThemeContent[]): void {
  const list = stored(d);
  for (const c of items) {
    if (list.length >= MAX_USER_THEMES) break;
    const seq = nextSeq({ ...d, THEMES: list });
    list.push({ seq, name: uniqueName({ THEMES: list }, c.name), ...(c.description ? { description: c.description } : {}), colours: { ...c.colours }, axes: { ...c.axes } });
    d.THEME_SEQ = seq;
  }
  d.THEMES = list;
}
const edit = (d: Doc, seq: number, f: (t: Stored) => void): void => {
  if (isBuiltinSeq(seq)) return;
  const list = stored(d), t = list.find((x) => x.seq === seq);
  if (!t) return;
  f(t);
  d.THEMES = list;
};

const addCmd = defineCommand<{ name: string }>({
  type: 'theme.add', label: (p) => `Create the theme ${p.name}`,
  run(d, p) { append(d, [{ name: p.name, colours: {}, axes: {} }]); },
});
const duplicateCmd = defineCommand<{ seq: number }>({
  type: 'theme.duplicate', label: (p) => `Duplicate the theme ${p.seq}`,
  run(d, p) { const src = findTheme(d, p.seq); if (src) append(d, [{ name: `${src.name} copy`, description: src.description, colours: src.colours, axes: src.axes }]); },
});
const importCmd = defineCommand<{ themes: ThemeContent[] }>({
  type: 'theme.import', label: (p) => `Import ${p.themes.length} theme${p.themes.length === 1 ? '' : 's'}`,
  run(d, p) { append(d, p.themes); },
});
const renameCmd = defineCommand<{ seq: number; name: string }>({
  type: 'theme.rename', label: (p) => `Rename the theme ${p.seq} to ${p.name}`,
  run(d, p) { const name = cleanName(p.name); if (name) edit(d, p.seq, (t) => { t.name = name; }); },
});
/** Colour / axis edits: a value sets the override, null removes it (back to the default look). Drags of one control coalesce into one step. */
export interface ThemePatch { colours?: Partial<Record<ColourKey, string | null>>; axes?: Partial<Record<AxisName, string | null>> }
const updateCmd = defineCommand<{ seq: number; patch: ThemePatch }>({
  type: 'theme.update', label: (p) => `Edit the theme ${p.seq}: ${[...Object.keys(p.patch.colours ?? {}), ...Object.keys(p.patch.axes ?? {})].join(', ')}`,
  coalesceKey: (p) => {   // a picker drag is one step; a reset (null) is a step of its own
    const reset = [...Object.values(p.patch.colours ?? {}), ...Object.values(p.patch.axes ?? {})].includes(null);
    return `theme.update:${p.seq}:${[...Object.keys(p.patch.colours ?? {}), ...Object.keys(p.patch.axes ?? {})].join(',')}${reset ? ':reset' : ''}`;
  },
  run(d, p) {
    edit(d, p.seq, (t) => {
      for (const [k, v] of Object.entries(p.patch.colours ?? {})) {
        if (!isColourKey(k)) continue;
        const hex = normHex(v);
        if (v === null) delete t.colours[k]; else if (hex) t.colours[k] = hex;
      }
      const axes = t.axes as Record<string, string>;
      for (const [k, v] of Object.entries(p.patch.axes ?? {})) {
        if (!(AXIS_NAMES as string[]).includes(k)) continue;
        const a = k as AxisName;
        if (v === null || v === AXES[a].default) delete axes[a]; else if (isAxisValue(a, v)) axes[a] = v;
      }
    });
  },
});
const deleteCmd = defineCommand<{ seq: number }>({
  type: 'theme.delete', label: (p) => `Delete the theme ${p.seq}`,
  run(d, p) {
    if (isBuiltinSeq(p.seq)) return;
    if (activeSeq(d) === p.seq) delete d.ACTIVE_THEME;   // the case falls back to the default theme
    d.THEMES = stored(d).filter((t) => t.seq !== p.seq);
  },
});
const activateCmd = defineCommand<{ seq: number }>({
  type: 'theme.activate', label: (p) => `Use the theme ${p.seq} for this case`,
  run(d, p) { if (!findTheme(d, p.seq)) return; if (p.seq === 1) delete d.ACTIVE_THEME; else d.ACTIVE_THEME = p.seq; },   // the default theme = no key (older files unchanged)
});

const go = <P>(c: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(c(p));
export const addTheme = (name: string): void => go(addCmd, { name });
export const duplicateTheme = (seq: number): void => go(duplicateCmd, { seq });
export const importThemes = (themes: ThemeContent[]): void => go(importCmd, { themes });
export const renameTheme = (seq: number, name: string): void => go(renameCmd, { seq, name });
export const updateTheme = (seq: number, patch: ThemePatch): void => go(updateCmd, { seq, patch });
export const deleteTheme = (seq: number): void => go(deleteCmd, { seq });
export const activateTheme = (seq: number): void => go(activateCmd, { seq });
/** The sequence id the last add / duplicate / import issued (the screen selects it). */
export const lastIssuedSeq = (): number => Number(appStore().getState().doc.THEME_SEQ) || 0;
