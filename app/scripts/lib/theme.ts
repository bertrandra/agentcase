import { themeCss } from '../../src/domain/theme';
import { modesCss } from '../../src/domain/theme/modes';

/** tokens.css carries the default theme between these markers, generated from src/domain/theme (scripts/gen-theme.ts). */
export const TOKENS_FILE = 'src/ui/theme/tokens.css';
export const START = '/* @generated tokens:start — npm run theme:gen (source: src/domain/theme) */', END = '/* @generated tokens:end */';
/** The display modes (dark, contrast levels, colour-blind charts, reduced motion: src/domain/theme/modes.ts) follow, between their own markers. */
export const MODES_START = '/* @generated modes:start — npm run theme:gen (source: src/domain/theme/modes.ts) */', MODES_END = '/* @generated modes:end */';

/** tokens.css with the generated blocks replaced by the current tables. */
export function withTokens(css: string): string {
  const a = css.indexOf(START), b = css.indexOf(END);
  if (a < 0 || b < a) throw new Error(`${TOKENS_FILE}: generated markers not found`);
  const out = css.slice(0, a + START.length) + '\n' + themeCss() + '\n  ' + css.slice(b);
  const c = out.indexOf(MODES_START), d = out.indexOf(MODES_END);
  if (c < 0 || d < c) throw new Error(`${TOKENS_FILE}: generated modes markers not found`);
  return out.slice(0, c + MODES_START.length) + '\n' + modesCss() + '\n' + out.slice(d);
}
