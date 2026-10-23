# AgentCase — Theme tokens

Every visual value of the app (colour, font, size, weight, line height, radius, border width, shadow, control padding, motion) is a
**design token**. The default theme is the legacy v18.13 look, value for value: switching to the token set changed no pixel
(`tools/ui-parity.mjs`, the legacy-value guards and a screenshot comparison of every section).

This page is step T1 of the configurable-theme programme:

| Step | Scope | What it changes |
|---|---|---|
| **T1** (done) | the token set; no literal outside the token files | nothing visible |
| T2 | dark mode, contrast levels, chart palettes, per-user preference | token **values** only |
| T3 | shapes, density, typography, box style; `Field*` controls with variants | token values, plus the new controls |
| T4 | "Brand & theme" screen: presets, live preview, logo, palette from logo, import / export; theme stored in the case and applied to the HTML snapshot, the report and the Excel workbooks | token values |

## 1. Where the tokens live

| File | Role |
|---|---|
| `app/src/domain/theme/scales.ts` | colour scales (one per role) and their translucent steps |
| `app/src/domain/theme/semantic.ts` | semantic roles (surfaces, text, chrome, tables, business colours), charts, exports |
| `app/src/domain/theme/shape.ts` | typography, shape (radius, borders, shadows), density (paddings), motion |
| `app/src/domain/theme/index.ts` | `THEME_DEFAULT`, `TokenName`, `tok()`, `alpha()`, `argb()`, `themedList()`, `setActiveTheme()`, `themeCss()` |
| `app/src/ui/theme/tokens.css` | the same table as CSS custom properties `--ac-<name>`, **generated** (`npm run theme:gen`) |

The table sits in `domain` (zone `presentation`) because the store's exports (Excel, report) may not import `ui`. It is the single
source: `tokens.css` is generated from it, and `tests/ui/theme-tokens.test.ts` fails when the two differ.

A value may refer to another token as `{name}`. In CSS that becomes `var(--ac-name)`; `tok()` resolves it. So a theme that changes
`primary-700` changes the header, the links, the table header band, the focus ring and the legacy `--ac-blue` at once.

## 2. How code reads a token

| Where | How | Example |
|---|---|---|
| CSS | `var(--ac-<name>)` | `color: var(--ac-text-heading);` |
| inline style, SVG presentation attribute | the `var()` string | `style={{ color: 'var(--ac-danger-800)' }}`, `fill="var(--ac-neutral-0)"` |
| chart.js (canvas), colour arithmetic (`textColor`, `${hex}22` alpha suffix, `alpha()`), domain read-outs | `tok('<name>')` | `borderColor: tok('teal-700')` |
| a module-level palette | `themedList([...])` or an object getter (`get color() { return tok('…'); }`) | `const COLORS = themedList(['chart-cat-1', 'chart-cat-2'])` |
| Excel workbooks | `argb('<name>')` → `FFRRGGBB` | `fgColor: { argb: argb('excel-head-bg') }` |
| HTML report | `reportStyle()` reads the `report-*` tokens when the report is rendered | |

`tok()` and `themedList()` read the **active** theme (`setActiveTheme(values)`, default: `THEME_DEFAULT`); the CSS side is switched by
writing the same values as custom properties on `:root`. Module-level palettes are lazy, so they follow a switch without a reload.

## 3. Token families

Counts are for the default theme (374 tokens).

### 3.1 Colour scales (154 steps)

One scale per role. A step is the lightness rank on a Tailwind-like ramp (OKLab L: 50 ≈ 0.97, 500 ≈ 0.62, 700 ≈ 0.49, 900 ≈ 0.38;
0 = white, 1000 = black). The brand colours sit on round steps; the legacy near-duplicates take the steps in between, ordered by
lightness (a test checks that every scale darkens as the step grows and that no colour sits on two steps).

