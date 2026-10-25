# AgentCase — Theme tokens

Every visual value of the app (colour, font, size, weight, line height, radius, border width, shadow, control padding, motion) is a
**design token**. The default theme is the legacy v18.13 look, value for value: switching to the token set changed no pixel
(`tools/ui-parity.mjs`, the legacy-value guards and a screenshot comparison of every section).

This page covers the configurable-theme programme: T1 (the tokens), T3 (axes, §6), T2 (display modes, §7), T4 + T5 (the theme library and the Brand & theme screen, §8):

| Step | Scope | What it changes |
|---|---|---|
| **T1** (done) | the token set; no literal outside the token files | nothing visible |
| **T3** (done, §6) | shapes, density, typography, box style; `Field*` controls with variants | token values, plus the new controls |
| **T2** (done) | dark mode, contrast levels, chart palettes, colour-blind option, reduced motion, per-user preference (§7) | token **values** only, plus the Display control of the top bar |
| **T4 + T5** (done, §8) | theme library in the case (7 built-ins, own themes), "Brand & theme" screen with live preview, `?theme=<n>` links, customer logo; the theme reaches the HTML snapshot, the report and the Excel workbooks (palette from logo: not done) | token values, inline on `<html>` |

## 1. Where the tokens live

| File | Role |
|---|---|
| `app/src/domain/theme/scales.ts` | colour scales (one per role) and their translucent steps |
| `app/src/domain/theme/semantic.ts` | semantic roles (surfaces, text, chrome, tables, business colours), charts, exports |
| `app/src/domain/theme/shape.ts` | typography, shape (radius, borders, shadows), density (paddings), motion |
| `app/src/domain/theme/layout.ts` | the T3 tokens the axes switch (block spacing, box style, button / control shape, key figures, numeric figures), pre-T3 values |
| `app/src/domain/theme/axes.ts`, `variants.ts`, `typography.ts`, `axesCss.ts` | the theme axes (§6): values, defaults, labels, token sets, the generator of `axes.css` |
| `app/src/ui/theme/axes.css` | one block per non-default axis value, **generated** in full (`npm run theme:gen`) |
| `app/src/ui/themeAxes.ts`, `app/src/ui/widgets/field/` | applying / reading the axes at run time; the `Field*` controls and their variants |
| `app/src/domain/theme/index.ts` | `THEME_DEFAULT`, `TokenName`, `ColourRole`, `resolveTokens(value, table)`, `tokIn(table, name)`, `alpha()`, `argb(print, name)`, `themeCss()`: pure, no state |
| `app/src/domain/theme/resolve.ts` | the pure resolver (lot 5a, §2.1): `makeTheme()`, `resolveAppTheme(def, spec)` → `Theme` (`values`, `base`, `spec`, `tok`, `list`, `alpha`), `DEFAULT_THEME`, `printTheme(def)` |
| `app/src/ui/themeContext.ts`, `app/src/ui/brand/ThemeRuntime.tsx` | the runtime theme: `useTheme()`, `useRoles()`, the `ThemeProvider` of the shell (§2.1) |
| `app/src/domain/theme/color.ts` | OKLab / OKLCH conversions, gamut mapping, WCAG luminance and contrast ratio |
| `app/src/domain/theme/dark.ts`, `contrast.ts`, `modes.ts` | the display modes (§7): dark value set, contrast-level deltas, colour-blind palettes, `displayTheme()`, `modesCss()` |
| `app/src/ui/theme/tokens.css` | the same table as CSS custom properties `--ac-<name>`, then one block per display mode, all **generated** (`npm run theme:gen`) |

The table sits in `domain` (zone `presentation`) because the store's exports (Excel, report) may not import `ui`. It is the single
source: `tokens.css` is generated from it, and `tests/ui/theme-tokens.test.ts` fails when the two differ.

A value may refer to another token as `{name}`. In CSS that becomes `var(--ac-name)`; `tok()` resolves it. So a theme that changes
`primary-700` changes the header, the links, the table header band, the focus ring and the legacy `--ac-blue` at once.

## 2. How code reads a token

| Where | How | Example |
|---|---|---|
| CSS | `var(--ac-<name>)` | `color: var(--ac-text-heading);` |
| inline style, SVG presentation attribute | the `var()` string | `style={{ color: 'var(--ac-danger-800)' }}`, `fill="var(--ac-neutral-0)"`, `` `var(--ac-${band.tone})` `` |
| a look of section markup (D5, lot 5b) | a class of `ui/theme/sections-*.css`; a value that is data rides on the element as a local `--dyn-*` custom property (`cssVars()`), a domain colour role as `data-tone` | `.ac-section .ac-dd-gauge-v { color: var(--dyn-dd-tone); }` |
| chart.js (canvas), colour arithmetic (`textColor`, `${hex}22` alpha suffix, `alpha()`) | `tok('<name>')` of the theme in effect: `const { tok } = useTheme()` in a component, a `tok: Tok` argument in a chart builder | `borderColor: tok('teal-700')` |
| a palette or a role map | token names (`readonly TokenName[]`, `{ real: 'chart-cat-2', … }`), resolved where they are drawn: `tok(name)`, `list(names)`, `useRoles(map)` | `const COL = useRoles(COL_ROLES)` |
| domain read-outs (a status band, a scenario hue) | a colour **role**: the token name (`ColourRole`), never a resolved value | `riskBand(score).tone === 'danger-800'` |
| Excel workbooks | `argb(print, '<name>')` → `FFRRGGBB`; the sheet writers call `xlArgb(cell.workbook, name)` | `fgColor: { argb: xlArgb(ws.workbook, 'excel-head-bg') }` |
| HTML report | `reportStyle(print)` reads the `report-*` tokens of the print theme | |

