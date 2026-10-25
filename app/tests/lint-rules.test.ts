import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [r] = await eslint.lintText(code, { filePath });
  return r!.messages.map((m) => m.ruleId);
}
describe('architecture lint rules (G2, G4, edit base)', () => {
  it('UI code cannot import the store write path', async () => {
    expect(await lint("import { appStore } from '@/store/instance';\nexport const x = appStore;\n", 'src/ui/Bad.tsx')).toContain('no-restricted-imports');
    expect(await lint("import { createAppStore } from '@/store/core';\nexport const x = createAppStore;\n", 'src/ui/Bad.tsx')).toContain('no-restricted-imports');
  });
  it('UI code cannot reach the store write path through a relative path either', async () => {
    const bad = [['../store/core', 'src/ui/Bad.tsx'], ['../../store/core', 'src/ui/shell/Bad.tsx'], ['../../store/commands', 'src/ui/shell/Bad.tsx'],
      ['../../../store/instance', 'src/ui/sections/x/Bad.tsx'], ['../store/derive', 'src/ui/Bad.tsx'], ['../store/history', 'src/ui/Bad.tsx'],
      ['../../store/persistence/html/export', 'src/ui/shell/Bad.tsx'], ['../store/persistence', 'src/ui/Bad.tsx'], ['../../store/address/dom', 'src/ui/shell/Bad.tsx'],
      ['@/store/address', 'src/ui/Bad.tsx'], ['@/store/persistence/excel/params/writer', 'src/ui/Bad.tsx']];
    for (const [from, file] of bad) expect(await lint(`import { x } from '${from}';\nexport const y = x;\n`, file!), from).toContain('no-restricted-imports');
    // a UI-local module that happens to be called `store` stays allowed, and so do the read hooks by a relative path
    for (const from of ['../display/store', '../../store/hooks', '../store/viewScope']) {
      expect(await lint(`import { x } from '${from}';\nexport const y = x;\n`, 'src/ui/shell/Ok.tsx'), from).not.toContain('no-restricted-imports');
    }
  });
  it('controllers cannot import the React hooks or deriveDoc through a relative path', async () => {
    expect(await lint("import { useDoc } from '../store/hooks';\nexport const x = useDoc;\n", 'src/controllers/Bad.ts')).toContain('no-restricted-imports');
    expect(await lint("import { deriveDoc } from '../../store/portfolioState';\nexport const x = deriveDoc;\n", 'src/controllers/x/Bad.ts')).toContain('no-restricted-imports');
    expect(await lint("import { emptyPortfolio } from '../store/portfolioState';\nexport const x = emptyPortfolio;\n", 'src/controllers/Ok.ts')).not.toContain('no-restricted-imports');
  });
  it('UI code may read through hooks and act through controllers', async () => {
    expect(await lint("import { useDoc } from '@/store/hooks';\nimport { setInput } from '@/controllers/inputs';\nexport const x = [useDoc, setInput];\n", 'src/ui/Ok.tsx')).not.toContain('no-restricted-imports');
  });
  it('the domain cannot import the store or the UI', async () => {
    expect(await lint("import { appStore } from '@/store/instance';\nexport const x = appStore;\n", 'src/domain/Bad.ts')).toContain('boundaries/dependencies');
  });
  it('A8: no .reduce( in the portfolio sections, the portfolio KPI hooks and tiles, the wave Gantt; other code and non-summing helpers are fine', async () => {
    const sum = "export const total = (xs: { net: number }[]) => xs.reduce((a, x) => a + x.net, 0);\n";
    for (const f of ['src/ui/sections/portfolio/consolidation/Bad.ts', 'src/ui/sections/portfolio/waves/Bad.ts', 'src/ui/sections/portfolio/stress/Bad.ts',
      'src/store/portfolioSimulation.ts', 'src/ui/sections/verdict/decision/PortfolioBad.tsx', 'src/store/consolidationHooks.ts', 'src/ui/shell/ScopeKpis.tsx',
      'src/ui/sections/verify/gantt/WaveRow.tsx']) {
      expect(await lint(sum, f), f).toContain('no-restricted-syntax');
    }
    expect(await lint("export const t = (xs: number[]) => xs.reduceRight((a, x) => a + x, 0);\n", 'src/ui/sections/portfolio/waves/Bad.ts')).toContain('no-restricted-syntax');
    expect(await lint(sum, 'src/domain/portfolio/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint(sum, 'src/ui/sections/economics/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint("export const names = (xs: { name: string }[]) => xs.map((x) => x.name).filter(Boolean).join(', ');\n", 'src/ui/sections/portfolio/waves/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint("export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n", 'src/ui/sections/portfolio/waves/Raw.tsx')).toContain('no-restricted-syntax');
  });
  it('A8 also covers the aggregate view: widgets, fallbacks, View hooks and any section Aggregate*.tsx / aggregate/ folder cannot sum in the UI', async () => {
    const sum = "export const total = (xs: { net: number }[]) => xs.reduce((a, x) => a + x.net, 0);\n";
    for (const f of ['src/ui/widgets/AggregateTable.tsx', 'src/ui/widgets/ProductDrill.tsx', 'src/ui/zones/fallbacks.tsx', 'src/store/viewScope.ts', 'src/store/selectionHooks.ts',
      'src/ui/sections/economics/financial/Aggregate.tsx', 'src/ui/sections/tune/knowledge/AggregateRows.ts', 'src/ui/sections/verify/agent-usage/aggregate/Table.tsx']) {
      expect(await lint(sum, f), f).toContain('no-restricted-syntax');
    }
    expect(await lint(sum, 'src/ui/sections/economics/financial/Verdict.tsx')).not.toContain('no-restricted-syntax');
  });
  it('EDIT BASE: a controller cannot read getState().doc (property or destructuring), nor import the React hooks; editBase() / activeDoc() are fine', async () => {
    const head = "import { appStore } from '@/store/instance';\n";
    expect(await lint(`${head}export const x = () => appStore().getState().doc.MODEL;\n`, 'src/controllers/Bad.ts')).toContain('no-restricted-syntax');
    expect(await lint(`${head}export const x = () => { const { doc, portfolio } = appStore().getState(); return [doc, portfolio]; };\n`, 'src/controllers/Bad.ts')).toContain('no-restricted-syntax');
    expect(await lint("import { useDoc } from '@/store/hooks';\nexport const x = useDoc;\n", 'src/controllers/Bad.ts')).toContain('no-restricted-imports');
    expect(await lint("import { deriveDoc } from '@/store/portfolioState';\nexport const x = deriveDoc;\n", 'src/controllers/Bad.ts')).toContain('no-restricted-imports');
    const ok = "import { activeDoc, editBase } from '@/store/editBase';\nimport { appStore } from '@/store/instance';\nexport const x = () => [editBase(), activeDoc(), appStore().getState().portfolio];\n";
    expect(await lint(ok, 'src/controllers/Ok.ts')).toEqual([]);
    expect(await lint(`${head}export const x = () => appStore().getState().doc;\n`, 'src/store/Ok.ts')).not.toContain('no-restricted-syntax');
  });
  it('EDIT BASE follows the data flow: a variable holding getState() cannot read .doc (property, computed or destructured)', async () => {
    const head = "import { appStore } from '@/store/instance';\n";
    for (const body of ['const s = appStore().getState(); return s.doc;', "const s = appStore().getState(); return s['doc'];",
      'const s = appStore().getState(); const { doc } = s; return doc;', 'const st = appStore().store.getState(); return st.doc.MODEL;']) {
      expect(await lint(`${head}export const x = () => { ${body} };\n`, 'src/controllers/Bad.ts'), body).toContain('local/no-derived-doc');
    }
    expect(await lint(`${head}export const x = () => { const s = appStore().getState(); return s.portfolio; };\n`, 'src/controllers/Ok.ts')).toEqual([]);
    expect(await lint(`${head}export const x = () => { const s = appStore().getState(); return s.doc; };\n`, 'src/store/Ok.ts')).not.toContain('local/no-derived-doc');
  });
  it('UI code cannot import portfolioState, editBase, or the writable simulation stores; the simulation hooks stay allowed', async () => {
    for (const [what, from] of [['editBaseOf', '@/store/portfolioState'], ['runCommands', '../../store/portfolioState'], ['editBase', '@/store/editBase'],
      ['simStore', '@/store/simulation'], ['pfSimStore', '../../store/portfolioSimulation']]) {
      expect(await lint(`import { ${what} } from '${from}';\nexport const y = ${what};\n`, 'src/ui/shell/Bad.tsx'), from).toContain('no-restricted-imports');
    }
    expect(await lint("import { useSimulation } from '@/store/simulation';\nimport { usePortfolioSimulation } from '@/store/portfolioSimulation';\nexport const y = [useSimulation, usePortfolioSimulation];\n",
      'src/ui/shell/Ok.tsx')).not.toContain('no-restricted-imports');
  });
  it('a dynamic import() is restricted like a static one (UI write path, controller hooks); a lazy section stays allowed', async () => {
    for (const from of ['@/store/core', '../store/instance', '../../store/persistence/html/export', '@/store/portfolioState']) {
      expect(await lint(`export const y = () => import('${from}');\n`, 'src/ui/shell/Bad.tsx'), from).toContain('local/no-restricted-dynamic-import');
    }
    expect(await lint("export const y = () => import('../store/hooks');\n", 'src/controllers/Bad.ts')).toContain('local/no-restricted-dynamic-import');
    expect(await lint("export const y = () => import('@/ui/sections/baseline/team-in');\n", 'src/ui/shell/Ok.tsx')).not.toContain('local/no-restricted-dynamic-import');
    expect(await lint("export const y = () => import('@/store/hooks');\n", 'src/ui/shell/Ok.tsx')).not.toContain('local/no-restricted-dynamic-import');
  });
  it('content and generated data are layers of their own: the UI and the domain read them, the controllers and the store do not', async () => {
    const data = "import facts from '@/generated/dependencies.json';\nimport c from '@/content/refshare/sessions.json';\nexport const y = [facts, c];\n";
    expect(await lint(data, 'src/ui/shell/Ok.tsx')).toEqual([]);
    expect(await lint(data, 'src/domain/Ok.ts')).toEqual([]);
    expect(await lint(data, 'src/controllers/Bad.ts')).toContain('boundaries/dependencies');
    expect(await lint(data, 'src/store/Bad.ts')).toContain('boundaries/dependencies');
    // a file outside every layer cannot be imported from one (it would escape the layer rule)
    expect(await lint("import { near } from '../../../tests/helpers/near';\nexport const y = near;\n", 'src/ui/shell/Bad.tsx')).toContain('boundaries/no-unknown-dependencies');
  });
  it('D1: a line over 300 characters is an error whatever it holds; over 160 is a warning, long literals and URLs excepted', async () => {
    const ids = (n: number) => `export const x = [${Array.from({ length: n }, (_, i) => `a${i}`).join(', ')}];\n`;   // code, no literal
    expect(ids(60).length).toBeGreaterThan(300);
    expect(await lint(ids(60), 'src/domain/Long.ts')).toContain('local/hard-max-len');
    expect(await lint(ids(40), 'src/domain/Long.ts')).toEqual(expect.arrayContaining(['max-len']));
    expect(await lint(ids(40), 'src/domain/Long.ts')).not.toContain('local/hard-max-len');
    expect(await lint(`export const s = '${'word '.repeat(50)}';\n`, 'src/domain/Str.ts')).not.toContain('max-len');   // a long string: only the hard limit applies
    expect(await lint(`export const s = '${'word '.repeat(70)}';\n`, 'src/domain/Str.ts')).toContain('local/hard-max-len');
    expect(await lint(`// ${'x'.repeat(320)}\nexport const a = 1;\n`, 'src/domain/Comment.ts')).toContain('local/hard-max-len');   // comments count
  });
  it('a 151-line file is rejected, raw HTML injection is rejected', async () => {
    expect(await lint(Array.from({ length: 151 }, (_, i) => `export const a${i} = ${i};`).join('\n') + '\n', 'src/domain/Big.ts')).toContain('max-lines');
    expect(await lint("export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n", 'src/ui/Raw.tsx')).toContain('no-restricted-syntax');
  });
});
