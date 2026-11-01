import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { versionTag } from './src/domain/versionTag.ts';

const src = fileURLToPath(new URL('./src', import.meta.url));
// The single version source: package.json "version" (bump with `npm version X.Y.Z --no-git-tag-version`). It reaches the code as
// `__APP_VERSION__` (src/domain/version.ts) and the page title through the `%APP_VER_TAG%` placeholder of index.html.
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
const versionTitle = { name: 'agentcase-version-title', transformIndexHtml: (html: string) => html.replace(/%APP_VER_TAG%/g, versionTag(version)) };
// The Content-Security-Policy meta of index.html blocks every network load; the dev server needs its module scripts and HMR websocket, so `vite`
// (serve only) drops it. Builds keep it (docs/ARCHITECTURE.md §9).
const devCsp = { name: 'agentcase-dev-csp', apply: 'serve' as const, transformIndexHtml: (html: string) => html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '') };

// Decision D5 (docs/ARCHITECTURE.md §9): ExcelJS is not bundled as code. Its browser build (a UMD script) is gzipped and embedded as a base64 string in
// place of `excelSource.ts`, then decompressed (DecompressionStream) and run as an inline classic script on the first Excel use (`excelInline.ts`).
// Build only: the dev server and the tests import the package. The source-map comment is dropped (no map is shipped).
const excelSourceFile = fileURLToPath(new URL('./src/store/persistence/excel/excelSource.ts', import.meta.url));
const excelPayload = {
  name: 'agentcase-excel-payload', apply: 'build' as const,
  load(id: string): string | null {
    if (id.split('?')[0] !== excelSourceFile) return null;
    const umd = readFileSync(new URL('./node_modules/exceljs/dist/exceljs.min.js', import.meta.url), 'utf8').replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n');
    const payload = gzipSync(Buffer.from(umd, 'utf8'), { level: 9 }).toString('base64');
    return `import { inlineExcelJS } from './excelInline';\nconst PAYLOAD = ${JSON.stringify(payload)};\nexport const excelSource = () => inlineExcelJS(PAYLOAD);\n`;
  },
};

// Phase B6 (docs/SPEC_BPMN.md D-B6 b): the BPMN editor (bpmn-js) the same way: its browser bundle and style sheets gzipped as one base64 string with a
// marker prefix (tools/perf.mjs measures it apart, budget `bpmnPayloadMB`), in place of `processEditorKit.ts`; run on the first "Edit diagram" (`processEditorInline.ts`).
const bpmnSourceFile = fileURLToPath(new URL('./src/controllers/processEditorKit.ts', import.meta.url));
const bpmnPayload = {
  name: 'agentcase-bpmn-payload', apply: 'build' as const,
  load(id: string): string | null {
    if (id.split('?')[0] !== bpmnSourceFile) return null;
    const read = (p: string) => readFileSync(new URL(`./node_modules/bpmn-js/dist/${p}`, import.meta.url), 'utf8');
    const js = read('bpmn-modeler.production.min.js').replace(/\n\/\/# sourceMappingURL=\S+\s*$/, '\n');
    // comments and the icon font's file URLs (`../font/bpmn.eot`) dropped: the policy loads fonts from data: only, the embedded copy is kept
    const css = ['assets/diagram-js.css', 'assets/bpmn-js.css', 'assets/bpmn-font/css/bpmn-embedded.css'].map(read).join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^}]*url\('\.\.\/font\/[^}]*\}/g, '');
    const payload = `agentcase-bpmn-js:${gzipSync(Buffer.from(JSON.stringify({ js, css }), 'utf8'), { level: 9 }).toString('base64')}`;
    return `import { inlineBpmnJs } from './processEditorInline';\nconst PAYLOAD = ${JSON.stringify(payload)};\nexport const bpmnSource = () => inlineBpmnJs(PAYLOAD);\n`;
  },
};

// One offline HTML file: scripts and styles are inlined by vite-plugin-singlefile.
export default defineConfig({
  plugins: [react(), viteSingleFile(), versionTitle, devCsp, excelPayload, bpmnPayload],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: { alias: { '@': src } },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  // In CI the suite also writes a JUnit report (uploaded by .github/workflows/app.yml when the job fails). Vitest's default 5 s timeout applies to every
  // test that does not set its own, locally and in CI alike; about twenty tests raise it explicitly (the third argument of `it`, or a `describe` option)
  // because they spawn a process (vitest / tsc / vite-node: affected-tests, deps-fresh, docs-facts), run a full Monte Carlo or a cost-model workbook, or
  // render every section of a portfolio. No global override: a slow new test fails here first.
  test: {
    environment: 'node', include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup/domParser.ts', 'tests/setup/timeouts.ts'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'], outputFile: { junit: 'test-results/vitest-junit.xml' },
  },
});
