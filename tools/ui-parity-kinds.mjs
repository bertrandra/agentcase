// The element kinds of SECTION CONTENT compared by tools/ui-parity-sections.mjs: per kind a legacy selector (scoped to the section element
// `#<id>`) and its counterpart in the new build (scoped to `.ac-section`). `:scope` is the section element itself.
// `state`: 'help' = measured after the section's "?" button opened the explainer; 'hover' / 'focus' = after hovering / focusing the element.
// Most kinds only look at PLAIN instances (no inline font / colour / background / padding / border / margin override): an inline override is a
// per-section decision of the section's own markup (legacy and new alike), the shared stylesheet is what this check holds to parity.
// `skip`: properties that are structural for this kind (listed on purpose, never to hide a visual difference).
export const SPROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'textDecorationLine', 'color', 'backgroundColor', 'backgroundImage',
  'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRightWidth', 'borderRightStyle', 'borderRightColor', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
  'borderTopLeftRadius', 'borderBottomRightRadius', 'boxShadow', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'opacity', 'cursor', 'whiteSpace',
  'outlineStyle', 'outlineWidth'];

const NOT = ['font', 'color', 'background', 'padding', 'border', 'margin', 'text-transform', 'width', 'opacity', 'cursor', 'line-height', 'letter-spacing'].map((p) => `:not([style*="${p}"])`).join('');
/** Appends the plain-instance filter to every alternative of a comma list. */
const plain = (...alts) => alts.map((a) => a + NOT).join(', ');
const OUT = ':not(.sec-help-panel *)';   // legacy: the explainer lives in the (hidden) help panel and has its own kinds
const LCTX = ':not(.insight-box *):not(.note-green *):not(.note-blue *)', NCTX = ':not(.ac-callout *):not(.ac-zone > p.ac-muted:first-child *)';   // inline text inside a note inherits the note's own size / line-height
const T = 'table:not(.depmatrix):not(.artifact-run-table)';
const ALIGN = ['textAlign'];   // the alignment of a header / cell is the column's data decision: numeric alignment has its own kinds
const HELPPOS = ['marginTop', 'marginLeft'];   // where the "?" sits in the title row (legacy: next to the tag badge, new: right edge)

