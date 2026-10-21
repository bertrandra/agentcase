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
  it('a 151-line file is rejected, raw HTML injection is rejected', async () => {
    expect(await lint(Array.from({ length: 151 }, (_, i) => `export const a${i} = ${i};`).join('\n') + '\n', 'src/domain/Big.ts')).toContain('max-lines');
    expect(await lint("export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n", 'src/ui/Raw.tsx')).toContain('no-restricted-syntax');
  });
});
