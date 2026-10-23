/** @calc-zone presentation */
/**
 * Default theme, semantic colour roles (docs/THEME.md). `{name}` refers to another token: the CSS becomes a `var()` of that custom property and `tok()` resolves it,
 * so a theme that changes a scale step changes every role built on it. Components use these roles where the meaning is known, the scale steps otherwise.
 */
export const ROLES = {
  // page, surfaces, lines and text
  bg: '{slate-50}', surface: '{neutral-0}', 'surface-raised': '{neutral-0}', 'surface-muted': '{neutral-25}', 'surface-tint': '{primary-60}',
  ink: '{neutral-900}', muted: '{neutral-700}', 'text-strong': '{neutral-950}', 'text-soft': '{neutral-750}', 'text-label': '{neutral-650}',
  'text-inverse': '{neutral-0}', 'text-on-primary': '{neutral-0}', 'text-link': '{primary-700}', 'text-heading': '{primary-700}',
  line: '{neutral-130}', 'line-strong': '{neutral-175}', 'line-subtle': '{neutral-125}', 'line-tint': '{primary-200}',
  focus: '{primary-700}', 'focus-header': '{focus}', hover: '{primary-60}', 'hover-text': '{primary-700}', selected: '{primary-700}', 'selected-text': '{neutral-0}',
  // header banner, KPI bar, sidebar
  'header-start': '{primary-700}', 'header-end': '{primary-975}', 'header-text': '{neutral-0}',
  'kpibar-start': '{primary-700}', 'kpibar-end': '{primary-850}', 'kpibar-text': '{neutral-0}',
  'sidebar-bg': '{neutral-0}', 'sidebar-text': '{neutral-900}', 'sidebar-item-text': '{neutral-750}', 'sidebar-group-bg': '{slate-80}',
  'sidebar-group-text': '{primary-975}', 'sidebar-group-hover-bg': '{primary-115}',
  // data tables
  'table-head-bg': '{primary-700}', 'table-head-text': '{neutral-0}', 'table-head-line': '{neutral-175}', 'table-line': '{neutral-125}',
  'table-stripe': '{neutral-25}', 'table-hover': '{primary-60}',
  // business meaning, kept across themes
  automation: '{teal-700}', 'glass-ceiling': '{danger-800}', 'human-supervision': '{warning-600}', agentic: '{secondary-600}', ai: '{info-700}', vfte: '{success-510}',
  // legacy names (v18 tokens.css), kept so older rules keep working
  blue: '{primary-700}', teal: '{teal-700}', brick: '{danger-800}', amber: '{warning-600}',
} as const;

/** Charts: categorical series, sequential and diverging ramps, gridline and axis text. */
export const CHART = {
  'chart-cat-1': '{primary-700}', 'chart-cat-2': '{teal-700}', 'chart-cat-3': '{warning-600}', 'chart-cat-4': '{secondary-600}',
  'chart-cat-5': '{info-700}', 'chart-cat-6': '{warning-590}', 'chart-cat-7': '{danger-710}', 'chart-cat-8': '{success-600}',
  'chart-seq-1': '{primary-200}', 'chart-seq-2': '{primary-350}', 'chart-seq-3': '{info-700}', 'chart-seq-4': '{primary-700}', 'chart-seq-5': '{primary-900}',
  'chart-seq-6': '{primary-400}', 'chart-seq-7': '{primary-600}', 'chart-seq-8': '{primary-825}', 'chart-seq-9': '{primary-930}', 'chart-seq-10': '{primary-960}',
  'chart-div-neg-strong': '{danger-300}', 'chart-div-neg': '{danger-200}', 'chart-div-mid': '{warning-65}', 'chart-div-pos': '{success-75}',
  'chart-grid': '{neutral-1000-a5}', 'chart-axis': '{neutral-700}',
} as const;

/** Exports: the Excel workbooks (ARGB derived by `argb()`) and the printable HTML report. */
export const EXPORT = {
  'excel-head-bg': '{primary-950}', 'excel-head-text': '{neutral-0}', 'excel-subtotal-bg': '{slate-100}', 'excel-band-bg': '{primary-150}',
  'excel-note': '{neutral-525}', 'excel-input': '{primary-695}', 'excel-border': '{neutral-200}',
  'report-ink': '{slate-950}', 'report-heading': '{primary-700}', 'report-rule': '{warning-300}', 'report-line': '{slate-200}', 'report-head-bg': '{primary-700}',
  'report-head-text': '{primary-200}', 'report-tag-bg': '{primary-200}', 'report-tag-text': '{primary-700}', 'report-note': '{neutral-505}',
  'report-font-body': 'Calibri,Arial,sans-serif', 'report-font-heading': 'Ubuntu,sans-serif',
} as const;
