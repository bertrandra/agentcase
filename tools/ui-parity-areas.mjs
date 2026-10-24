// The element pairs compared by tools/ui-parity.mjs: a legacy selector, its counterpart in the new app, an optional state.
export const PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'color', 'backgroundColor', 'backgroundImage',
  'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRightWidth', 'borderRightColor', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
  'borderTopLeftRadius', 'borderBottomRightRadius', 'boxShadow', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'opacity', 'display', 'position', 'cursor', 'columnGap', 'flexDirection', 'alignItems', 'whiteSpace'];

const SIDE = 'nav[aria-label=Sections]';
export const AREAS = [
  // title / header bar
  { name: 'header', legacy: '.header', current: 'header.ac-top' },
  { name: 'header:title', legacy: '#appTitle', current: '.ac-brand', skip: ['boxW'] },   // width follows the title text (customer name, version) and the fonts installed on the machine: not a style property
  { name: 'header:control', legacy: '.scenario-bar .sc-hint', current: '.ac-top button:not([aria-label*=sidebar])', skip: ['display', 'cursor', 'boxW'] },
  { name: 'header:menu', legacy: '.scenario-bar .sc-icon-btn', current: 'button[aria-label*=sidebar]', skip: ['display', 'cursor', 'boxW', 'boxH', 'textAlign'] },
  { name: 'header:persona', legacy: '.persona-select', current: 'select[aria-label=Persona]', skip: ['boxW', 'boxH', 'display'] },   // display: a flex item is blockified, the legacy select sits in a block,
  // KPI / scenario bar
  { name: 'kpibar', legacy: '#scenarioBar', current: 'aside.ac-kpis', skip: ['boxH'] },
  { name: 'kpibar:item', legacy: '.scenario-bar > .sc-item', current: '.ac-kpi', skip: ['boxW'] },
  { name: 'kpibar:label', legacy: '.scenario-bar > .sc-item .sc-label', current: '.ac-kpi-l', skip: ['boxW'] },
  { name: 'kpibar:value', legacy: '.scenario-bar > .sc-item .sc-value', current: '.ac-kpi-v', skip: ['boxW'] },
  // sidebar
  { name: 'sidebar', legacy: '.sidebar', current: SIDE, skip: ['boxH', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop'],   // legacy pads the inner .side-nav and offsets via .container margin
    scope: 'sidebar' },
  { name: 'sidebar:group', legacy: '.side-group-label', current: `${SIDE} .ac-nav-group`, skip: ['boxW'], scope: 'sidebar' },
  { name: 'sidebar:group:hover', legacy: '.side-group-label', current: `${SIDE} .ac-nav-group`, state: 'hover', skip: ['boxW'], scope: 'sidebar' },
  { name: 'sidebar:item', legacy: '.side-item:not(.active)', current: `${SIDE} ul button:not(.is-active)`, skip: ['boxW', 'boxH'], scope: 'sidebar' },
  { name: 'sidebar:item:hover', legacy: '.side-item:not(.active)', current: `${SIDE} ul button:not(.is-active)`, state: 'hover', skip: ['boxW', 'boxH'], scope: 'sidebar' },
  { name: 'sidebar:item:active', legacy: '.side-item.active', current: `${SIDE} ul button.is-active`, skip: ['boxW', 'boxH'], scope: 'sidebar' },
];
