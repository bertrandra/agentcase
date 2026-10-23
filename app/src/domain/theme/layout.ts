/** @calc-zone presentation */
/**
 * Default theme, the tokens the T3 axes switch (docs/THEME.md §6): block spacing, box style, button and control shape, key-figure sizes, numeric
 * figures. Each default is the value the rules held as a literal or as another token before T3, so the default look is unchanged.
 */
export const LAYOUT = {
  // spacing between blocks (density): below cards, tables, charts, callouts and the stat band; below the section title and each form field; form-row gap
  'space-block': '1.5rem', 'space-heading': '1.5rem', 'space-field': '1.25rem', 'space-row': '12px',
  // box style of cards, KPI tiles, charts: border width, shadow, fill; the coloured left bar of callouts
  'box-border': '{border-thin}', 'box-shadow': '{shadow-none}', 'box-bg': '{surface-raised}', 'callout-rail': '{border-rail}',
  // control shape: buttons (pill option) and the border of inputs (kept visible when the border axis is "none")
  'radius-button': '{radius-md}', 'radius-pill': '999px', 'border-control': '{border-thin}',
  // typography: key figures (stat band, KPI bar), display weight (brand title, big scores), numeric figures (tables, stats)
  'font-size-figure': '{font-size-4xl}', 'font-size-kpi': '{font-size-2xl}', 'font-weight-display': '{font-weight-light}', 'numeric-figures': 'normal',
} as const;
