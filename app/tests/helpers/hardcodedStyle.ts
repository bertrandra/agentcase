/**
 * Finds visual values written as literals (docs/THEME.md): colours (hex, rgb/rgba, hsl/hsla, named), font families and raw box-shadows.
 * Comments are ignored (they may quote legacy values); `var(--ac-*)`, `tok()` / `argb()` / `alpha()` calls and the keywords below are fine.
 */
/** Keywords that are not a theme value, each with the reason it stays. */
export const ALLOWED_KEYWORDS: Record<string, string> = {
  transparent: 'no colour at all (invisible tab underline, transparent buttons)',
  currentcolor: 'follows the text colour, which is itself a token',
  inherit: 'takes the parent value, which is itself a token', revert: 'the browser default of a form control (legacy look of inputs)',
  none: 'no shadow / no background', buttontext: 'system colour: the legacy secondary button keeps the browser face',
  buttonface: 'system colour: the legacy secondary button keeps the browser face', highlight: 'system colour of forced-colors mode (Windows high contrast)',
};
const NAMED = /\b(white|black|red|green|blue|gray|grey|orange|yellow|purple|navy|silver|maroon|teal|olive|lime|aqua|fuchsia|pink|brown|gold|beige|ivory|khaki|coral|salmon|tomato|crimson|indigo|violet|cyan|magenta)\b/i;

/** Source text without comments (CSS and TS block comments, TS line comments outside strings). */
export function stripComments(src: string, css: boolean): string {
  if (css) return src.replace(/\/\*[\s\S]*?\*\//g, '');
  return src.replace(/\/\*[\s\S]*?\*\/|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/[^\n]*/g, (m) => (m.startsWith('//') || m.startsWith('/*') ? '' : m));
}

/** Every literal visual value of one file, as `line: snippet [kind]`. */
export function hardcodedStyles(file: string, src: string): string[] {
  const css = file.endsWith('.css'), text = stripComments(src, css), out: string[] = [];
  const hit = (re: RegExp, kind: string, ok: (m: RegExpExecArray) => boolean = () => false) => {
    for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) {
      if (ok(m as RegExpExecArray)) continue;
      out.push(`${text.slice(0, m.index).split('\n').length}: ${m[0].slice(0, 80)} [${kind}]`);
    }
  };
  hit(/#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b(?![\w-])/, 'hex colour', (m) => /[\w&]$/.test(text.slice(Math.max(0, m.index! - 1), m.index)));
  hit(/\b(rgba?|hsla?)\(\s*[\d.]/, 'rgb/hsl colour');
  if (css) {
    hit(/(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-\w+)?(?:-color)?|outline(?:-color)?|fill|stroke)\s*:[^;}]*/, 'named colour', (m) => !NAMED.test(m[0].split(':').slice(1).join(':').replace(/var\([^)]*\)/g, '')));
    hit(/font-family\s*:\s*[^;}]+/, 'font family', (m) => /^font-family\s*:\s*(var\(--ac-[a-z0-9-]+\)|inherit)\s*$/.test(m[0].trim()));
    hit(/(?:^|[;{\s])font\s*:\s*[^;}]+/, 'font shorthand', (m) => /:\s*(inherit|revert|var\(--ac-font[a-z0-9-]*\)|[^;}]*var\(--ac-font-(?:body|heading|numeric|mono|code|toast)\))\s*$/.test(m[0].trim()));
    // a shadow token, or a shadow token's geometry coloured by a local value (`var(--ac-shadow-rail-offset) var(--dyn-group-color)`: a colour of the case)
    hit(/box-shadow\s*:\s*[^;}]+/, 'box-shadow', (m) => /:\s*(var\(--ac-shadow-[a-z0-9-]+\)( var\(--dyn-[a-z0-9-]+\))?|none|inherit)\s*$/.test(m[0].trim()));
  } else {
    hit(/\b(?:color|background|backgroundColor|borderColor|fill|stroke|stopColor)\s*[:=]\s*\{?\s*['"`](?:[^'"`]*\s)?(white|black|red|green|blue|gray|grey|orange|yellow|purple|navy)['"`\s]/, 'named colour');
    hit(/\bfontFamily\s*[:=]\s*\{?\s*['"`](?!var\(--ac-)/, 'font family');
    hit(/\bboxShadow\s*:\s*['"`](?!var\(--ac-)/, 'box-shadow');
  }
  return out;
}

/** Literal Excel ARGB colours (`'FFRRGGBB'`): the workbooks read `argb(token)`. */
export const argbLiterals = (src: string): string[] => [...stripComments(src, false).matchAll(/['"`]FF[0-9A-Fa-f]{6}['"`]/g)].map((m) => m[0]);
