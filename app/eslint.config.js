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

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'fixtures'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, boundaries },
    settings: {
      'boundaries/elements': layers,
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // G2 — no code file over 150 lines (blank lines and comments count).
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
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
    files: ['src/ui/sections/portfolio/**/*.{ts,tsx}', 'src/store/consolidationHooks.ts', 'src/ui/shell/ScopeKpis.tsx', 'src/ui/shell/ScopeSelect.tsx', 'src/ui/sections/verify/gantt/Wave*.tsx'],
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
    // G4 — the UI never writes state: it reads through `@/store/hooks` and acts through `@/controllers/*` only.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['@/store/core', '@/store/commands', '@/store/instance', '@/store/derive', '@/store/persistence/*'],
          message: 'UI code must not touch the store directly: read with @/store/hooks, write through @/controllers/*.' },
      ] }],
    },
  },
);
