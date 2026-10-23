import { themeCss } from '../../src/domain/theme';

/** tokens.css carries the default theme between these markers, generated from src/domain/theme (scripts/gen-theme.ts). */
export const TOKENS_FILE = 'src/ui/theme/tokens.css';
export const START = '/* @generated tokens:start — npm run theme:gen (source: src/domain/theme) */', END = '/* @generated tokens:end */';

/** tokens.css with the generated block replaced by the current table. */
export function withTokens(css: string): string {
  const a = css.indexOf(START), b = css.indexOf(END);
  if (a < 0 || b < a) throw new Error(`${TOKENS_FILE}: generated markers not found`);
  return css.slice(0, a + START.length) + '\n' + themeCss() + '\n  ' + css.slice(b);
}
