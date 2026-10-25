import type { CSSProperties } from 'react';

/**
 * Inline custom properties for the values a stylesheet rule cannot know (D5): a data-driven size or position, a colour read from the case. The rule
 * itself lives in the theme CSS and reads the property (`width: var(--dyn-meter-pct)`); the element carries only the value. The `--dyn-` prefix keeps
 * these local values apart from the theme tokens (`--ac-*`, each one a name of the token table).
 */
export const cssVars = (vars: Record<`--dyn-${string}`, string | number | undefined>): CSSProperties => vars as CSSProperties;

/** A length in pixels for a custom property (`px(80)` = "80px"). */
export const px = (n: number): string => `${n}px`;

/** A percentage for a custom property (`pct(42.5)` = "42.5%"). */
export const pct = (n: number): string => `${n}%`;