export const KINDS = [
  // section container, title, help button
  { kind: 'section', legacy: ':scope', current: ':scope', skip: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] },
  { kind: 'title', legacy: ':scope > h2', current: ':scope h1' },
  { kind: 'title:help-btn', legacy: '.sec-help-btn', current: '.ac-help-btn', skip: HELPPOS },
  { kind: 'title:help-btn:hover', legacy: '.sec-help-btn', current: '.ac-help-btn', state: 'hover', skip: HELPPOS },
  // subtitles / headings
  { kind: 'h3', legacy: plain(`h3${OUT}`), current: plain('.ac-panel > header > h2') },
  { kind: 'h4', legacy: plain(`h4${OUT}:not(.dash-card h4)`), current: plain('.ac-panel h3'), skip: ALIGN },
  // intro notes and callouts
  { kind: 'note', legacy: plain(`.insight-box${OUT}`), current: plain('.ac-zone > p.ac-muted:first-child', '.ac-callout:not(.ac-callout-warn):not(.ac-callout-error):not(.ac-callout-green):not(.ac-callout-blue)') },
  { kind: 'note-green', legacy: plain(`.note-green${OUT}`), current: plain('.ac-callout-green') },
  { kind: 'note-blue', legacy: plain(`.note-blue${OUT}`), current: plain('.ac-callout-blue') },
  // cards / tiles
  { kind: 'card', legacy: plain(`.card:not(.metric)${OUT}`), current: plain('.ac-card') },
  { kind: 'metric-band', legacy: plain('.summary-band'), current: plain('.ac-stat-row') },
  { kind: 'metric-tile', legacy: plain('.sb-item'), current: plain('.ac-stat') },
  { kind: 'metric-label', legacy: plain('.sb-label'), current: plain('.ac-stat-l') },
  { kind: 'metric-value', legacy: plain('.sb-value'), current: plain('.ac-stat[data-tone=blue] .ac-stat-v') },
  // tabs
  { kind: 'tabs', legacy: plain('.pm-subtabs'), current: plain('.ac-tabs') },
  { kind: 'tab', legacy: '.pm-subtab-btn:not(.active)', current: '.ac-tabs button[aria-selected=false]' },
  { kind: 'tab:selected', legacy: '.pm-subtab-btn.active', current: '.ac-tabs button[aria-selected=true]' },
  { kind: 'tab:hover', legacy: '.pm-subtab-btn:not(.active)', current: '.ac-tabs button[aria-selected=false]', state: 'hover' },
  // tables
  { kind: 'table', legacy: plain(T + OUT), current: plain('.ac-table') },
  { kind: 'table:th', legacy: plain(`${T} th`), current: plain('.ac-table th'), skip: ALIGN },
  { kind: 'table:td', legacy: plain(`${T} td:not([class]):not(:first-child)`), current: plain('.ac-table td:not([class]):not(:first-child)'), skip: ALIGN },
  { kind: 'table:td-right', legacy: plain(`${T} td.text-right`), current: plain('.ac-table td[style*="text-align: right"]') },
  { kind: 'table:td-center', legacy: plain(`${T} td.text-center`), current: plain('.ac-table td[style*="text-align: center"]') },
  { kind: 'table:th-right', legacy: plain(`${T} th.text-right`), current: plain('.ac-table th[style*="text-align: right"]') },
  { kind: 'table:row-odd', legacy: `${T} tbody tr:not([class]):not([style]):nth-child(odd)`, current: '.ac-table tbody tr:not([class]):not([style]):nth-child(odd)' },
  { kind: 'table:row-even', legacy: `${T} tbody tr:not([class]):not([style]):nth-child(even)`, current: '.ac-table tbody tr:not([class]):not([style]):nth-child(even)' },
  { kind: 'table:row-hover', legacy: `${T} tbody tr:not([class]):not([style]):nth-child(odd)`, current: '.ac-table tbody tr:not([class]):not([style]):nth-child(odd)', state: 'hover' },
  // forms
  { kind: 'form:group', legacy: plain('.form-group'), current: plain('.ac-field') },
  { kind: 'form:label', legacy: plain('.form-group > label'), current: plain('.ac-field-l') },
  { kind: 'form:input', legacy: plain('input[type=number]:not(.team-row *)'), current: plain('.ac-field input[type=number]'), skip: ALIGN },
  { kind: 'form:select', legacy: plain(`select${OUT}:not(.team-row *)`), current: plain('.ac-field select') },
  { kind: 'form:range', legacy: plain('input[type=range]:not(:disabled)'), current: plain('input[type=range]:not(:disabled)') },
  { kind: 'form:checkbox', legacy: plain('input[type=checkbox]'), current: plain('input[type=checkbox]') },
  { kind: 'form:check-label', legacy: plain('label:has(> input[type=checkbox]):not(.mp-metrics *)'), current: plain('label.ac-check'), skip: ['textTransform', 'letterSpacing', 'cursor'] },   // legacy checkbox labels are mostly inline-styled sentence case: size / weight / colour are held
  { kind: 'form:input:focus', legacy: plain('input[type=number]:not(.team-row *)'), current: plain('.ac-field input[type=number]'), state: 'focus', skip: ALIGN },
  // buttons
  { kind: 'btn:primary', legacy: plain('.btn-primary'), current: plain('.ac-btn-primary') },
  { kind: 'btn:primary:hover', legacy: plain('.btn-primary'), current: plain('.ac-btn-primary'), state: 'hover' },
  { kind: 'btn:secondary', legacy: plain('.btn:not(.btn-primary):not(.btn-add):not(.btn-del)'), current: plain('.ac-btn:not(.ac-btn-primary)') },
  { kind: 'btn:secondary:hover', legacy: plain('.btn:not(.btn-primary):not(.btn-add):not(.btn-del)'), current: plain('.ac-btn:not(.ac-btn-primary)'), state: 'hover' },
  { kind: 'btn:disabled', legacy: plain('.btn:disabled:not(.btn-primary)'), current: plain('.ac-btn:disabled:not(.ac-btn-primary)') },
  // badges and legends
  { kind: 'badge:teal', legacy: plain('.badge.va' + LCTX, '.badge.run' + LCTX, '.badge.auto' + LCTX), current: plain('.ac-badge[data-tone=teal]' + NCTX), skip: ALIGN },
  { kind: 'badge:brick', legacy: plain('.badge.nva' + LCTX, '.badge.human' + LCTX), current: plain('.ac-badge[data-tone=brick]' + NCTX), skip: ALIGN },
  { kind: 'badge:amber', legacy: plain('.badge.nvan' + LCTX, '.badge.sup' + LCTX, '.badge.assist' + LCTX), current: plain('.ac-badge[data-tone=amber]' + NCTX), skip: ALIGN },
  { kind: 'badge:blue', legacy: plain('.badge.dev' + LCTX, '.badge.local' + LCTX), current: plain('.ac-badge[data-tone=blue]' + NCTX), skip: ALIGN },
  { kind: 'badge:grey', legacy: plain('.badge.setup' + LCTX, '.badge.off' + LCTX), current: plain('.ac-badge[data-tone=grey]' + NCTX), skip: ALIGN },
  { kind: 'legend', legacy: plain('.legend'), current: plain('.ac-legend') },
  { kind: 'legend:item', legacy: plain('.legend-item'), current: plain('.ac-leg-head') },
  { kind: 'legend:swatch', legacy: '.legend-color', current: '.ac-leg-sw', skip: ['backgroundColor'] },
  // charts, links, code
  { kind: 'chart', legacy: plain('.chart-wrapper'), current: plain('.ac-chart'), skip: [] },
  { kind: 'link', legacy: plain(`a${OUT}${LCTX}`), current: plain('a' + NCTX, '.ac-golink' + NCTX, '.ac-link' + NCTX), skip: ALIGN },
  { kind: 'code', legacy: plain(`code${OUT}${LCTX}`), current: plain('code' + NCTX), skip: ALIGN },
  { kind: 'toast', legacy: '#advToast', current: '.ac-live', state: 'global' },   // measured once, right after the case was opened
  // the explainer (help panel open)
  { kind: 'help:panel', legacy: '.sec-help-panel', current: '.ac-help', state: 'help' },
  { kind: 'help:body', legacy: '.explainer', current: '.ac-rich', state: 'help' },
  { kind: 'help:h3', legacy: '.explainer h3', current: '.ac-rich h2', state: 'help' },
  { kind: 'help:p', legacy: plain('.explainer > p'), current: plain('.ac-help > p', '.ac-rich > p'), state: 'help' },
  { kind: 'help:li', legacy: '.explainer li', current: '.ac-help li, .ac-rich li', state: 'help' },
  { kind: 'help:ul', legacy: '.explainer > ul', current: '.ac-help > ul, .ac-rich > ul', state: 'help' },
  { kind: 'help:formula', legacy: '.explainer .formula', current: '.ac-rich-formula', state: 'help' },
  { kind: 'help:worked', legacy: '.explainer .worked', current: '.ac-rich-worked', state: 'help' },
  { kind: 'help:note-green', legacy: '.explainer .note-green', current: '.ac-rich-note-green', state: 'help' },
  { kind: 'help:card', legacy: '.explainer .card', current: '.ac-rich-card', state: 'help' },
];
