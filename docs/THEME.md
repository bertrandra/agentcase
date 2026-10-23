# AgentCase — Theme tokens

Every visual value of the app (colour, font, size, weight, line height, radius, border width, shadow, control padding, motion) is a
**design token**. The default theme is the legacy v18.13 look, value for value: switching to the token set changed no pixel
(`tools/ui-parity.mjs`, the legacy-value guards and a screenshot comparison of every section).

This page covers steps T1 (the tokens) and T2 (display modes, §6) of the configurable-theme programme:

| Step | Scope | What it changes |
|---|---|---|
| **T1** (done) | the token set; no literal outside the token files | nothing visible |
| **T2** (done) | dark mode, contrast levels, chart palettes, colour-blind option, reduced motion, per-user preference (§6) | token **values** only, plus the Display control of the top bar |
| T3 | shapes, density, typography, box style; `Field*` controls with variants | token values, plus the new controls |
| T4 | "Brand & theme" screen: presets, live preview, logo, palette from logo, import / export; theme stored in the case and applied to the HTML snapshot, the report and the Excel workbooks | token values |

## 1. Where the tokens live

| File | Role |
|---|---|
| `app/src/domain/theme/scales.ts` | colour scales (one per role) and their translucent steps |
| `app/src/domain/theme/semantic.ts` | semantic roles (surfaces, text, chrome, tables, business colours), charts, exports |
| `app/src/domain/theme/shape.ts` | typography, shape (radius, borders, shadows), density (paddings), motion |
| `app/src/domain/theme/index.ts` | `THEME_DEFAULT`, `TokenName`, `tok()`, `printTok()`, `alpha()`, `argb()`, `themedList()`, `setActiveTheme()`, `setDisplayTheme()`, `themeCss()` |
| `app/src/domain/theme/color.ts` | OKLab / OKLCH conversions, gamut mapping, WCAG luminance and contrast ratio |
| `app/src/domain/theme/dark.ts`, `contrast.ts`, `modes.ts` | the display modes (§6): dark value set, contrast-level deltas, colour-blind palettes, `displayTheme()`, `modesCss()` |
| `app/src/ui/theme/tokens.css` | the same table as CSS custom properties `--ac-<name>`, then one block per display mode, all **generated** (`npm run theme:gen`) |

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

Counts are for the default theme (380 tokens).

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

### 3.3 Semantic roles (54)

| Group | Tokens | Default |
|---|---|---|
| page and surfaces | `bg`, `surface`, `surface-raised`, `surface-muted`, `surface-tint` | slate-50, white, white, neutral-25, primary-60 |
| text | `ink`, `muted`, `text-strong`, `text-soft`, `text-label`, `text-inverse`, `text-on-primary`, `text-on-data` (T2), `text-link`, `text-heading` | #333, #636363, #222, #555, #666, white, white, white, primary-700, primary-700 |
| lines | `line`, `line-strong`, `line-subtle`, `line-tint` | #E3E3E3, #DDD, #E5E5E5, #CADCFC |
| states | `focus`, `focus-header` (T2: the ring on the header / KPI bar), `hover`, `hover-text`, `selected`, `selected-text` | primary-700, `{focus}`, primary-60, primary-700, primary-700, white |
| header banner | `header-start`, `header-end`, `header-text` | #0058AB → #121A38, white |
| KPI bar | `kpibar-start`, `kpibar-end`, `kpibar-text` | #0058AB → #00488C, white |
| sidebar | `sidebar-bg`, `sidebar-text`, `sidebar-item-text`, `sidebar-group-bg`, `sidebar-group-text`, `sidebar-group-hover-bg` | white, #333, #555, #EEF1F7, #121A38, #E0E7F5 |
| data tables | `table-head-bg`, `table-head-text`, `table-head-note` (T2: small print in the header band), `table-head-line`, `table-line`, `table-stripe`, `table-hover` | #0058AB, white, #CADCFC, #DDD, #E5E5E5, #FAFAFA, #F0F4FF |
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

- **Dark mode / contrast levels (T2):** done, see §6.
- **Colours that are data** (persona group colours, product colours, content accents) are not theme tokens; `textColor(hex, bg)` corrects
  them as text: it darkens on a light background and lightens on a dark one (T2).
- **SVG:** presentation attributes take `var()` in Chromium and Firefox (`fill`, `stroke`, `font-size`, `font-weight`); hex suffix
  arithmetic (`${color}22`) needs `tok()`, which is why those palettes are TS values.
