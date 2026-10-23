/** @calc-zone presentation */
/**
 * The built-in themes (docs/THEME.md §8.3): protected (they can be activated and duplicated, never edited or deleted), sequence ids 1-7.
 * 1 Capgemini is the default look and has no override at all. Colours are generic colour themes: no company logo, typeface or trademark styling.
 * Every built-in except Rainbow passes the contrast test in each display mode x contrast level (tests/ui/theme-catalogue.test.ts).
 */
import type { ThemeDef } from './themeDef';

const def = (seq: number, id: string, name: string, description: string, colours: ThemeDef['colours'], extra: Partial<ThemeDef> = {}): ThemeDef =>
  Object.freeze({ seq, id, name, builtin: true, description, colours: Object.freeze(colours), axes: Object.freeze({}), ...extra });

export const BUILTIN_THEMES: readonly ThemeDef[] = Object.freeze([
  def(1, 'capgemini', 'Capgemini', 'The default look: brand blue, navy header and KPI bar.', {}),
  def(2, 'orange', 'Orange', 'Orange accents on a charcoal header, white surfaces.', {
    primary: '#b84a00', slate: '#5f6166', 'header-start': '#2b2b2b', 'header-end': '#111111', 'kpibar-start': '#b84a00', 'kpibar-end': '#8a3600',
    'sidebar-group-text': '#1f1f1f', 'table-head-bg': '#2b2b2b', 'chart-cat-1': '#b84a00', 'chart-cat-6': '#5f6166',
  }),
  def(3, 'sprint', 'Sprint', 'Green brand colour on the header, the KPI bar and the table heads.', {
    primary: '#16693a', 'header-start': '#16693a', 'header-end': '#0b3d20', 'kpibar-start': '#16693a', 'kpibar-end': '#0f5129', 'sidebar-group-text': '#0b3d20',
  }),
  def(4, 'rainbow', 'Rainbow', 'Diagnostic: every screen zone is painted a distinct vivid colour, to see which token paints what. Not meant for presenting.', {
    primary: '#7b1fa2', 'header-start': '#c62828', 'header-end': '#b71c1c', 'header-text': '#ffffff', 'kpibar-start': '#ff9800', 'kpibar-end': '#ffb300', 'kpibar-text': '#000000',
    'sidebar-bg': '#fff59d', 'sidebar-text': '#212121', 'sidebar-group-bg': '#c5e1a5', 'sidebar-group-text': '#1b5e20', selected: '#00838f',
    bg: '#b2ebf2', 'surface-raised': '#f3e5f5', surface: '#ffffff', 'line-strong': '#2e7d32', 'table-head-bg': '#1565c0', 'table-head-text': '#ffffff', 'table-stripe': '#fce4ec',
    focus: '#d500f9', 'chart-cat-1': '#e53935', 'chart-cat-2': '#fb8c00', 'chart-cat-3': '#c0a000', 'chart-cat-4': '#43a047', 'chart-cat-5': '#00acc1', 'chart-cat-6': '#1e88e5',
    'chart-cat-7': '#5e35b1', 'chart-cat-8': '#d81b60',
  }, { diagnostic: true }),
  def(5, 'sepia', 'Sepia', 'Warm paper tones, brown ink and low-saturation charts: easy on the eyes for long reading.', {
    primary: '#7a4a24', neutral: '#3b2e22', slate: '#76664f', bg: '#f3ead7', surface: '#fbf6ea', 'surface-raised': '#fffaf0', 'header-start': '#6b4423', 'header-end': '#3a2412',
    'kpibar-start': '#6b4423', 'kpibar-end': '#4e3019', 'sidebar-bg': '#fbf6ea', 'sidebar-group-bg': '#efe3cb', 'sidebar-group-text': '#3a2412', 'table-stripe': '#f6efe0',
    'chart-cat-1': '#7a4a24', 'chart-cat-2': '#4f7068', 'chart-cat-3': '#a0632b', 'chart-cat-4': '#6e5a80', 'chart-cat-5': '#4d6a85', 'chart-cat-6': '#8a7a3a',
    'chart-cat-7': '#94505a', 'chart-cat-8': '#5f7a45',
  }),
  def(6, 'dark-red', 'Dark red', 'Burgundy primary colour, header and KPI bar.', {
    primary: '#8b1a2b', 'header-start': '#8b1a2b', 'header-end': '#3d0a12', 'kpibar-start': '#8b1a2b', 'kpibar-end': '#6a1220', 'sidebar-group-text': '#3d0a12',
  }),
  def(7, 'purple', 'Purple', 'Violet primary colour, header and KPI bar.', {
    primary: '#5b2a9e', 'header-start': '#5b2a9e', 'header-end': '#25104a', 'kpibar-start': '#5b2a9e', 'kpibar-end': '#43207a', 'sidebar-group-text': '#25104a',
  }),
]);

/** The zones Rainbow paints, for its legend (zone → the token that paints it). */
export const RAINBOW_ZONES: readonly (readonly [zone: string, token: string])[] = [
  ['Header banner', 'header-start'], ['KPI bar', 'kpibar-start'], ['Sidebar navigation', 'sidebar-bg'], ['Sidebar group bar', 'sidebar-group-bg'],
  ['Selected menu item', 'selected'], ['Work area background', 'bg'], ['Section card', 'surface-raised'], ['Callouts, buttons, links, key figures', 'primary-700'],
  ['Table head', 'table-head-bg'], ['Table stripes', 'table-stripe'], ['Inputs and cards (border)', 'line-strong'], ['Focus ring', 'focus'],
  ['Chart series 1-8', 'chart-cat-1'],
];
