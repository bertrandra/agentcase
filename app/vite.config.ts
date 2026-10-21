import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

// One offline HTML file: scripts and styles are inlined by vite-plugin-singlefile.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': src } },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
