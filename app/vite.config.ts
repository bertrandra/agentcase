import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { versionTag } from './src/domain/versionTag';

const src = fileURLToPath(new URL('./src', import.meta.url));
// The single version source: package.json "version" (bump with `npm version X.Y.Z --no-git-tag-version`). It reaches the code as
// `__APP_VERSION__` (src/domain/version.ts) and the page title through the `%APP_VER_TAG%` placeholder of index.html.
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
const versionTitle = { name: 'agentcase-version-title', transformIndexHtml: (html: string) => html.replace(/%APP_VER_TAG%/g, versionTag(version)) };

// One offline HTML file: scripts and styles are inlined by vite-plugin-singlefile.
export default defineConfig({
  plugins: [react(), viteSingleFile(), versionTitle],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: { alias: { '@': src } },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  // In CI the suite also writes a JUnit report (uploaded by .github/workflows/app.yml when the job fails); the default 5 s test timeout is the gate everywhere.
  test: {
    environment: 'node', include: ['tests/**/*.test.{ts,tsx}'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'], outputFile: { junit: 'test-results/vitest-junit.xml' },
  },
});
