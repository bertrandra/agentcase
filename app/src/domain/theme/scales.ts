/** @calc-zone presentation */
/**
 * Default theme, colour scales (docs/THEME.md). One scale per colour role; every colour the legacy look uses sits on exactly one step.
 * Step = lightness rank on a Tailwind-like ramp (OKLab L: 50 ≈ 0.97, 500 ≈ 0.62, 700 ≈ 0.49, 900 ≈ 0.38): 0 is white, 1000 black; the brand
 * colours sit on round steps (primary-700, teal-700, warning-600, danger-800, secondary-600, info-700) and the legacy near-duplicates take the
 * steps in between, ordered by lightness. A dark theme (T2) redefines the steps, not the components.
 */
export const SCALES = {
  /** brand blue, navy chrome and the blue tints */
  primary: {
    25: '#f8fbff', 30: '#f7f9ff', 40: '#f5f9ff', 50: '#f4f8ff', 55: '#f2f6fd', 60: '#f0f4ff', 75: '#eaf2fb', 80: '#eaf0fb', 100: '#e3eef7', 110: '#e1e7f5',
    115: '#e0e7f5', 150: '#d9e2f3', 200: '#cadcfc', 250: '#b9d3e8', 275: '#b9c7e6', 350: '#8fb0e8', 400: '#6fa8dc', 500: '#378add', 600: '#2e75b6',
    695: '#1f5f9a',
    700: '#0058ab', 825: '#1f4e79', 830: '#3a4480', 850: '#00488c', 900: '#003d7a', 925: '#003d6b', 930: '#12385a', 950: '#1e2761', 960: '#0a2540',
    965: '#141e46',
    975: '#121a38',
  },
  /** violet: agentic build, calculation lane */
  secondary: { 75: '#efedf7', 575: '#6c5ce7', 600: '#71609e', 850: '#4a3d6b' },
  /** sky / cyan: information accents, AI scenario */
  info: { 250: '#8adaf8', 260: '#00e4f9', 375: '#1db8f2', 700: '#0a6e9c' },
  /** teal: automation, positive outcome */
  teal: { 100: '#dff2f2', 600: '#00828e', 700: '#006e79', 725: '#00666f', 800: '#00575f' },
  /** green: success, value-add, vFTE */
  success: {
    25: '#f5fff9', 30: '#f0fff4', 50: '#f1f8e9', 75: '#e1f5ee', 175: '#c4e8d1', 400: '#66bb6a', 500: '#639922', 510: '#2e9e5b', 550: '#4e8f2e', 600: '#4f7d2a',
    625: '#3a7d34', 800: '#3a5a3f',
  },
  /** amber / orange / gold: human supervision, warning, the report rule */
  warning: {
    10: '#fffef9', 25: '#fffdf0', 30: '#fffaf0', 35: '#fff9f0', 40: '#fff8ec', 45: '#fff7ed', 50: '#fff7e0', 55: '#fff5e8', 60: '#fff5e6', 65: '#fff9c4',
    70: '#fff3e0', 75: '#fbeae0', 100: '#ffe9c7', 150: '#f0e0b0', 200: '#f0d0a0', 225: '#ffc39a', 250: '#e8c99a', 275: '#e8c0a0', 280: '#e6c36a',
    300: '#feb100',
    325: '#ffa726', 500: '#ba7517', 550: '#b5651d', 575: '#be4d00', 590: '#8a6d00', 595: '#9c5d0a', 600: '#b04600', 610: '#a84400', 750: '#8f3900',
    825: '#7a3300', 850: '#6b3a00',
  },
  /** brick / red: glass ceiling, negative outcome, error */
  danger: {
    25: '#fffafa', 50: '#fff5f5', 55: '#fdf3f3', 75: '#fdecea', 100: '#f7e8e9', 200: '#ffccbc', 225: '#f5c6cb', 275: '#e5b9bc', 300: '#ffab91', 600: '#a8545a',
    700: '#b00', 710: '#a02b5a', 800: '#8f3237', 925: '#5c2024',
  },
  /** pure greys: ink, muted text, lines, white */
  neutral: {
    0: '#fff', 25: '#fafafa', 50: '#f7f7f7', 75: '#f1f1f1', 80: '#efefef', 85: '#eee', 125: '#e5e5e5', 130: '#e3e3e3', 175: '#ddd', 200: '#d9d9d9',
    250: '#ccc', 500: '#8a8a8a', 505: '#888', 525: '#808080', 650: '#666', 700: '#636363', 750: '#555', 875: '#444', 900: '#333', 950: '#222',
    975: '#101010', 1000: '#000',
  },
  /** cool blue-greys: page background, secondary text, neutral data series */
  slate: {
    10: '#fcfdff', 25: '#fbfcfe', 30: '#fafbfe', 35: '#fafbfd', 40: '#f7f9fd', 45: '#f7f9fc', 50: '#f5f6fa', 55: '#f4f6fb', 60: '#f5f6f8', 65: '#f2f4f8',
    75: '#eff2f8', 80: '#eef1f7', 85: '#eceff5', 100: '#e8ecf7', 105: '#e7ebf0', 110: '#e5e9f2', 125: '#e2e6f0', 130: '#dfe4ee', 135: '#dfe4ea', 140: '#dfe3ec',
    190: '#d7dced', 200: '#d5dae6', 250: '#c8ccd4', 575: '#6b7688', 600: '#667089', 625: '#5b6b8c', 650: '#5a6785', 675: '#5b6478', 680: '#5c6470',
    685: '#5b6472', 700: '#566074', 705: '#556074',
    900: '#33415c', 950: '#22262e',
  },
} as const;

