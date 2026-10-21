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
);
