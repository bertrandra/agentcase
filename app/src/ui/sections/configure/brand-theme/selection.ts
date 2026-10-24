import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { GeneratorSettings } from '@/domain/theme/generatorSettings';
import { paletteFromSeed, type Palette } from '@/domain/theme/palette';
import type { ThemeDef } from '@/domain/theme/themeDef';

/**
 * View state of the Brand & theme screen (never in the case): the theme selected in the library (null: the case's active one), the mode of the
 * live preview, and the palette generator's settings while the user tries them (`draft`: shown in the preview only, until Apply).
 * Kept outside the component so the selection survives leaving the section and coming back (a theme switch no longer re-mounts it, lot 5a).
 */
export interface GeneratorDraft { seq: number; settings: GeneratorSettings }
export interface BrandThemeView { selected: number | null; previewDark: boolean; draft: GeneratorDraft | null }
export const brandThemeView = createStore<BrandThemeView>(() => ({ selected: null, previewDark: false, draft: null }));
export const useBrandThemeView = <T,>(f: (s: BrandThemeView) => T): T => useSyncExternalStore(brandThemeView.subscribe, () => f(brandThemeView.getState()));
export const selectTheme = (seq: number | null): void => brandThemeView.setState({ selected: seq, draft: null });
export const setPreviewDark = (dark: boolean): void => brandThemeView.setState({ previewDark: dark });
export const setDraft = (seq: number, settings: GeneratorSettings): void => brandThemeView.setState({ draft: { seq, settings } });
export const clearDraft = (): void => brandThemeView.setState({ draft: null });

let memo: { key: string; palette: Palette } | null = null;
/** The generated palette of some settings (the last one is kept: the panel and the preview ask for the same one while a slider is dragged). */
export function generated(s: GeneratorSettings): Palette {
  const key = `${s.seed}|${s.contrast}|${s.harmony}`;
  if (memo?.key !== key) memo = { key, palette: paletteFromSeed(s.seed, s) };
  return memo.palette;
}
/** The draft settings of this theme, if the user is trying the generator on it. */
export const useDraft = (seq: number): GeneratorSettings | null => useBrandThemeView((s) => (s.draft?.seq === seq ? s.draft.settings : null));
/** The theme as the preview shows it: with the draft palette while the generator is being tried. */
export const withDraft = (def: ThemeDef, draft: GeneratorSettings | null): ThemeDef => (draft ? { ...def, colours: generated(draft) } : def);
