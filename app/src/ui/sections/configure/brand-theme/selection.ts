import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/**
 * View state of the Brand & theme screen (never in the case): the theme selected in the library (null: the case's active one) and the mode of the
 * live preview. Kept outside the component so a theme switch, which re-mounts the sections, does not lose the selection.
 */
export interface BrandThemeView { selected: number | null; previewDark: boolean }
export const brandThemeView = createStore<BrandThemeView>(() => ({ selected: null, previewDark: false }));
export const useBrandThemeView = <T,>(f: (s: BrandThemeView) => T): T => useSyncExternalStore(brandThemeView.subscribe, () => f(brandThemeView.getState()));
export const selectTheme = (seq: number | null): void => brandThemeView.setState({ selected: seq });
export const setPreviewDark = (dark: boolean): void => brandThemeView.setState({ previewDark: dark });
