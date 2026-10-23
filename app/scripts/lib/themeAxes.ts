import { axesCss } from '../../src/domain/theme/axesCss';

/** axes.css: the CSS of the theme axes (T3), generated in full from src/domain/theme/axes.ts (scripts/gen-theme.ts writes and checks it beside tokens.css). */
export const AXES_FILE = 'src/ui/theme/axes.css';
const HEAD = `/* @generated — npm run theme:gen (source: src/domain/theme/axes.ts, variants.ts, typography.ts). Do not edit.
   Theme axes (docs/THEME.md §6): a data-ac-<axis> attribute on :root (or on a preview container) selects a block; no attribute = the default look. */`;

/** The expected content of axes.css. */
export const axesFile = (): string => `${HEAD}\n${axesCss()}\n`;
