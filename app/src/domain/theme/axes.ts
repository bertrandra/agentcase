/** @calc-zone presentation */
/**
 * The theme axes (docs/THEME.md §6): shape, box style, density, typography and control variants. Each axis has a closed list of values, a default
 * (the legacy look) and, per value, the tokens it changes. The CSS side is a `data-ac-<axis>` attribute on `:root` (or on any element, for a
 * scoped preview) selecting a generated block of `axes.css`; the TS side (`tok()`) gets the same values from `axisTokens()` in the base table (`themeBase`).
 * A theme screen (T4) only sets values on a `ThemeAxes` object.
 */
import { BORDER, BOX, BUTTONS, CALLOUT, DENSITY_SETS, RADIUS, SHADOW, type TokenSet } from './variants';
import { FONT_BODY, FONT_HEADING, FONT_NUMERIC, HEADING_WEIGHT, TYPE_SCALE } from './typography';

/** Control variants carry no token: the shared Field* components read the axis and render the variant (src/ui/widgets/field). */
const NONE = <K extends string>(...keys: K[]): Record<K, TokenSet> => Object.fromEntries(keys.map((k) => [k, {}])) as Record<K, TokenSet>;

interface Axis<V extends string> { group: string; label: string; default: V; values: Record<V, TokenSet>; labels: Record<V, string> }
const axis = <V extends string>(group: string, label: string, def: NoInfer<V>, values: Record<V, TokenSet>, labels: Record<V, string>): Axis<V> => ({ group, label, default: def, values, labels });

export const AXES = {
  radius: axis('Shape', 'Corner radius', 'soft', RADIUS, { square: 'Square', soft: 'Soft', round: 'Round' }),
  buttons: axis('Shape', 'Buttons', 'shape', BUTTONS, { shape: 'Follow the corner radius', pill: 'Pill' }),
  border: axis('Shape', 'Border width', 'thin', BORDER, { none: 'None', thin: 'Thin', strong: 'Strong' }),
  shadow: axis('Shape', 'Shadows', 'light', SHADOW, { none: 'None', light: 'Light', floating: 'Floating' }),
  box: axis('Box style', 'Cards, tiles and charts', 'outline', BOX, { flat: 'Flat (fill)', outline: 'Outline', elevated: 'Elevated (shadow)' }),
  callout: axis('Box style', 'Callouts', 'bar', CALLOUT, { bar: 'Left accent bar', tint: 'Tinted fill' }),
  density: axis('Density', 'Density', 'comfortable', DENSITY_SETS, { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious (presentation)' }),
  fontBody: axis('Typography', 'Body font', 'ubuntu', FONT_BODY, { ubuntu: 'Ubuntu', system: 'System UI', serif: 'Serif' }),
  fontHeading: axis('Typography', 'Heading font', 'body', FONT_HEADING, { body: 'Same as body', ubuntu: 'Ubuntu', system: 'System UI', serif: 'Serif' }),
  fontNumeric: axis('Typography', 'Numbers', 'body', FONT_NUMERIC, { body: 'Body font', tabular: 'Tabular figures', mono: 'Monospace numbers' }),
  typeScale: axis('Typography', 'Size scale', 'normal', TYPE_SCALE, { compact: 'Compact', normal: 'Normal', large: 'Large' }),
  headingWeight: axis('Typography', 'Display weight', 'light', HEADING_WEIGHT, { light: 'Light', bold: 'Bold' }),
  controlsNumeric: axis('Controls', 'Numbers and percentages', 'auto', NONE('auto', 'number', 'slider', 'slider-field', 'stepper'),
    { auto: 'As designed', number: 'Number field', slider: 'Slider', 'slider-field': 'Slider and field', stepper: 'Stepper (− value +)' }),
  controlsChoice: axis('Controls', 'Choices (2 to 5 options)', 'auto', NONE('auto', 'dropdown', 'segmented', 'radio'),
    { auto: 'As designed', dropdown: 'Dropdown', segmented: 'Segmented buttons', radio: 'Radio group' }),
  controlsBoolean: axis('Controls', 'Yes / no', 'auto', NONE('auto', 'checkbox', 'switch'), { auto: 'As designed', checkbox: 'Checkbox', switch: 'Switch' }),
};

export type AxisName = keyof typeof AXES;
type ValuesOf<A> = A extends Axis<infer V> ? V : never;
/** One value per axis: what a theme (T4: stored in the case, edited on the Brand & theme screen) sets. */
export type ThemeAxes = { [K in AxisName]: ValuesOf<(typeof AXES)[K]> };
export const AXIS_NAMES = Object.keys(AXES) as AxisName[];
/** The legacy look: every axis at its default. */
export const AXIS_DEFAULTS = Object.freeze(Object.fromEntries(AXIS_NAMES.map((k) => [k, AXES[k].default])) as ThemeAxes);

/** `fontBody` → `data-ac-font-body`. */
export const axisAttr = (k: AxisName): string => 'data-ac-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
/** The values of an axis (in display order). */
export const axisValues = <K extends AxisName>(k: K): ThemeAxes[K][] => Object.keys(AXES[k].values) as ThemeAxes[K][];
/** Whether `v` is a value of axis `k` (an attribute or an imported theme may hold anything). */
export const isAxisValue = <K extends AxisName>(k: K, v: unknown): v is ThemeAxes[K] => typeof v === 'string' && Object.hasOwn(AXES[k].values, v);

/** The token values a set of axes changes, for the base table of a theme (chart.js, exports): later axes win on a shared token (none today). */
export function axisTokens(axes: Partial<ThemeAxes>): TokenSet {
  const out: TokenSet = {};
  for (const k of AXIS_NAMES) {
    const v = axes[k];
    if (isAxisValue(k, v)) Object.assign(out, (AXES[k].values as Record<string, TokenSet>)[v]);
  }
  return out;
}
/** The `data-ac-*` attributes of a set of axes: only the values that differ from the default (the default look carries no attribute). */
export function axisAttributes(axes: Partial<ThemeAxes>): Record<string, string> {
  return Object.fromEntries(AXIS_NAMES.filter((k) => isAxisValue(k, axes[k]) && axes[k] !== AXES[k].default).map((k) => [axisAttr(k), axes[k] as string]));
}