### 2.1 The runtime model (lot 5a)

There is **no theme state in domain or store**. `domain/theme/resolve.ts` is a pure resolver: `resolveAppTheme(def, spec)` turns a library theme and
a display into a `Theme` — `values` (base + display: what the screen paints), `base` (the theme without the display), `spec`, and `tok()` / `list()` /
`alpha()` over `values` (resolved values are cached per `Theme` object). The theme in effect lives in the UI layer only:

1. **a React context** (`ui/themeContext.ts`): `ThemeProvider` (`ui/brand/ThemeRuntime.tsx`, wrapped around the shell) resolves the case's active theme, or
   the `?theme=` link's, under the viewer's display, and provides it; `useTheme()` reads it (outside a provider: `DEFAULT_THEME`, the default look);
2. **the custom properties on `<html>`**: the same provider writes the theme's colour tokens (display included) and its axes there (§8.2).

A theme or display change gives a new `Theme` object; the components that read it re-render, everything else follows the CSS. Nothing re-mounts: the
open section keeps its tabs, drafts and scroll; a chart.js chart is updated in place (`chart.update('none')`). The exports never read the screen's
theme: the controller hands them the **print theme** (`controllers/exportTheme.ts`: `printTheme()` of the theme in effect, so always light).
`tests/domain/no-module-state.test.ts` forbids module-level `let` in `src/domain` and any import of the UI theme runtime from domain or store.

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
| `shadow-rail`, `shadow-rail-offset`, `shadow-ring`, `shadow-ring-offset` | the inset 4 px row marker, the 1 px milestone ring (slate) and the geometry of the coloured markers whose colour is data (`var(--ac-shadow-ring-offset) var(--dyn-…)` in CSS) |

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
- **Exports (T4):** `argb(print, …)` / `reportStyle(print)` read the print theme the controller passes at export time; the HTML snapshot embeds the
  built app, so it carries the CSS tokens.

## 6. Theme axes (T3)

