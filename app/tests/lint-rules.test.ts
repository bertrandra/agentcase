import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

async function lint(code: string, filePath: string) {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [r] = await eslint.lintText(code, { filePath });
  return r!.messages.map((m) => m.ruleId);
}
describe('architecture lint rules (G2, G4)', () => {
  it('UI code cannot import the store write path', async () => {
    expect(await lint("import { appStore } from '@/store/instance';\nexport const x = appStore;\n", 'src/ui/Bad.tsx')).toContain('no-restricted-imports');
    expect(await lint("import { createAppStore } from '@/store/core';\nexport const x = createAppStore;\n", 'src/ui/Bad.tsx')).toContain('no-restricted-imports');
  });
  it('UI code may read through hooks and act through controllers', async () => {
    expect(await lint("import { useDoc } from '@/store/hooks';\nimport { setInput } from '@/controllers/inputs';\nexport const x = [useDoc, setInput];\n", 'src/ui/Ok.tsx')).not.toContain('no-restricted-imports');
  });
  it('the domain cannot import the store or the UI', async () => {
    expect(await lint("import { appStore } from '@/store/instance';\nexport const x = appStore;\n", 'src/domain/Bad.ts')).toContain('boundaries/element-types');
  });
  it('A8: no .reduce( in the portfolio sections, the portfolio KPI hooks and tiles, the wave Gantt; other code and non-summing helpers are fine', async () => {
    const sum = "export const total = (xs: { net: number }[]) => xs.reduce((a, x) => a + x.net, 0);\n";
    for (const f of ['src/ui/sections/portfolio/consolidation/Bad.ts', 'src/ui/sections/portfolio/waves/Bad.ts', 'src/ui/sections/portfolio/stress/Bad.ts', 'src/store/portfolioSimulation.ts', 'src/ui/sections/verdict/decision/PortfolioBad.tsx', 'src/store/consolidationHooks.ts', 'src/ui/shell/ScopeKpis.tsx', 'src/ui/sections/verify/gantt/WaveRow.tsx']) {
      expect(await lint(sum, f), f).toContain('no-restricted-syntax');
    }
    expect(await lint("export const t = (xs: number[]) => xs.reduceRight((a, x) => a + x, 0);\n", 'src/ui/sections/portfolio/waves/Bad.ts')).toContain('no-restricted-syntax');
    expect(await lint(sum, 'src/domain/portfolio/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint(sum, 'src/ui/sections/economics/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint("export const names = (xs: { name: string }[]) => xs.map((x) => x.name).filter(Boolean).join(', ');\n", 'src/ui/sections/portfolio/waves/Ok.ts')).not.toContain('no-restricted-syntax');
    expect(await lint("export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n", 'src/ui/sections/portfolio/waves/Raw.tsx')).toContain('no-restricted-syntax');
  });
  it('A8 also covers the Vue agrégée: widgets, fallbacks, Vue hooks and any section Aggregate*.tsx / aggregate/ folder cannot sum in the UI', async () => {
    const sum = "export const total = (xs: { net: number }[]) => xs.reduce((a, x) => a + x.net, 0);\n";
    for (const f of ['src/ui/widgets/AggregateTable.tsx', 'src/ui/widgets/ProductDrill.tsx', 'src/ui/zones/fallbacks.tsx', 'src/store/viewScope.ts', 'src/store/selectionHooks.ts',
      'src/ui/sections/economics/financial/Aggregate.tsx', 'src/ui/sections/tune/knowledge/AggregateRows.ts', 'src/ui/sections/verify/agent-usage/aggregate/Table.tsx']) {
      expect(await lint(sum, f), f).toContain('no-restricted-syntax');
    }
    expect(await lint(sum, 'src/ui/sections/economics/financial/Verdict.tsx')).not.toContain('no-restricted-syntax');
  });
  it('a 151-line file is rejected, raw HTML injection is rejected', async () => {
    expect(await lint(Array.from({ length: 151 }, (_, i) => `export const a${i} = ${i};`).join('\n') + '\n', 'src/domain/Big.ts')).toContain('max-lines');
    expect(await lint("export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n", 'src/ui/Raw.tsx')).toContain('no-restricted-syntax');
  });
});