- **Exports (T4):** `argb()` / `reportStyle()` read the active theme at export time; the HTML snapshot embeds the built app, so it
  carries the CSS tokens.

## 6. Display modes (T2)

A display is a value set **over** the base theme: it never changes the case, and the default display (light, standard contrast, no option)
is the T1 look unchanged (no attribute on `<html>`, `tok()` returns `THEME_DEFAULT`; ui-parity shows no new divergence).

### 6.1 The value sets (`domain/theme/dark.ts`, `contrast.ts`, `modes.ts`)

| Display | How it is built |
|---|---|
| **dark** | dedicated values for the semantic roles (page `#0f131a` < surface `#171c24` < raised `#1e242e`: elevation lightens; off-white ink `#e6e8ec`, muted `#a9b1bd`; lines `#2e3542`…; header / KPI gradient `#163a6b` → navy; table head `#1c3a66`; business colours lifted for dark grounds: automation `#4fc6cc`, glass ceiling `#f08f94`, human supervision `#f5a865`, agentic `#b9a8ec`, ai `#62c6f2`, vFTE `#63d391`), the chart series (`chart-cat-1..8`), grid and axis, and the 35 translucent steps (tints on their dark base, shadows black and deeper, header overlays still white). The 154 raw scale steps are re-ranked by an OKLab lightness curve (`DARK_L`: white → L .235, page tints → .25-.31, text steps → .78-.91; hue kept, light chroma × .82, gamut-mapped), so a component still reading `primary-60` gets a dark blue tint and one reading `neutral-700` a light grey: a pair that read in light reads in dark. `color-scheme: dark` makes native controls dark. |
| **enhanced** | light: the text steps (OKLab L < .72) darkened by a fifth, ink `#1a1a1a`, muted `#404040`, lines `#8c8c8c` / `#6e6e6e` (>= 3:1), focus `#003d7a` 3px, white ring on the header. Dark: light steps lifted halfway to white, ink `#f5f6f8`, muted `#d2d7de`, lines `#6b7483`, deeper page. |
| **high** | black and white, like the Windows high-contrast themes: every scale step to the page or the ink (light: L >= .8 → white, the rest → a near-black of the same hue; dark: the reverse), all text roles black / white, lines in the text colour, header and table head black, hover light grey (light) / near black (dark), selected black / yellow, focus black / yellow 3px, shadows become 1px rings. Charts keep the standard sequential ramp, take paler / deeper diverging cells and a strong categorical series (`HIGH_CHART`). |
| **colour-blind safe charts** | `chart-cat-1..8` = Okabe & Ito (2008) order (blue, vermillion, bluish green, reddish purple, orange, sky, black, grey in light; lifted variants in dark and high). |
| **reduce motion** | `duration-fast` / `duration-base` = 0s; the same `!important` rule as `prefers-reduced-motion` keyed on `[data-ac-motion=reduce]`; no chart.js animation; the funnel replay does not autoplay. |

`displayTheme(spec, base)` composes them (dark, then the contrast delta, then the colour-blind series, then motion) over any base theme:
the dark scales are derived from the base theme's scales, so a T4 preset gets a dark variant without a second table.

### 6.2 Mechanism

- **CSS**: `npm run theme:gen` writes, after the default `:root` block, one block per display (`modesCss()`):
  `:root[data-ac-mode="dark"]`, `:root:not([data-ac-mode="dark"])[data-ac-contrast="enhanced|high"]`,
  `:root[data-ac-mode="dark"][data-ac-contrast="enhanced|high"]`, the four `[data-ac-cvd="on"]` blocks, `[data-ac-motion="reduce"]`.
  A role declared as `var(--ac-step)` in the default block follows the overridden step. `theme:check` and `theme-tokens.test.ts` cover them.
- **TS**: `setDisplayTheme(displayTheme(spec))`: `tok()` / `themedList()` read base + display. `printTok()` and `argb()` read the base
  theme only: **the Excel workbooks and the HTML report stay light** (they are printed). `setActiveTheme()` (T4) changes the base and keeps
  the display on top.
- **Re-render**: `ui/display/store.ts` holds the preference, the system media queries and the resolved display, and a `version`; the shell
  keys the section host on it, so every chart.js config and `tok()` read-out is rebuilt (the top bar, KPI bar and sidebar are pure CSS).
  `ChartPanel` applies `chartTheme.ts`: chart.js default text / line colours from `chart-axis` / `chart-grid` (the legacy defaults in the
  default display), no animation under reduced motion, and the colour-blind second channel.
