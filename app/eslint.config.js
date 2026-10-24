import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';

// Layer rule (plan §3): ui -> controllers -> store -> domain. Dependencies point down only.
const layers = [
  { type: 'domain', pattern: 'src/domain/**' },
  { type: 'store', pattern: 'src/store/**' },
  { type: 'controllers', pattern: 'src/controllers/**' },
  { type: 'ui', pattern: 'src/ui/**' },
  { type: 'entry', pattern: 'src/main.tsx', mode: 'file' },
];
const allow = (from, to) => ({ from, allow: to });

// D1 (readability) — a source line is at most 300 characters, whatever it holds (an error); over 160 is a warning (`max-len` below). A local rule because
// ESLint's `max-len` takes one limit per configuration. Characters are counted as code points (an emoji is one).
const HARD_MAX_LEN = 300;
const local = { rules: { 'hard-max-len': {
  meta: { type: 'layout', schema: [], messages: { long: 'This line has {{n}} characters; the hard limit is ' + HARD_MAX_LEN + ' (decision D1): extract a constant, a helper or a component.' } },
  create(context) {
    return { Program() {
      context.sourceCode.lines.forEach((line, i) => {
        const n = [...line].length;
        if (n > HARD_MAX_LEN) context.report({ loc: { start: { line: i + 1, column: 0 }, end: { line: i + 1, column: line.length } }, messageId: 'long', data: { n } });
      });
    } };
  },
} } };
// Store modules the UI may not import (write path, internals); each is restricted by alias and by any relative path.
const UI_FORBIDDEN_STORE = ['core', 'commands', 'instance', 'derive', 'history', 'syncDraft', 'persistence', 'persistence/**', 'address', 'address/**'];
const EDIT_BASE = 'Controllers never read getState().doc (the active product\'s case): compute in the command\'s run(draft), or use editBase() / activeDoc() from @/store/editBase.';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'fixtures'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, boundaries, local },
    settings: {
      'boundaries/elements': layers,
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // G2 — no code file over 150 lines (blank lines and comments count).
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
      // D1 — lines over 160 characters are a warning (long string, template or regex literals and URLs excepted); over 300 is an error for every line.
      'max-len': ['warn', { code: 160, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }],
      'local/hard-max-len': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Never inject raw HTML (XSS surface of the legacy app).' },
      ],
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          allow('domain', ['domain']),
          allow('store', ['store', 'domain']),
          allow('controllers', ['controllers', 'store', 'domain']),
          allow('ui', ['ui', 'controllers', 'store', 'domain']),
          allow('entry', ['ui', 'store', 'controllers', 'domain']),
        ],
      }],
    },
  },
  {
    // A8 (spec 11) — no portfolio figure is computed outside `domain/portfolio`: no `.reduce(` (the way sums are written) in the portfolio sections,
    // the portfolio KPI hooks / tiles and the wave Gantt. Presentation helpers that do not add money up (formatting, sorting, mapping) are fine.
    files: ['src/ui/sections/portfolio/**/*.{ts,tsx}', 'src/store/consolidationHooks.ts', 'src/store/portfolioSimulation.ts', 'src/ui/sections/verdict/decision/Portfolio*.tsx', 'src/ui/shell/ScopeKpis.tsx', 'src/ui/shell/ScopeSelect.tsx', 'src/ui/sections/verify/gantt/Wave*.tsx',
      // Vue agrégée: the generic tables / fallbacks, the Vue hooks and every section aggregate (`Aggregate*.tsx` or an `aggregate/` folder beside the section) show domain totals, never their own sums
      'src/ui/widgets/{AggregateTable,ProductDrill,ScopeBanner}.tsx', 'src/ui/zones/{fallbacks.tsx,useScopedSection.ts}', 'src/store/{viewScope,selectionHooks}.ts', 'src/ui/sections/**/Aggregate*.{ts,tsx}', 'src/ui/sections/**/aggregate/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Never inject raw HTML (XSS surface of the legacy app).' },
        { selector: "CallExpression[callee.property.name='reduce']", message: 'A8: portfolio figures are summed in domain/portfolio (consolidate, waves, headline), never in the UI or its hooks.' },
        { selector: "CallExpression[callee.property.name='reduceRight']", message: 'A8: portfolio figures are summed in domain/portfolio (consolidate, waves, headline), never in the UI or its hooks.' },
      ],
    },
  },
  {
    // EDIT BASE — a controller never reads the store's derived `doc` (the ACTIVE product's case): with "Change: All products" in a Portfolio / Wave view
    // the commands run on the COMMON case, and a payload computed from the active product would leak its values into the common ones. Compute inside
    // the command's `run(draft)`, or read `editBase()` (the case the command runs on) / `activeDoc()` (exports) from `@/store/editBase`.
    files: ['src/controllers/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Never inject raw HTML (XSS surface of the legacy app).' },
        { selector: "MemberExpression[property.name='doc'][object.type='CallExpression'][object.callee.property.name='getState']", message: EDIT_BASE },
        { selector: "VariableDeclarator[init.callee.property.name='getState'] > ObjectPattern > Property[key.name='doc']", message: EDIT_BASE },
      ],
      // Each rule names the alias and its relative spellings (`../store/hooks`, `../../store/portfolioState`), so a relative path cannot bypass it.
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/store/hooks', '**/store/hooks'], message: 'Controllers are not React: read the case with editBase() / activeDoc() from @/store/editBase.' },
        { group: ['@/store/portfolioState', '**/store/portfolioState'], importNames: ['deriveDoc'], message: EDIT_BASE },
      ] }],
    },
  },
  {
    // G4 — the UI never writes state: it reads through `@/store/hooks` and acts through `@/controllers/*` only. The relative spellings
    // (`../store/core`, `../../store/persistence/html/...`) are restricted too, so a relative path cannot bypass the layering.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: UI_FORBIDDEN_STORE.flatMap((m) => [`@/store/${m}`, `**/store/${m}`]),
          message: 'UI code must not touch the store directly: read with @/store/hooks, write through @/controllers/*.' },
      ] }],
    },
  },
);
