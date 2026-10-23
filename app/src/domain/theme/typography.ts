/** @calc-zone presentation */
/**
 * Token values of the typography axes (docs/THEME.md §6): body, heading and numeric fonts, size scale, display weight. The app is offline and its
 * gzip budget is full, so the only embedded family stays Ubuntu (fonts.css); the other choices are system stacks that every platform resolves locally.
 */
import { TYPE } from './shape';
import type { TokenSet } from './variants';

/** Font stacks offered by the axes. `ubuntu` is the legacy stack (embedded faces); the others use fonts installed with the operating system. */
export const FONT_STACKS = {
  ubuntu: TYPE['font-body'],
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

/** Body text (every section, the shell, the controls that inherit the font). */
export const FONT_BODY = {
  ubuntu: {},
  system: { 'font-body': FONT_STACKS.system },
  serif: { 'font-body': FONT_STACKS.serif },
} satisfies Record<string, TokenSet>;

/** Headings (section titles, panel titles, the brand title): the body font by default, or a stack of their own. */
export const FONT_HEADING = {
  body: {},
  ubuntu: { 'font-heading': FONT_STACKS.ubuntu },
  system: { 'font-heading': FONT_STACKS.system },
  serif: { 'font-heading': FONT_STACKS.serif },
} satisfies Record<string, TokenSet>;

/** Figures in tables, the stat band and the KPI bar: the body font as is, the body font with tabular (fixed-width) figures, or monospace numbers. */
export const FONT_NUMERIC = {
  body: {},
  tabular: { 'numeric-figures': 'tabular-nums' },
  mono: { 'font-numeric': FONT_STACKS.mono, 'numeric-figures': 'tabular-nums' },
} satisfies Record<string, TokenSet>;

const SIZES = Object.entries(TYPE).filter(([n, v]) => n.startsWith('font-size-') && /^[\d.]+(px|rem)$/.test(v));
/** Every font size × `k`, rounded to the half pixel (rem to the hundredth), so the size ladder keeps its order. */
function scaled(k: number): TokenSet {
  return Object.fromEntries(SIZES.map(([n, v]) => {
    const x = parseFloat(v), rem = v.endsWith('rem');
    return [n, rem ? `${Math.round(x * k * 100) / 100}rem` : `${Math.round(x * k * 2) / 2}px`];
  }));
}
/** Size scale: compact (×0.92), normal (the legacy sizes), large (×1.12). */
export const TYPE_SCALE = { compact: scaled(0.92), normal: {}, large: scaled(1.12) } satisfies Record<string, TokenSet>;

/** Display weight (the brand title, the big score figures): light (the legacy 300) or bold. */
export const HEADING_WEIGHT = { light: {}, bold: { 'font-weight-display': '{font-weight-bold}' } } satisfies Record<string, TokenSet>;
