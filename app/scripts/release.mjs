#!/usr/bin/env node
// Release artefact: builds the single offline HTML and names it after the version tag of its own <title>, which vite.config.ts derives from
// package.json "version" (the single version source): 20.12.0 -> AgentCase_v20_12_EN.html, 20.12.1 -> AgentCase_v20_12_1_EN.html (legacy naming).
// Usage: npm run release. It first refreshes the documentation facts with the test count (one full Vitest run, SPEC_FIXES FX-72): commit what it changes.
import { copyFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
execSync('npm run docs:facts -- --count-tests', { stdio: 'inherit' });
const changed = execSync('git status --porcelain -- ../docs ../README.md README.md src/content/refshare', { encoding: 'utf8' }).trim();
if (changed) console.log(`documentation facts updated (commit them with the release):\n${changed}`);
execSync('npm run build', { stdio: 'inherit' });
const html = readFileSync('dist/index.html', 'utf8');
const tag = /<title>AgentCase (v\d+(?:\.\d+)*(?:-[\w.]+)?) —/.exec(html)?.[1];
const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (!tag || !pkg.startsWith(tag.slice(1))) { console.error(`dist/index.html title carries no version tag of ${pkg} (got ${tag ?? 'none'})`); process.exit(1); }
const out = `dist/AgentCase_${tag.replace(/\./g, '_')}_EN.html`;
copyFileSync('dist/index.html', out);
console.log('release artefact:', out);