A theme axis is a closed list of values with a default (today's look). The **default of every axis changes nothing**: with no axis set,
the app is pixel-identical to T1 (ui-parity unchanged; screenshot comparison of 18 input and result sections identical). T3 adds 15
tokens (`layout.ts`) holding the values the rules held before, so `tokens.css` now declares 392 custom properties.

### 6.1 Mechanism

| Side | How |
|---|---|
| source | `domain/theme/axes.ts`: `AXES` = per axis `{ group, label, default, values: { value: TokenSet }, labels }` (English labels for T4) |
| CSS | `data-ac-<axis>` on `:root` (kebab case: `fontBody` → `data-ac-font-body`). `axes.css` (generated) has, per non-default value, `[data-ac-x='v'] { the tokens it sets }` and `:where([data-ac-x='v']) { the tokens built on them, re-declared }`. The second rule (specificity 0) makes the attribute also work on a sub-tree, e.g. a T4 live-preview container; an explicit value of another axis always wins over it. The file loads after `tokens.css`. |
| run time | `ui/themeAxes.ts`: `applyThemeAxes(axes, el = <html>)` writes the attributes (default / missing value = no attribute), `readThemeAxes()`, `useThemeAxis(k)` (re-renders on an attribute change, MutationObserver). The attributes are the single source: the CSS reads them, the `Field*` controls subscribe to them. |
| `tok()` | `axisTokens(axes)` = the merged token set; `themeBase(def)` = default + colour overrides + axis tokens, the base of `resolveAppTheme()` (charts, exports). |

Compatible with T2's `data-ac-mode` / `data-ac-contrast`: different attributes; T2's colour blocks and these blocks change disjoint tokens
(the shadow axis re-points the role tokens `shadow-card`, `shadow-kpibar`, `shadow-header`, never the elevation steps or their colours).

### 6.2 Axes and values (default in bold)

| Group | Axis (`ThemeAxes` key) | Values | Tokens changed |
|---|---|---|---|
| Shape | `radius` | square, **soft**, round | `radius-2xs` … `radius-card` (0 / legacy / ×≈2, card 22 px); circles stay 50% |
| | `buttons` | **shape**, pill | `radius-button` → `radius-pill` (999 px) |
| | `border` | none, **thin**, strong | `border-thin`, `border-medium` (0 / 2 px), `border-thick` (3 px); inputs keep 1 px (`border-control`) when none |
| | `shadow` | none, **light**, floating | `shadow-card`, `shadow-kpibar`, `shadow-header` |
| Box style | `box` | flat, **outline**, elevated | `box-border`, `box-bg`, `shadow-box` of `.ac-card`, `.ac-rich-card`, `.ac-stat-row` (KPI tiles), `.ac-chart` |
| | `callout` | **bar**, tint | `callout-rail` (4 px accent bar → the thin border) |
| Density | `density` | compact, **comfortable**, spacious | the 11 `pad-*` (section, card, callout, table head / cell = row height, matrix, control, button, tab, badge), `space-block`, `space-heading`, `space-field`, `space-row`; spacious also `font-size-figure` (20 → 30 px) and `font-size-kpi` (16 → 22 px) |
| Typography | `fontBody` | **ubuntu**, system, serif | `font-body` (and `font`, `font-heading`, `font-numeric` that follow it) |
| | `fontHeading` | **body**, ubuntu, system, serif | `font-heading` (section h1, h2 / h3, brand title) |
| | `fontNumeric` | **body**, tabular, mono | `numeric-figures` (`tabular-nums` on tables, stats, KPI bar), `font-numeric` (right-aligned table cells, stat and KPI figures) |
| | `typeScale` | compact, **normal**, large | every `font-size-*` ×0.92 / ×1.12 (half-pixel rounding) |
| | `headingWeight` | **light**, bold | `font-weight-display` (brand title, the big readiness score) |
| Controls | `controlsNumeric` | **auto**, number, slider, slider-field, stepper | none (Field* components) |
| | `controlsChoice` | **auto**, dropdown, segmented, radio | none |
| | `controlsBoolean` | **auto**, checkbox, switch | none |

**Fonts.** The app is offline and the gzip budget had 0.6 kB of headroom, so no second family is embedded (a latin-subset variable Inter is
≈ 30–45 kB of base64 woff2, which gzip does not compress). Ubuntu stays the only embedded family (`fonts.css`); "System UI", "Serif" and
"Monospace numbers" are system stacks resolved from the operating system (`FONT_STACKS` in `typography.ts`).

### 6.3 Control variants (`ui/widgets/field`)

| Component | Variants | Accessibility | Falls back to the native rendering when |
|---|---|---|---|
| `FieldNumber` | number (`NumCell`), slider, slider + field, stepper (− value +) | `spinbutton`, `slider` with `aria-valuetext` (value + unit), a `group` named by the label; stepper buttons "Decrease / Increase <label>", disabled at a bound | `auto`, the variant is the native kind, or a slider is asked for a field without min and max |
| `FieldChoice` | dropdown, segmented buttons, radio group | a `radiogroup` named by the label, native radios sharing one name (arrow keys move and select); segmented hides the dot, keeps the focus ring | `auto` / dropdown, or fewer than 2 / more than 5 options |
| `FieldToggle` | checkbox, switch | the native checkbox with `role="switch"` and `aria-checked` (Space toggles) | `auto` / checkbox |

Each takes the props of the value (`label`, `value`, `min` / `max` / `step` / `unit`, `options`, `checked`), the commit callback, the
`native` kind and, as `children`, **the control exactly as it rendered before T3**, which is what `auto` renders. `bare` is for table
cells (no visible label, no field margins). Every variant calls the same callback as the native control, so the command, its label, the
undo step and the coalescing are unchanged (`tests/ui/field-variants.test.tsx` compares the document and the audit entry).

**Use sites.** The shared widgets render through them: `NumberInput`, `RangeInput`, `SelectInput`, `CheckInput` (`widgets/fields.tsx`),
`NumField`, `ChoiceField` (`CommitField.tsx`), `CoefInput` (both). Hence every section built on them, and the raw controls migrated in:
params (glass ceiling slider, force, technical cap), scurve (curve shape), team-in (total FTE; skill / grade / location / FTE cells),
ratecard (day-rate cells), loc-strat (target shares), token-econ (output share slider, model cells), risk (probability / impact),
readiness (questionnaire), engagement-context (context, discount rate), transform-params (industry, catalogue, inclusion, cross-cutting),
lc-weighting (switch, status, position slider), eligibility (prerequisite status, product profile). run-sizing, setup, knowledge and
scope-sel use the shared widgets only.

**Not migrated** (kept native on purpose or left for later): view-state controls (legend toggles of params, the funnel and monthly-playback
scrubbers, filters, search boxes, phase filter of scope-sel), pick lists of many checkboxes (scope-sel phase / artefact cards, norm lists,
team-in pins, persona / section tables), cells that carry an override colour (scope-sel adjust table, engagement-context coefficient
table), local drafts (knowledge domains editor), and the raw inputs of the other sections: strategies, monthly-playback, model-engine
verification / evidence, deps, defend (assumptions, due diligence), stress Monte Carlo, configure (board, personas), factory (model,
engineering, release pipeline), verifyA skill map, portfolio (products, waves, knowledge transfer), refshare io, shell top bar.

### 6.4 For T4 (Brand & theme screen)

- Keep a `ThemeAxes` object (all 15 keys, `AXIS_DEFAULTS` for a new case) next to the colour values in the case; validate an imported
  one with `isAxisValue()`.
- Apply it with `applyThemeAxes(axes)` and the base table `themeBase(def)` (since lot 5a, through `resolveAppTheme()`); for a live preview, `applyThemeAxes(axes,
  previewElement)` (CSS axes; set every axis on the container). The control variants follow `<html>` only: a preview of them needs a
  React context in `useThemeAxis`.
- Build the screen from `AXES` (`group`, `label`, `labels`, `axisValues()`); presets are partial `ThemeAxes`.
- The HTML snapshot embeds `axes.css`; to open with the case's look, apply the case's axes at boot.
## 7. Display modes (T2)

A display is a value set **over** the base theme: it never changes the case, and the default display (light, standard contrast, no option)
is the T1 look unchanged (no attribute on `<html>`, `tok()` of the default `Theme` returns `THEME_DEFAULT`; ui-parity shows no new divergence).

### 7.1 The value sets (`domain/theme/dark.ts`, `contrast.ts`, `modes.ts`)

| Display | How it is built |
|---|---|
| **dark** | dedicated values for the semantic roles (page `#0f131a` < surface `#171c24` < raised `#1e242e`: elevation lightens; off-white ink `#e6e8ec`, muted `#a9b1bd`; lines `#2e3542`…; header / KPI gradient `#163a6b` → navy; table head `#1c3a66`; business colours lifted for dark grounds: automation `#4fc6cc`, glass ceiling `#f08f94`, human supervision `#f5a865`, agentic `#b9a8ec`, ai `#62c6f2`, vFTE `#63d391`), the chart series (`chart-cat-1..8`), grid and axis, and the 35 translucent steps (tints on their dark base, shadows black and deeper, header overlays still white). The 154 raw scale steps are re-ranked by an OKLab lightness curve (`DARK_L`: white → L .235, page tints → .25-.31, text steps → .78-.91; hue kept, light chroma × .82, gamut-mapped), so a component still reading `primary-60` gets a dark blue tint and one reading `neutral-700` a light grey: a pair that read in light reads in dark. `color-scheme: dark` makes native controls dark. |
| **enhanced** | light: the text steps (OKLab L < .72) darkened by a fifth, ink `#1a1a1a`, muted `#404040`, lines `#8c8c8c` / `#6e6e6e` (>= 3:1), focus `#003d7a` 3px, white ring on the header. Dark: light steps lifted halfway to white, ink `#f5f6f8`, muted `#d2d7de`, lines `#6b7483`, deeper page. |
| **high** | black and white, like the Windows high-contrast themes: every scale step to the page or the ink (light: L >= .8 → white, the rest → a near-black of the same hue; dark: the reverse), all text roles black / white, lines in the text colour, header and table head black, hover light grey (light) / near black (dark), selected black / yellow, focus black / yellow 3px, shadows become 1px rings. Charts keep the standard sequential ramp, take paler / deeper diverging cells and a strong categorical series (`HIGH_CHART`). |
| **colour-blind safe charts** | `chart-cat-1..8` = Okabe & Ito (2008) order (blue, vermillion, bluish green, reddish purple, orange, sky, black, grey in light; lifted variants in dark and high). |
| **reduce motion** | `duration-fast` / `duration-base` = 0s; the same `!important` rule as `prefers-reduced-motion` keyed on `[data-ac-motion=reduce]`; no chart.js animation; the funnel replay does not autoplay. |

`displayTheme(spec, base)` composes them (dark, then the contrast delta, then the colour-blind series, then motion) over any base theme:
the dark scales are derived from the base theme's scales, so a T4 preset gets a dark variant without a second table.

### 7.2 Mechanism

- **CSS**: `npm run theme:gen` writes, after the default `:root` block, one block per display (`modesCss()`):
  `:root[data-ac-mode="dark"]`, `:root:not([data-ac-mode="dark"])[data-ac-contrast="enhanced|high"]`,
  `:root[data-ac-mode="dark"][data-ac-contrast="enhanced|high"]`, the four `[data-ac-cvd="on"]` blocks, `[data-ac-motion="reduce"]`.
  A role declared as `var(--ac-step)` in the default block follows the overridden step. `theme:check` and `theme-tokens.test.ts` cover them.
- **TS**: `resolveAppTheme(def, spec)` (§2.1): `tok()` of the resulting `Theme` reads base + display; its `base` (and `printTheme(def)`) is the
  theme without the display: **the Excel workbooks and the HTML report stay light** (they are printed).
- **Re-render** (lot 5a): `ui/display/store.ts` holds the preference, the system media queries and the resolved display; the theme provider resolves
  the theme under it, and a change re-renders what reads `useTheme()`. Nothing re-mounts (until lot 5a the shell keyed the section host on a display
  version, which threw away the section's local state). `ChartPanel` applies `chartTheme.ts` from the theme in effect: chart.js default text / line
  colours from `chart-axis` / `chart-grid` (the legacy defaults in the default display), no animation under reduced motion, and the colour-blind
  second channel, and updates the same chart instance (`chart.options = …; chart.update('none')`) when only the theme changed.
- `textColor(hex, bg)` darkens a data colour on a light background and lightens it on a dark one (to 4.5:1).

### 7.3 Colour-blind coverage

Every chart.js canvas goes through `ChartPanel`, so with the option on: the categorical series that read `chart-cat-*` switch to Okabe-Ito;
**line / radar series** get a dash pattern and a point style per series (8 of each), with points shown; **bar series** get a hatch per series
(series 1 solid, then diagonal, reverse diagonal, horizontal, vertical, grid, dots, cross; per-bar colour arrays get one per bar).
Not covered: series coloured by a business role (automation teal, glass-ceiling brick… keep their meaning, distinguishable by lightness and
the hatches / dashes), the SVG charts (funnel, S-curves, Gantt, dependency graph: their series follow the palette but get no pattern), and
data colours the user picks (persona groups, products). Content tints (`bg` of a rich-content card) are re-ranked like the dark
scale steps in dark mode (`ui/display/dataColor.ts`).

### 7.4 Contrast validation

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

### 7.5 The viewer's preference

`ui/display/prefs.ts`: `{ mode: light | dark | auto, contrast: standard | enhanced | high, reduceMotion, cvd }` in localStorage
`agentcase.display` (try / catch; a missing, blocked or malformed entry gives light / standard), **never in the case, never undoable**.
"Auto" follows `prefers-color-scheme` live, and `prefers-contrast: more` lifts standard to enhanced; reduced motion is on when either the
option or `prefers-reduced-motion` asks. The top-bar **Display** control (◐) discloses native radios and checkboxes.
The **HTML snapshot** does not carry the author's attributes: it opens in its viewer's preference, light by default, auto honours the
viewer's system. The report and the Excel workbooks are always light.

### 7.6 What still reads raw scale steps, and notes for T3 / T4

- Moved to roles in T2: the glossary category bands (`text-on-data`: white on a data colour in every mode), the chart.js series and SVG chart / Gantt / dependency-graph colours that equalled a `chart-cat-*` value (82
  reads in 18 files), the persona table header note (`table-head-note`), the header / KPI focus ring (`focus-header`).
- Still on raw steps (about 450 `var(--ac-<scale>-<step>)` in CSS / inline styles and ~180 `tok('<scale>-<step>')`): status tints of
  callouts and badges (`warning-55`, `danger-75`…), the coloured left rails, the scope / tune card accents, the domain read-outs (status
  bands, scenario colours). They work in every display through the re-ranked scales; under **high** they collapse to black / white (by
  design), so colour-only distinctions in those places (Gantt bars that read business steps, status tints) disappear there.
- T3 (shapes, density, typography) only touches non-colour tokens: no interaction with the display sets, except `focus-width` (3px at
  enhanced / high) and the shadows (rings at high).
- T4 (presets, brand colours, logo palette): the preset is the base of `resolveAppTheme()`, which recomputes the display with
  `themedDisplay(spec, def, base)`; the CSS side needs the same: a preset must also emit its dark / contrast blocks (run `modesCss()` on the
  preset, or write the computed `displayTheme()` values as inline custom properties on `<html>`). A preset's brand colours must be
  re-checked by the contrast test (run it on the preset table). The exports read the base theme (`printTheme()`, `argb(print, …)`).

## 8. Theme library and brand (T4 + T5)

A case carries a **theme library**: seven built-in themes shipped with the app and the themes the user creates. The active theme paints the
app, the HTML snapshot, the HTML report and the Excel workbooks for everyone who opens the case; the display (light / dark, contrast,
colour-blind charts, motion) stays each viewer's own choice (§7.5). The default theme, **1 · Capgemini**, is the look of §1-§7 token for token:
it has no override at all, writes nothing on `<html>`, and ui-parity is unchanged.

### 8.1 The model (`domain/theme/themeDef.ts`, `derive.ts`)

`ThemeDef = { seq, id, name, builtin, diagnostic?, description?, colours, axes }`:

| Field | Content |
|---|---|
| `seq` | stable sequence id, unique in the case and never reused: built-ins 1-7, user themes from 100 up (`THEME_SEQ` keeps the last one issued; a high-water mark that undo, redo and remote changes never lower) |
| `colours` | partial: a **scale anchor** (`primary`, `secondary`, `info`, `teal`, `success`, `warning`, `danger`, `neutral`, `slate`) or a **role** (`ROLE_GROUPS`: surfaces `bg` / `surface` / `surface-raised` / `line-strong`, header gradient and text, KPI bar, sidebar, `selected`, table head / stripe, `ink` / `text-heading` / `text-link` / `focus`, the business colours `automation` / `glass-ceiling` / `human-supervision`, `chart-cat-1..8`) |
| `axes` | partial `ThemeAxes` (§6); fonts are the typography axes (no separate font field) |

**Scale derivation** (`familyFrom(family, anchor)`): the family is re-derived from its **default steps**, so the legacy near-duplicates keep their
relationships. Each step's OKLab lightness goes through a monotone map that puts the anchor step on the anchor's lightness (steps lighter than
the anchor step are spread over [L(anchor), 1], darker ones over [0, L(anchor)]); its hue turns by the anchor's hue shift and its chroma scales
by the anchor's chroma ratio (an achromatic family such as `neutral` takes the anchor's chroma and hue); the result is gamut-mapped
(`fromOklch`). The anchor step is the anchor colour exactly; white and black stay white and black; the steps stay ordered by lightness
(`tests/domain/theme-library.test.ts`). The translucent steps of a re-derived family are re-made on their new base. A theme with any colour also
points `focus-header` at `{header-text}` (the legacy brand-blue ring on the blue header is 1:1; §7.4).

`themeOverrides(def)` = the changed tokens only (empty for Capgemini); `themeBase(def)` = THEME_DEFAULT + overrides + `axisTokens(axes)` (the
very `THEME_DEFAULT` object for Capgemini).

### 8.2 Display modes of a theme and the run-time mechanism

`themedDisplay(spec, def)` (`themedDisplay.ts`) = `displayTheme(spec, themeBase(def))` (§7: the theme's own scales re-ranked for dark and the
contrast levels), then: the dedicated role values of dark / enhanced, chosen for the default blue, **turn to the theme's hue** (brand-tinted
roles by the primary anchor's hue shift, surfaces and lines by the slate anchor's); a chrome background the theme sets (header, KPI bar,
table head, selected) is deepened to L ≤ .40 in dark and darkened by a fifth at light enhanced, like a text colour it sets (business colours,
link, heading, focus: darkened by a fifth at light enhanced, so a 4.5:1 colour reaches the 7:1 of that level); business colours, links, focus and chart
series it sets are lifted to L ≥ .78 / .72 in dark standard. **High contrast stays black and white** for every theme; the colour-blind series
are not touched.

