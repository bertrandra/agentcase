/** @calc-zone presentation */
/** Default theme: typography, shape (radius, borders, shadows), density (paddings of controls and tables) and motion (docs/THEME.md). */
export const TYPE = {
  'font-body': "'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 'font-heading': '{font-body}', 'font-numeric': '{font-body}',
  'font-mono': "'SFMono-Regular', Consolas, monospace", 'font-code': 'monospace', 'font-toast': 'Calibri, sans-serif', font: '{font-body}',
  // size scale; `-plus` is the half step above
  'font-size-3xs': '8px', 'font-size-3xs-plus': '8.5px', 'font-size-2xs': '9px', 'font-size-2xs-plus': '9.5px', 'font-size-xs': '10px', 'font-size-xs-plus': '10.5px',
  'font-size-sm': '11px', 'font-size-sm-plus': '11.5px', 'font-size-md': '12px', 'font-size-md-plus': '12.5px', 'font-size-base': '13px', 'font-size-lg': '14px',
  'font-size-xl': '15px', 'font-size-2xl': '16px', 'font-size-3xl': '18px', 'font-size-4xl': '20px', 'font-size-5xl': '22px', 'font-size-6xl': '24px',
  'font-size-7xl': '30px', 'font-size-8xl': '36px', 'font-size-9xl': '60px', 'font-size-lead': '1.05rem',
  'font-weight-light': '300', 'font-weight-regular': '400', 'font-weight-semibold': '600', 'font-weight-bold': '700', 'font-weight-extrabold': '800',
  'leading-none': '1', 'leading-tight': '1.1', 'leading-snug': '1.15', 'leading-compact': '1.3', 'leading-cozy': '1.5', 'leading-base': '1.6',
  'leading-relaxed': '1.7', 'leading-loose': '1.75', 'leading-looser': '1.85', 'leading-code': '1.9', 'leading-formula': '2',
} as const;

export const SHAPE = {
  'radius-2xs': '2px', 'radius-xs': '3px', 'radius-sm': '4px', 'radius-sm-plus': '5px', 'radius-md': '6px', 'radius-md-plus': '7px', 'radius-lg': '8px',
  'radius-lg-plus': '9px', 'radius-xl': '10px', 'radius-xl-plus': '11px', 'radius-2xl': '12px', 'radius-card': '16px', 'radius-round': '50%', radius: '{radius-md}',
  'border-thin': '1px', 'border-medium': '1.5px', 'border-thick': '2px', 'border-heavy': '3px', 'border-rail': '4px', 'focus-width': '2px',
  'shadow-none': 'none', 'shadow-sm': '0 2px 10px {primary-975-a8}', 'shadow-md': '0 2px 10px {primary-975-a22}', 'shadow-lg': '0 4px 16px {primary-975-a25}',
  'shadow-xl': '0 6px 22px {primary-965-a28}', 'shadow-card': '{shadow-sm}', 'shadow-kpibar': '{shadow-md}', 'shadow-header': '{shadow-lg}', 'shadow-toast': '{shadow-xl}',
  'shadow-focus': '0 0 0 3px {info-375-a30}', 'shadow-rail-offset': 'inset 4px 0 0', 'shadow-rail': '{shadow-rail-offset} {primary-700}', 'shadow-ring-offset': '0 0 0 1px',
  'shadow-ring': '{shadow-ring-offset} {slate-650}',
} as const;

export const DENSITY = {
  'pad-section': '2rem', 'pad-card': '1.25rem', 'pad-callout': '1.1rem', 'pad-table-head': '9px 11px', 'pad-table-cell': '8px 11px', 'pad-matrix-cell': '2px 4px',
  'pad-control': '8px 12px', 'pad-button': '9px 18px', 'pad-button-compact': '6px 10px', 'pad-tab': '9px 18px', 'pad-badge': '3px 9px',
} as const;

export const MOTION = { 'duration-fast': '.15s', 'duration-base': '.2s', 'easing-standard': 'ease' } as const;
