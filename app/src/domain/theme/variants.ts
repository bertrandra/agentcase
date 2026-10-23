/** @calc-zone presentation */
/**
 * Token values of the shape, box-style and density axes (docs/THEME.md §6). A value set lists only the tokens it changes; the default value of each
 * axis (soft, shape, thin, light, outline, bar, comfortable) changes nothing. `{name}` refers to another token, as in the default table.
 */
import type { TokenName } from './index';

export type TokenSet = Partial<Record<TokenName, string>>;
const RADII = ['2xs', 'xs', 'sm', 'sm-plus', 'md', 'md-plus', 'lg', 'lg-plus', 'xl', 'xl-plus', '2xl', 'card'] as const;
const radii = (px: readonly number[]): TokenSet => Object.fromEntries(RADII.map((r, i) => [`radius-${r}`, `${px[i]}px`]));

/** Corner radius: square (0), soft (the legacy 6 px controls, 16 px cards), round (12 px controls, 22 px cards). The 50% circles stay round. */
export const RADIUS = {
  square: radii(RADII.map(() => 0)),
  soft: {},
  round: radii([4, 6, 8, 9, 12, 13, 14, 15, 16, 17, 20, 22]),
} satisfies Record<string, TokenSet>;

/** Buttons follow the corner radius, or are pills. */
export const BUTTONS = { shape: {}, pill: { 'radius-button': '{radius-pill}' } } satisfies Record<string, TokenSet>;

/** Border width of boxes, tables and rules; inputs keep a 1 px border when the boxes have none, so a field stays visible. */
export const BORDER = {
  none: { 'border-thin': '0px', 'border-medium': '0px', 'border-control': '1px' },
  thin: {},
  strong: { 'border-thin': '2px', 'border-medium': '2px', 'border-thick': '3px' },
} satisfies Record<string, TokenSet>;

/** Shadows of the section card, the header, the KPI bar and the toast: none, light (the legacy elevations), floating. */
export const SHADOW = {
  none: { 'shadow-card': '{shadow-none}', 'shadow-kpibar': '{shadow-none}', 'shadow-header': '{shadow-none}' },
  light: {},
  floating: { 'shadow-card': '{shadow-lg}', 'shadow-kpibar': '{shadow-lg}', 'shadow-header': '{shadow-xl}' },
} satisfies Record<string, TokenSet>;

/** Box style of cards, KPI tiles and chart frames: flat (a muted fill, no border), outline (the legacy border), elevated (a shadow, no border). */
export const BOX = {
  flat: { 'box-border': '0px', 'box-bg': '{surface-muted}' },
  outline: {},
  elevated: { 'box-border': '0px', 'shadow-box': '{shadow-card}' },
} satisfies Record<string, TokenSet>;

/** Callouts: the legacy coloured left bar, or the tinted fill alone (the bar becomes the thin border). */
export const CALLOUT = { bar: {}, tint: { 'callout-rail': '{border-thin}' } } satisfies Record<string, TokenSet>;

/** Density: paddings of sections, cards, notes, table cells (row height), controls, buttons, tabs and badges, and the spacing between blocks. */
export const DENSITY_SETS = {
  compact: {
    'pad-section': '1.25rem', 'pad-card': '.85rem', 'pad-callout': '.75rem', 'pad-table-head': '6px 8px', 'pad-table-cell': '4px 8px', 'pad-matrix-cell': '1px 3px',
    'pad-control': '5px 8px', 'pad-button': '6px 12px', 'pad-button-compact': '4px 8px', 'pad-tab': '6px 12px', 'pad-badge': '2px 7px',
    'space-block': '1rem', 'space-heading': '1rem', 'space-field': '.8rem', 'space-row': '8px',
  },
  comfortable: {},
  spacious: {
    'pad-section': '2.75rem', 'pad-card': '1.75rem', 'pad-callout': '1.4rem', 'pad-table-head': '12px 14px', 'pad-table-cell': '11px 14px', 'pad-matrix-cell': '4px 6px',
    'pad-control': '11px 14px', 'pad-button': '12px 22px', 'pad-button-compact': '8px 12px', 'pad-tab': '12px 22px', 'pad-badge': '4px 11px',
    'space-block': '2rem', 'space-heading': '2rem', 'space-field': '1.6rem', 'space-row': '16px',
    // client presentations: bigger key figures
    'font-size-figure': '{font-size-7xl}', 'font-size-kpi': '{font-size-5xl}',
  },
} satisfies Record<string, TokenSet>;
