/** @calc-zone exports */
import type { ThemeValues } from '@/domain/theme';
import { printTheme } from '@/domain/theme/resolve';
import { activeDoc } from '@/store/editBase';
import { themeInEffect, themeViewStore } from '@/store/themeView';

/**
 * The print theme of the exports (docs/THEME.md §8.2, §8.5): the base table of the library theme in effect — the case's active theme, or the one a
 * `?theme=` link shows — WITHOUT the viewer's display, so the Excel workbooks and the HTML report are always light. Read from the case at export time
 * and handed explicitly to the builders (no theme state in domain or store).
 */
export const exportTheme = (): Readonly<ThemeValues> => printTheme(themeInEffect(activeDoc(), themeViewStore.getState().override));