| Scale | Steps | Anchor (legacy) | Meaning |
|---|---|---|---|
| `primary` | 31 | `primary-700` #0058AB, `primary-975` #121A38 (navy), `primary-850` #00488C | brand blue, header / KPI gradient, links, focus, blue tints, chart blues |
| `secondary` | 4 | `secondary-600` #71609E | violet: agentic build, calculation lane |
| `info` | 4 | `info-700` #0A6E9C, `info-375` #1DB8F2 | sky / cyan accents, AI scenario |
| `teal` | 5 | `teal-700` #006E79 | automation, positive outcome |
| `success` | 12 | `success-600` #4F7D2A, `success-510` #2E9E5B | green, value-add, vFTE |
| `warning` | 30 | `warning-600` #B04600, `warning-575` #BE4D00 | amber: human supervision, warning, report rule (`warning-300` #FEB100) |
| `danger` | 14 | `danger-800` #8F3237 | brick: glass ceiling, negative outcome, error |
| `neutral` | 22 | `neutral-900` #333 (ink), `neutral-700` #636363 (muted), `neutral-130` #E3E3E3 (line), `neutral-0` white | pure greys |
| `slate` | 32 | `slate-50` #F5F6FA (page), `slate-700` #566074 | cool blue-greys: page background, secondary text, neutral series |

### 3.2 Translucent steps (35)

`<scale>-<step>-a<alpha %>`, e.g. `primary-975-a8` = rgba(18, 26, 56, .08) (the card shadow), `neutral-0-a30` (header button
border), `success-500-a80` / `warning-500-a80` (chart bars), `info-375-a30` (input focus glow). A custom property cannot add alpha to
another one without `color-mix()`, so each keeps its literal; a test checks that its RGB is its base step and its alpha the name.
Code that needs a computed alpha uses `alpha(token, a)`.

### 3.3 Semantic roles (51)

| Group | Tokens | Default |
|---|---|---|
| page and surfaces | `bg`, `surface`, `surface-raised`, `surface-muted`, `surface-tint` | slate-50, white, white, neutral-25, primary-60 |
| text | `ink`, `muted`, `text-strong`, `text-soft`, `text-label`, `text-inverse`, `text-on-primary`, `text-link`, `text-heading` | #333, #636363, #222, #555, #666, white, white, primary-700, primary-700 |
| lines | `line`, `line-strong`, `line-subtle`, `line-tint` | #E3E3E3, #DDD, #E5E5E5, #CADCFC |
| states | `focus`, `hover`, `hover-text`, `selected`, `selected-text` | primary-700, primary-60, primary-700, primary-700, white |
| header banner | `header-start`, `header-end`, `header-text` | #0058AB → #121A38, white |
| KPI bar | `kpibar-start`, `kpibar-end`, `kpibar-text` | #0058AB → #00488C, white |
| sidebar | `sidebar-bg`, `sidebar-text`, `sidebar-item-text`, `sidebar-group-bg`, `sidebar-group-text`, `sidebar-group-hover-bg` | white, #333, #555, #EEF1F7, #121A38, #E0E7F5 |
| data tables | `table-head-bg`, `table-head-text`, `table-head-line`, `table-line`, `table-stripe`, `table-hover` | #0058AB, white, #DDD, #E5E5E5, #FAFAFA, #F0F4FF |
| business meaning | `automation`, `glass-ceiling`, `human-supervision`, `agentic`, `ai`, `vfte` | teal-700, danger-800, warning-600, secondary-600, info-700, success-510 |
| legacy names (v18 tokens.css) | `blue`, `teal`, `brick`, `amber` (plus `ink`, `muted`, `line`, `surface`, `bg`, `focus`, `radius`, `font`) | unchanged values |

### 3.4 Charts (24)