**Applying a theme (chosen mechanism: inline custom properties).** `ui/brand/ThemeRuntime.tsx` (`ThemeProvider`, around the shell) resolves the theme
in effect (the `?theme=` link's, else the case's active one) and, on every theme or display change:
1. resolves it with the pure `resolveAppTheme(def, spec)` (§2.1) and provides the result to the tree (`useTheme()`: charts and colour arithmetic);
   the exports get the print theme of the same library theme from their controller (`controllers/exportTheme.ts`: the Excel workbooks and the HTML
   report follow the theme, still light);
2. writes the 286 colour tokens (`COLOUR_TOKENS`) of base + display as **inline custom properties on `<html>`** (`colourProps()`): inline beats
   the generated display blocks of tokens.css, so the set already carries the display; the default theme (and a theme with axes only) removes
   them all and the `style` attribute, so the generated CSS paints the app exactly as before;
3. `applyThemeAxes(def.axes)` on `<html>` (the `data-ac-*` attributes of §6).
Nothing is re-mounted (lot 5a): the components that read the theme re-render, chart.js canvases are updated in place.

The alternative (a generated per-theme `<style>` with one block per display) was not chosen: it duplicates the `modesCss()` generation at run
time for every theme, and the inline set is recomputed in well under a frame.

**Preview container** (`applyPreviewTheme()`): **every** token of base + display inline on the container (`allTokenProps()`), so the preview is
independent of the app's own theme and axes; `color-scheme` follows its Light / Dark toggle; the `Field*` controls inside follow the previewed
axes through `ThemeAxesContext` (`useThemeAxis()` reads the context first, `<html>` otherwise).

