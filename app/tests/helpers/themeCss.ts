import { resolveTokens, THEME_DEFAULT, type TokenName } from '../../src/domain/theme';

/** A stylesheet with every `var(--ac-*)` replaced by its default-theme value, so the legacy-value guards read the values the browser computes. */
export function resolveCss(css: string): string {
  return css.replace(/var\(--ac-([a-z0-9-]+)\)/g, (all, n: string) => (n in THEME_DEFAULT ? resolveTokens(THEME_DEFAULT[n as TokenName], THEME_DEFAULT) : all));
}