`chart-cat-1` … `chart-cat-8` (the portfolio series order: blue, teal, amber, violet, sky, gold, rose, green), `chart-seq-1` …
`chart-seq-10` (the yearly run-cost bars of Stress scenarios, light to dark blues), `chart-div-neg-strong`, `chart-div-neg`,
`chart-div-mid`, `chart-div-pos` (the sensitivity heat map), `chart-grid` (rgba(0,0,0,.05)), `chart-axis` (#636363, SVG axis text).

### 3.5 Exports (18)

Excel: `excel-head-bg` (#1E2761), `excel-head-text`, `excel-subtotal-bg`, `excel-band-bg`, `excel-note`, `excel-input`,
`excel-border`. Report: `report-ink`, `report-heading`, `report-rule`, `report-line`, `report-head-bg`, `report-head-text`,
`report-tag-bg`, `report-tag-text`, `report-note`, `report-font-body` (Calibri,Arial,sans-serif), `report-font-heading` (Ubuntu,sans-serif).

### 3.6 Typography (45)

| Tokens | Values |
|---|---|
| `font-body`, `font-heading`, `font-numeric`, `font` (legacy) | the legacy Ubuntu stack (faces embedded in `fonts.css`) |
| `font-mono`, `font-code`, `font-toast` | 'SFMono-Regular', Consolas, monospace · monospace · Calibri, sans-serif (the legacy toast) |
| `font-size-3xs` … `font-size-9xl`, `font-size-lead` | 8, 9, 10, 11, 12, 13 (`base`), 14, 15, 16, 18, 20, 22, 24, 30, 36, 60 px and 1.05rem; `-plus` is the half step above (8.5, 9.5, 10.5, 11.5, 12.5 px) |
| `font-weight-light` / `regular` / `semibold` / `bold` / `extrabold` | 300 / 400 / 600 / 700 / 800 |
| `leading-none` … `leading-formula` | 1, 1.1, 1.15, 1.3, 1.5, 1.6 (`base`), 1.7, 1.75, 1.85, 1.9 (`code`), 2 (`formula`) |

### 3.7 Shape (33)

| Tokens | Values |
|---|---|
| `radius-2xs` … `radius-2xl`, `radius-card`, `radius-round`, `radius` (legacy) | 2, 3, 4, 5, 6 (`md`), 7, 8 (`lg`), 9, 10, 11, 12 px, 16 px (sections, sidebar, cards), 50% |
| `border-thin` / `medium` / `thick` / `heavy` / `rail`, `focus-width` | 1 / 1.5 / 2 / 3 / 4 px (the coloured left rail), 2 px |
| `shadow-none`, `shadow-sm` … `shadow-xl` | none and the four legacy elevations |
| `shadow-card`, `shadow-kpibar`, `shadow-header`, `shadow-toast`, `shadow-focus` | the roles built on them (the focus glow of inputs) |
| `shadow-rail`, `shadow-rail-offset`, `shadow-ring-offset` | the inset 4 px row marker and the geometry of the coloured markers whose colour is data |

### 3.8 Density (11) and motion (3)

`pad-section`, `pad-card`, `pad-callout`, `pad-table-head`, `pad-table-cell`, `pad-matrix-cell`, `pad-control`, `pad-button`,
`pad-button-compact`, `pad-tab`, `pad-badge`: the paddings of the section card, cards, notes, table cells, inputs, buttons, tabs and
badges (T3 compact / comfortable densities change these). `duration-fast` (.15s), `duration-base` (.2s), `easing-standard`.

## 4. What may stay a literal (and the guard)

`tests/ui/no-hardcoded-style.test.ts` fails on any hex / rgb / hsl / named colour, font family, `font` shorthand with a family, or
raw box-shadow in `app/src/ui/**/*.{css,ts,tsx}`, and on any colour or Excel ARGB literal in `app/src/domain` and `app/src/store`,
outside the token files. Comments are ignored (they quote legacy values). Allowed, each with its reason in the test:

- files: `ui/theme/tokens.css` (generated), `ui/theme/fonts.css` (`@font-face` declares the family `'Ubuntu'`), `domain/theme/*`;
- keywords: `transparent`, `currentColor`, `inherit`, `revert` (form controls keep the browser face as the legacy app did), `none`,
  the system colours `ButtonText` / `ButtonFace` (legacy secondary button) and `Highlight` (forced-colors mode).

Not tokenised in T1, and why: layout geometry (widths, gaps, margins, inline paddings of one-off boxes), letter spacing, opacity,
chart.js font sizes and dash patterns, the border widths written inside inline styles, the colours of **content data**
(`src/content/**/*.json` card accents, the colours a user picks for persona groups or the product colours stored in a case: they are data,
not theme).

## 5. Notes for T2–T4

- **Dark mode / contrast levels (T2):** provide a value set (the scales re-ranked, the roles re-pointed) and apply it twice: custom
  properties on `:root` (or `[data-theme]`) and `setActiveTheme()` for the code that reads `tok()`; then re-render (chart.js configs
  are built at render). The translucent steps keep literals: a dark theme must set them too.
- **Colours that are data** (persona group colours, product colours, content accents, `textColor()` corrections) are not theme tokens;
  `textColor(hex, bg)` darkens against a background that is now `tok(...)` — in a dark theme it must lighten instead.
- **SVG:** presentation attributes take `var()` in Chromium and Firefox (`fill`, `stroke`, `font-size`, `font-weight`); hex suffix
  arithmetic (`${color}22`) needs `tok()`, which is why those palettes are TS values.
- **Exports (T4):** `argb()` / `reportStyle()` read the active theme at export time; the HTML snapshot embeds the built app, so it
  carries the CSS tokens.