/** Translucent steps (`<scale step>-a<alpha %>`): a CSS custom property cannot add alpha to another one without color-mix, so each keeps its literal. */
export const ALPHAS = {
  'neutral-0-a12': 'rgba(255, 255, 255, .12)', 'neutral-0-a25': 'rgba(255, 255, 255, .25)', 'neutral-0-a30': 'rgba(255, 255, 255, .3)',
  'neutral-0-a45': 'rgba(255, 255, 255, .45)', 'neutral-0-a80': '#ffffffcc', 'neutral-80-a30': 'rgba(239, 239, 239, .3)',
  'neutral-975-a30': 'rgba(16, 16, 16, .3)',
  'neutral-1000-a5': 'rgba(0,0,0,.05)',
  'primary-500-a12': 'rgba(55,138,221,.12)', 'primary-500-a18': 'rgba(55,138,221,0.18)', 'primary-500-a70': 'rgba(55,138,221,.7)',
  'primary-700-a10': 'rgba(0,88,171,.1)', 'primary-950-a80': 'rgba(30,39,97,.8)', 'primary-965-a28': 'rgba(20, 30, 70, .28)',
  'primary-975-a8': 'rgba(18, 26, 56, .08)', 'primary-975-a22': 'rgba(18, 26, 56, .22)', 'primary-975-a25': 'rgba(18, 26, 56, .25)',
  'secondary-575-a70': 'rgba(108,92,231,.7)', 'secondary-600-a10': 'rgba(113,96,158,.1)',
  'info-375-a10': 'rgba(29,184,242,.1)', 'info-375-a30': 'rgba(29, 184, 242, .3)',
  'teal-600-a10': 'rgba(0,130,142,.1)', 'teal-600-a12': 'rgba(0,130,142,.12)', 'teal-700-a70': 'rgba(0,110,121,.7)',
  'success-500-a10': 'rgba(99,153,34,0.10)', 'success-500-a12': 'rgba(99,153,34,0.12)', 'success-500-a15': 'rgba(99,153,34,.15)',
  'success-500-a50': 'rgba(99,153,34,.5)',
  'success-500-a80': 'rgba(99,153,34,.8)',
  'warning-500-a10': 'rgba(186,117,23,0.10)', 'warning-500-a15': 'rgba(186,117,23,.15)', 'warning-500-a50': 'rgba(186,117,23,.5)',
  'warning-500-a70': 'rgba(186,117,23,.7)',
  'warning-500-a80': 'rgba(186,117,23,.8)', 'warning-575-a12': 'rgba(190,77,0,.12)',
} as const;
