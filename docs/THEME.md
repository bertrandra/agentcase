# AgentCase — Theme tokens

Every visual value of the app (colour, font, size, weight, line height, radius, border width, shadow, control padding, motion) is a
**design token**. The default theme is the legacy v18.13 look, value for value: switching to the token set changed no pixel
(`tools/ui-parity.mjs`, the legacy-value guards and a screenshot comparison of every section).

This page is step T1 of the configurable-theme programme:

| Step | Scope | What it changes |
|---|---|---|
| **T1** (done) | the token set; no literal outside the token files | nothing visible |
| T2 | dark mode, contrast levels, chart palettes, per-user preference | token **values** only |
| **T3** (done, §6) | shapes, density, typography, box style; `Field*` controls with variants | token values, plus the new controls |
| T4 | "Brand & theme" screen: presets, live preview, logo, palette from logo, import / export; theme stored in the case and applied to the HTML snapshot, the report and the Excel workbooks | token values |

## 1. Where the tokens live

| File | Role |
|---|---|
| `app/src/domain/theme/scales.ts` | colour scales (one per role) and their translucent steps |
| `app/src/domain/theme/semantic.ts` | semantic roles (surfaces, text, chrome, tables, business colours), charts, exports |
| `app/src/domain/theme/shape.ts` | typography, shape (radius, borders, shadows), density (paddings), motion |
| `app/src/domain/theme/index.ts` | `THEME_DEFAULT`, `TokenName`, `tok()`, `alpha()`, `argb()`, `themedList()`, `setActiveTheme()`, `themeCss()` |
| `app/src/ui/theme/tokens.css` | the same table as CSS custom properties `--ac-<name>`, **generated** (`npm run theme:gen`) |
| `app/src/domain/theme/layout.ts` | the T3 tokens the axes switch (block spacing, box style, button / control shape, key figures, numeric figures), pre-T3 values |
| `app/src/domain/theme/axes.ts`, `variants.ts`, `typography.ts`, `axesCss.ts` | the theme axes (§6): values, defaults, labels, token sets, the generator of `axes.css` |
| `app/src/ui/theme/axes.css` | one block per non-default axis value, **generated** in full (`npm run theme:gen`) |
| `app/src/ui/themeAxes.ts`, `app/src/ui/widgets/field/` | applying / reading the axes at run time; the `Field*` controls and their variants |

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
| `tok()` | `axisTokens(axes)` = the merged token set; a theme calls `setActiveTheme({ ...colourValues, ...axisTokens(axes) })` (charts, exports). |

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
- Apply it with `applyThemeAxes(axes)` and `setActiveTheme({ ...colours, ...axisTokens(axes) })`; for a live preview, `applyThemeAxes(axes,
  previewElement)` (CSS axes; set every axis on the container). The control variants follow `<html>` only: a preview of them needs a
  React context in `useThemeAxis`.
- Build the screen from `AXES` (`group`, `label`, `labels`, `axisValues()`); presets are partial `ThemeAxes`.
- The HTML snapshot embeds `axes.css`; to open with the case's look, apply the case's axes at boot.
