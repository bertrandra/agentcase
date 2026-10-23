/** @calc-zone presentation */
/**
 * A theme of the library (docs/THEME.md §8): a sequence id (`?theme=<seq>`), a name, colour overrides and theme axes. The colours are either a
 * scale ANCHOR (the whole 9-step family is derived from it, `derive.ts`) or a ROLE set directly (header gradient, KPI bar, sidebar, table head,
 * business colours, chart series). An empty theme is the default look, token for token.
 */
import type { ThemeAxes } from './axes';
import type { TokenName } from './index';

/** The scale step each family's anchor colour sits on (the brand colour of the default look). */
export const SCALE_ANCHORS = { primary: 700, secondary: 600, info: 700, teal: 700, success: 600, warning: 600, danger: 800, neutral: 900, slate: 700 } as const;
export type ScaleKey = keyof typeof SCALE_ANCHORS;
export const SCALE_KEYS = Object.keys(SCALE_ANCHORS) as ScaleKey[];

/** The roles a theme may set directly, grouped as the Brand & theme editor shows them. */
export const ROLE_GROUPS = {
  Surfaces: ['bg', 'surface', 'surface-raised', 'line-strong'],
  'Header and KPI bar': ['header-start', 'header-end', 'header-text', 'kpibar-start', 'kpibar-end', 'kpibar-text'],
  Navigation: ['sidebar-bg', 'sidebar-text', 'sidebar-group-bg', 'sidebar-group-text', 'selected'],
  Tables: ['table-head-bg', 'table-head-text', 'table-stripe'],
  'Text and focus': ['ink', 'text-heading', 'text-link', 'focus'],
  'Business colours': ['automation', 'glass-ceiling', 'human-supervision'],
  Charts: ['chart-cat-1', 'chart-cat-2', 'chart-cat-3', 'chart-cat-4', 'chart-cat-5', 'chart-cat-6', 'chart-cat-7', 'chart-cat-8'],
} as const satisfies Record<string, readonly TokenName[]>;
export type RoleKey = (typeof ROLE_GROUPS)[keyof typeof ROLE_GROUPS][number];
export const ROLE_KEYS = Object.values(ROLE_GROUPS).flat() as RoleKey[];
export type ColourKey = ScaleKey | RoleKey;
export const COLOUR_KEYS: readonly ColourKey[] = [...SCALE_KEYS, ...ROLE_KEYS];
export type ThemeColours = Partial<Record<ColourKey, string>>;

export interface ThemeDef {
  /** stable sequence id, unique in a case and never reused: built-ins 1-7, user themes from 100 */
  seq: number;
  id: string;
  name: string;
  builtin: boolean;
  /** shown on the screen (Rainbow is a diagnostic theme: its contrast is not checked) */
  diagnostic?: boolean;
  description?: string;
  colours: ThemeColours;
  axes: Partial<ThemeAxes>;
}

export const DEFAULT_SEQ = 1;
export const FIRST_USER_SEQ = 100;
export const MAX_USER_THEMES = 50;
export const NAME_MAX = 60;

/** `#rgb` / `#rrggbb` (any case) as lowercase `#rrggbb`; null for anything else. */
export function normHex(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  return '#' + h.toLowerCase();
}
export const isColourKey = (k: string): k is ColourKey => (COLOUR_KEYS as readonly string[]).includes(k);
export const isScaleKey = (k: string): k is ScaleKey => Object.hasOwn(SCALE_ANCHORS, k);
/* eslint-disable-next-line no-control-regex -- control characters are stripped from a name read from a file */
export const cleanName = (v: unknown): string => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