- `textColor(hex, bg)` darkens a data colour on a light background and lightens it on a dark one (to 4.5:1).

### 6.3 Colour-blind coverage

Every chart.js canvas goes through `ChartPanel`, so with the option on: the categorical series that read `chart-cat-*` switch to Okabe-Ito;
**line / radar series** get a dash pattern and a point style per series (8 of each), with points shown; **bar series** get a hatch per series
(series 1 solid, then diagonal, reverse diagonal, horizontal, vertical, grid, dots, cross; per-bar colour arrays get one per bar).
Not covered: series coloured by a business role (automation teal, glass-ceiling brick… keep their meaning, distinguishable by lightness and
the hatches / dashes), the SVG charts (funnel, S-curves, Gantt, dependency graph: their series follow the palette but get no pattern), and
data colours the user picks (persona groups, products). Content tints (`bg` of a rich-content card) are re-ranked like the dark
scale steps in dark mode (`ui/display/dataColor.ts`).

### 6.4 Contrast validation

`tests/ui/theme-contrast.test.ts` computes the WCAG ratio of 37 text / background role pairs (ink and muted on every surface, links,
headings, chart axis, header, KPI bar, sidebar, hover, selected, table head and its note, the diverging heat-map cells), the business
colours as text, and the UI colours (focus rings, vFTE, the 8 chart series, at 3:1; lines at 3:1 from enhanced on), in each mode x level:

| Level | Text | Business colours as text | UI / graphics | Lines |
|---|---|---|---|---|
| standard | 4.5:1 | 4.5:1 | 3:1 | (legacy hairlines) |
| enhanced | 7:1 | 7:1 | 3:1 | 3:1 |
| high | 15:1 | 7:1 | 3:1 | 3:1 |

All six combinations pass. One recorded legacy shortfall: in light / standard the header focus ring is the brand blue on the blue end of
the header gradient (1:1); it must stay pixel-identical, every other level uses a white / yellow ring (`focus-header`). T4 may adopt it.
axe-core (`node tools/a11y.mjs --fixtures golden --mode dark [--contrast high]`) audits a display; see the results in the T2 changelog entry.

### 6.5 The viewer's preference

`ui/display/prefs.ts`: `{ mode: light | dark | auto, contrast: standard | enhanced | high, reduceMotion, cvd }` in localStorage
`agentcase.display` (try / catch; a missing, blocked or malformed entry gives light / standard), **never in the case, never undoable**.
"Auto" follows `prefers-color-scheme` live, and `prefers-contrast: more` lifts standard to enhanced; reduced motion is on when either the
option or `prefers-reduced-motion` asks. The top-bar **Display** control (◐) discloses native radios and checkboxes.
The **HTML snapshot** does not carry the author's attributes: it opens in its viewer's preference, light by default, auto honours the
viewer's system. The report and the Excel workbooks are always light.

### 6.6 What still reads raw scale steps, and notes for T3 / T4

- Moved to roles in T2: the glossary category bands (`text-on-data`: white on a data colour in every mode), the chart.js series and SVG chart / Gantt / dependency-graph colours that equalled a `chart-cat-*` value (82
  reads in 18 files), the persona table header note (`table-head-note`), the header / KPI focus ring (`focus-header`).
- Still on raw steps (about 450 `var(--ac-<scale>-<step>)` in CSS / inline styles and ~180 `tok('<scale>-<step>')`): status tints of
  callouts and badges (`warning-55`, `danger-75`…), the coloured left rails, the scope / tune card accents, the domain read-outs (status
  bands, scenario colours). They work in every display through the re-ranked scales; under **high** they collapse to black / white (by
  design), so colour-only distinctions in those places (Gantt bars that read business steps, status tints) disappear there.
- T3 (shapes, density, typography) only touches non-colour tokens: no interaction with the display sets, except `focus-width` (3px at
  enhanced / high) and the shadows (rings at high).
- T4 (presets, brand colours, logo palette): apply the preset with `setActiveTheme()` and recompute the display with
  `displayTheme(spec, base)`; the CSS side needs the same: a preset must also emit its dark / contrast blocks (run `modesCss()` on the
  preset, or write the computed `displayTheme()` values as inline custom properties on `<html>`). A preset's brand colours must be
  re-checked by the contrast test (run it on the preset table). The exports already read the base theme (`printTok()` / `argb()`).
