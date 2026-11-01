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
  // DATA, not code: the help / reference texts (src/content) and the generated dependency graph (src/generated). The UI and the domain read them;
  // they import nothing. Classified so that no file of src/ is outside a layer (`boundaries/no-unknown-dependencies`).
  { type: 'content', pattern: 'src/content/**' },
  { type: 'generated', pattern: 'src/generated/**' },
];
// The entry file is classified as a file (eslint-plugin-boundaries 7: element descriptors match folders, single files are file descriptors).
const files = [{ pattern: 'src/main.tsx', category: 'entry' }];
const allow = (from, to) => ({ from: { element: { type: from } }, allow: { to: { element: { type: to } } } });
const DATA = ['content', 'generated'];

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
},
// EDIT BASE (data flow) — `const s = appStore().getState(); s.doc` and `const { doc } = s` read the derived case as surely as `getState().doc`:
// every variable initialised with a `getState()` call is followed through its references.
'no-derived-doc': {
  meta: { type: 'problem', schema: [{ type: 'string' }], messages: { doc: '{{msg}}' } },
  create(context) {
    const msg = context.options[0] ?? 'Do not read getState().doc.';
    const isGetState = (n) => n?.type === 'CallExpression' && ((n.callee.type === 'MemberExpression' && n.callee.property.name === 'getState') || n.callee.name === 'getState');
    const isDocKey = (p) => (p.type === 'Identifier' && !p.computed) || p.type === 'Literal' ? (p.name ?? p.value) === 'doc' : false;
    const report = (node) => context.report({ node, messageId: 'doc', data: { msg } });
    return { VariableDeclarator(node) {
      if (!isGetState(node.init) || node.id.type !== 'Identifier') return;
      for (const v of context.sourceCode.getDeclaredVariables(node)) {
        for (const ref of v.references) {
          const id = ref.identifier, up = id.parent;
          if (up?.type === 'MemberExpression' && up.object === id && (up.computed ? up.property.type === 'Literal' && up.property.value === 'doc' : up.property.name === 'doc')) report(up);
          if (up?.type === 'VariableDeclarator' && up.init === id && up.id.type === 'ObjectPattern' && up.id.properties.some((p) => p.type === 'Property' && isDocKey(p.key))) report(up);
        }
      }
    } };
  },
},
// `import()` escapes `no-restricted-imports`: the same module patterns (as regular expressions) apply to dynamic imports.
'no-restricted-dynamic-import': {
  meta: { type: 'problem', schema: [{ type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, message: { type: 'string' } } } }], messages: { dyn: '{{msg}}' } },
  create(context) {
    const rules = (context.options[0] ?? []).map((r) => ({ re: new RegExp(r.pattern), msg: r.message }));
    return { ImportExpression(node) {
      const src = node.source.type === 'Literal' ? node.source.value : node.source.type === 'TemplateLiteral' && !node.source.expressions.length ? node.source.quasis[0].value.cooked : null;
      const hit = typeof src === 'string' && rules.find((r) => r.re.test(src));
      if (hit) context.report({ node, messageId: 'dyn', data: { msg: hit.msg } });
    } };
  },
},
} };
// Store modules the UI may not import (write path, internals); each is restricted by alias and by any relative path.
// `portfolioState` (runCommands, deriveDoc, editBaseOf) and `editBase` are controller-side reads of the write path's state.
const UI_FORBIDDEN_STORE = ['core', 'commands', 'instance', 'derive', 'history', 'syncDraft', 'persistence', 'persistence/**', 'address', 'address/**', 'portfolioState',
  'editBase'];
const UI_STORE_MSG = 'UI code must not touch the store directly: read with @/store/hooks, write through @/controllers/*.';
/** The store modules `mods` (`x/**`: x and below) as one regular expression over an import source (`@/store/x`, `../store/x`), for `import()`. */
const storeRe = (mods) => `(^|/)store/(${mods.map((m) => m.replace('/**', '(/.*)?')).join('|')})$`;
const UI_DYNAMIC = [{ pattern: storeRe(UI_FORBIDDEN_STORE), message: UI_STORE_MSG }];
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
      'boundaries/files': files,
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      // FX-77: eslint-plugin-react-hooks 7 adds the React Compiler rules to `recommended`; the app does not use the React Compiler, so it keeps
      // the two rules of 5.x (the rules of hooks, the dependency lists) and leaves the compiler's diagnostics off.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // G2 — no code file over 150 lines (blank lines and comments count).
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
      // D1 — a line over 160 characters is a warning (target: none), whatever it holds: code, strings, template or regex literals, comments (a long
      // literal is split with `+`, a long text becomes a constant); over 300 is an error for every line (`local/hard-max-len`). One exemption only,
      // `ignorePattern`: a line that is nothing but a URL (optionally quoted or after `//` / `*`, with a trailing `,` `;` `)`), which cannot be broken.
      // Not `ignoreUrls` (it exempts any line that merely CONTAINS a URL), nor `ignoreStrings` / `ignoreTemplateLiterals` / `ignoreRegExpLiterals`
      // (each exempts any line that contains such a literal, i.e. most long lines).
      'max-len': ['warn', { code: 160, ignorePattern: '^\\s*(?:(?://|\\*)\\s*)?[\'"`]?https?://\\S+?[\'"`]?[,;)]*$' }],
      'local/hard-max-len': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Never inject raw HTML (XSS surface of the legacy app).' },
      ],
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          allow('domain', ['domain', ...DATA]),
          allow('store', ['store', 'domain']),
          allow('controllers', ['controllers', 'store', 'domain']),
          allow('ui', ['ui', 'controllers', 'store', 'domain', ...DATA]),
          { from: { file: { categories: 'entry' } }, allow: [{ to: { element: { type: ['ui', 'store', 'controllers', 'domain'] } } }, { to: { file: { categories: 'entry' } } }] },
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
      'local/no-derived-doc': ['error', EDIT_BASE],
      'local/no-restricted-dynamic-import': ['error', [{ pattern: storeRe(['hooks']), message: 'Controllers are not React: read the case with editBase() / activeDoc().' }]],
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
        { group: UI_FORBIDDEN_STORE.flatMap((m) => [`@/store/${m}`, `**/store/${m}`]), message: UI_STORE_MSG },
        // the simulation modules are read through their hooks; their writable stores are written by the controllers only
        { group: ['@/store/simulation', '**/store/simulation'], importNames: ['simStore'], message: UI_STORE_MSG },
        { group: ['@/store/portfolioSimulation', '**/store/portfolioSimulation'], importNames: ['pfSimStore'], message: UI_STORE_MSG },
      ] }],
      'local/no-restricted-dynamic-import': ['error', UI_DYNAMIC],
    },
  },
);