### 8.3 The built-in catalogue (`catalogue.ts`)

Protected: they can be activated, duplicated and exported, never edited or deleted. Generic colour themes: no company logo, typeface or
trademark styling.

| seq | Name | Key colours |
|---|---|---|
| 1 | Capgemini | the default look (brand blue #0058AB, navy header / KPI bar); no override |
| 2 | Orange | primary #B84A00, charcoal header #2B2B2B → #111111, orange KPI bar #B84A00 → #8A3600, charcoal table head, grey slate #52555B, white surfaces |
| 3 | Sprint | green primary / header / KPI bar #16693A → #0B3D20 |
| 4 | Rainbow | **diagnostic**: header red, KPI bar orange (black text), sidebar yellow, group bar lime, selected teal, page cyan, section card lavender, primary violet (callouts, buttons, links, key figures), table head blue, stripes pink, input / card borders green, focus magenta, chart series red → pink; a legend card (zone → token → colour) on the screen |
| 5 | Sepia | brown primary #7A4A24, brown ink #3B2E22, warm slate #5E5040, paper page #F3EAD7 / white cards and a warm section card #FFFDF8 (the content's data colours are tuned for white), warm sidebar #FFFCF5, brown header, low-saturation chart series |
| 6 | Dark red | burgundy primary / header / KPI bar #8B1A2B → #3D0A12 |
| 7 | Purple | violet primary / header / KPI bar #5B2A9E → #25104A |

`tests/ui/theme-catalogue.test.ts` runs the §7.4 pairs on every built-in except Rainbow in light / dark x standard / enhanced / high (all
pass); Rainbow is checked for readable text (4.5:1) on each zone it paints and for one distinct colour per zone. The business colours keep
their meaning in every built-in (the Dark red primary sits close to the glass-ceiling brick by design of the brief; the two never share a
role). A real-browser axe run (colour contrast included) over every section of the golden case under Orange, Sprint, Sepia, Dark red and
Purple, light and dark: see the T4/T5 changelog entry.

### 8.4 The library in the case (`library.ts`, `controllers/themes.ts`)

Document keys (common to all products of a portfolio): `THEMES` (user themes `{ seq, name, description?, colours, axes }`), `ACTIVE_THEME`
(absent = 1), `THEME_SEQ` (last id issued). A default case has none of them, so older files and the default case are unchanged. Everything
read from a document, a file or a sheet goes through `parseTheme()`: only known colour keys with `#rgb` / `#rrggbb` values, only `AXES`
values (`isAxisValue`), other keys dropped with a note; a built-in or duplicate `seq` is dropped.

Undoable commands: `theme.add` (from the default look), `theme.duplicate` (any theme, "<name> copy"), `theme.import`, `theme.rename`,
`theme.generate` (the one-colour palette generator, §8.9: every colour replaced and the settings kept, one step), `theme.update` (a colour / axis value sets the override, `null` or the axis default removes it; successive edits of one control coalesce into
one step, a reset is a step of its own), `theme.delete` (not a built-in; deleting the active theme falls back to 1), `theme.activate`
(activating 1 removes the key). Names are made unique ("Purple 2").

### 8.5 Files and workbooks

- **Case JSON / HTML snapshot**: the keys travel with the case; the snapshot opens in the case's theme (and honours `?theme=`).
- **Theme files** (`themeFile.ts`): `{ "_schema": "agentcase.themes.v1", "themes": [ { seq, name, description?, colours, axes, generator? } ] }`, one theme
  (Export) or the user themes (Export library); importing validates every value, ignores unknown keys with a note, caps the file at 256 KB and
  50 themes, and gives each theme a fresh sequence id.
- **Parameters workbook**: sheet **Themes** (`Theme Seq`, `Theme Name`, `Setting`, `Value`; settings `name`, `description`, `colour:<key>`,
  `axis:<axis>`, `generator:seed` / `generator:contrast` / `generator:harmony`, plus the rows "Active theme" and "Last sequence id"), written only when the case has a user theme or another active theme
  than 1: a default case exports the legacy workbook unchanged. A workbook without the sheet leaves the case's library as it is.

### 8.6 Customer logo (client presentations)

Set in **Engagement context**, next to the customer name: PNG, JPEG or SVG up to 200 KB. Only a PNG / JPEG base64 data URL is stored
(`CUSTOMER_LOGO = { src, backdrop: none | pill, hidden }`); an SVG is drawn into a canvas and stored as PNG (an `<img>` runs no SVG script and
only the pixels reach the case). Commands `case.setLogo`, `case.clearLogo`, `case.setLogoOptions` (undoable). Shown next to
"AgentCase for <customer>" in the header (≈ the title's cap height, alt "<customer> logo"), optionally on a white pill (for dark headers and
dark mode), hidden for a presentation without losing it; above the title of the HTML report (single case and portfolio); in the HTML snapshot
(with the case); on the ROI sheet of the results workbook (48 px high, its own aspect ratio). Not in the parameters workbook (an image does not
fit a cell).

### 8.7 `?theme=<seq>` links

At boot (`initThemeLink()`, main.tsx) a `?theme=<n>` query is a **view override**: the page shows that theme without changing the case (no
command, no history step, nothing saved). A notice "Viewing theme N · name from the link." offers **Make it the case theme** (an undoable
`theme.activate`) and **Clear** (drops the override and the query). An unknown or malformed number shows a message and is ignored. The
Brand & theme screen shows the `?theme=<seq>` of the selected theme with a Copy button. While the override is on, the exports use the viewed
theme.

### 8.8 The 🎨 Brand & theme screen (`ui/sections/configure/brand-theme/`)

An app section (no legacy equivalent: outside the legacy catalogue and the legacy-shaped workbook sheets, `app: true` in sectionCatalog.json),
in CONFIGURE (Business journey: Reference), shown to Admin, Builder, Business journey and Advanced. Left: the library (number, name, Built-in /
Diagnostic / Active badges; Activate, Duplicate, Export, Delete, Rename; the share link; New theme, Import…, Export library). Centre: the
editor of the selected theme, read-only for a built-in ("Duplicate to edit"): for a user theme the **Generate from one colour** panel first (§8.9), then colours by group with a picker, the value, a **live contrast
badge** (AAA / AA / AA large / Fail with the ratio of the pair the colour paints, `themeChecks.ts`) and a warning line per failing pair (a
warning, not a block), a summary of failing pairs, then the axes built from `AXES`. Right: the live preview (header with logo and title, KPI
bar, navigation, section card with a callout, key figures, a table, an SVG chart of the 8 series, a slider, a choice, a toggle, a text field and
buttons) with its own Light / Dark toggle.

### 8.9 Generate a palette from one colour (`domain/theme/palette.ts`, `paletteParts.ts`, `generatorSettings.ts`)

`paletteFromSeed(seed, { contrast: 0..100, harmony?: 'mono' | 'analogous' | 'complementary' | 'triadic' })` returns **every** colour key a
theme can set (`COLOUR_KEYS`: the 9 scale anchors and all the roles of `ROLE_GROUPS`). Pure and deterministic; computed in OKLCH (`color.ts`),
gamut-mapped by `fromOklch` (lightness and hue kept, chroma reduced).

| Output | How it is derived (h = seed hue, C = seed chroma; "fit" = darkened in .005 L steps until it reaches the ratio on its backgrounds) |
|---|---|
| `primary` | the seed itself when white text reads on it at >= 5:1 (so `text-on-primary` and `hover-text` on the `primary-60` hover tint pass, and the enhanced level reaches 7:1); otherwise the seed fitted to 5:1 (hue and chroma kept, only darker): `#ffff66` → `#73730d` |
| `secondary`, `info` | the accents (agentic build, AI): h turned by the harmony (mono ±14°, analogous ±40°, complementary +180° / +150°, triadic +120° / +240°), chroma halfway between the default accents' and the seed's, fitted to 4.6:1 as text |
| `teal`, `success`, `warning`, `danger` | the default anchor (teal 207°, green 134°, orange 44°, brick 21°), its hue pulled a fifth of the way toward h but capped (±14°, ±12°, ±7°, ±7°: they stay teal, green, amber / orange, red), chroma a quarter of the way toward C, fitted to 4.6:1. A grey seed (C < .03) leaves them on their default hue and chroma |
| `automation`, `glass-ceiling`, `human-supervision` | = `teal`, `danger`, `warning` (the business meaning is the family's) |
| `neutral`, `ink`, `sidebar-text` | greys tinted by h at a very low chroma (min(.012, C × .12)); `neutral` (ink step 900) and `ink` darken with the slider |
| `slate` | h at a low chroma (.012 + C × .15, ≤ .045), fitted to 4.6:1 |
| surfaces | `bg`, `surface`, `surface-raised`, `sidebar-bg`, `sidebar-group-bg`, `table-stripe`, `line-strong`: near-white tints of h (chroma scaled by min(1, C / .08): none for a grey seed) |
| chrome | `header-start` / `-end`, `kpibar-start` / `-end`, `selected`, `table-head-bg`: h at the seed chroma, fitted to 4.6:1 under white text (the table head also to 5.2:1 under its note, `primary-200`); `header-text`, `kpibar-text`, `table-head-text` white; `sidebar-group-text` fitted to 7:1 on the group bar |
| `text-heading`, `text-link`, `focus` | h, fitted to 4.6:1 (focus 3.2:1) on the page, the surface and white |
| `chart-cat-1..8` | 8 hue offsets from h per harmony (mono: h ±25° / ±50° on a light and a deep tier; analogous: 0, ±35, ±70, ±105, 180; complementary and triadic around their poles), one even lightness and chroma per slider position, each fitted to 3:1 (graphics) on the page |

**The contrast slider** moves every profile through three points — **0 Soft** (pastel tinted page L .955, soft-white surfaces, lighter header
L .56 → .40, ink L .33, gentle chart chroma .085 at L .66), **50 Balanced** (the profile of the default Capgemini look: white surfaces, page
L .97, header L .46 → .24 like `primary-700` → `primary-975`, ink L .29, chart chroma .13 at L .57), **100 Strong** (white surfaces, header L .34
→ .16, ink L .18, saturated accents (chroma × 1.15), visible lines (`line-strong` L .70), chart chroma .17 at L .50). Text is fitted to at least AA
at every position (the fit thresholds above). Measured minimum over 32 seeds, light standard — Soft: ink on surface 11.9:1, muted on page
4.6:1, header text 4.6:1, links 5.5:1; Balanced: 14.0, 5.5, 6.7, 7.0 (the default look: 12.6, 5.5, 7.0, 7.0); Strong: 18.7, 7.4, 11.2, 9.6 (AAA). The ratios of ink on
the surface and of the header text on the header never decrease along the slider (tested). The screen words the value Soft (0-33),
Balanced (34-66), Strong (67-100).

**Guarantee.** `paletteFailures(p)` runs the §7.4 pairs (`domain/theme/contrastPairs.ts`, also used by the contrast tests) on the palette's
tables in light and dark × standard / enhanced / high, built by `themeBase` + `themedDisplay` (§8.2). `paletteFromSeed` returns the first
palette that passes, trying the asked contrast and then +10 steps up to 100. On 30 seeds (very light `#ffff66`, `#ffffff`, `#f0f0f0`, very dark
`#101010`, `#000000`, grey `#808080`, `#c0c0c0`, saturated `#ff00ff`, `#00ff00`…) × 0 / 25 / 50 / 75 / 100 × 4 harmonies, and 60 random
seeds and slider values (fast-check), every palette passes, already before the guard (`tests/domain/theme-palette-contrast.test.ts`).
One check costs ≈ 20 ms, so a slider drag stays live.

**Model and persistence.** A user theme carries the last applied settings, `generator: { seed, contrast, harmony }` (optional,
`parseGenerator`: a seed that is not a colour drops the block with a note, a bad contrast is clamped to 0..100, a bad harmony falls back to
analogous). It travels in the case JSON, the theme files and the Themes sheet (`generator:<field>` rows); older files, without it, load
unchanged. `theme.generate` (label "Generate palette from #rrggbb (contrast N)") replaces **all** the theme's colours with the palette and
stores the settings: one undo step restores the previous colours; built-ins are refused (no step).

**Screen.** For a user theme, the editor opens with **Generate from one colour**: a seed colour picker (default: the theme's last applied seed,
else its primary colour), the **Palette contrast** range 0-100 (step 5, `aria-valuetext` "60, Balanced", value shown beside it), a **Harmony**
radio group shown as a segmented choice (Monochrome / Analogous / Complementary / Triadic, default Analogous), a strip of the generated
anchors, page, ink and the 8 series (each swatch with its name and hex), **Apply to theme** and, while trying, **Discard preview**. Changing a
setting is a **draft** of the screen's view state (never in the case): the live preview shows the generated palette at once ("generated
palette, not applied"); Apply writes it. The colour pickers below stay editable after applying (fine-tuning; the settings stay on the theme).
Built-in themes keep "Duplicate to edit" and show no panel.

