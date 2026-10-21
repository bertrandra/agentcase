#!/usr/bin/env node
// Release artefact: builds the single offline HTML and names it AgentCase_v<major>_<minor>_EN.html (same convention as the legacy
// file). Fails when the version stamps disagree (version.ts, package.json, index.html title). Usage: npm run release
import { copyFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const ver = /APP_VERSION = '([^']+)'/.exec(readFileSync('src/domain/version.ts', 'utf8'))[1];
const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
const [maj, min] = ver.split('.');
const title = /<title>AgentCase v([\d.]+)/.exec(readFileSync('index.html', 'utf8'))[1];
if (ver !== pkg || title !== `${maj}.${min}`) { console.error(`version stamps disagree: version.ts ${ver}, package.json ${pkg}, index.html title v${title}`); process.exit(1); }
execSync('npm run build', { stdio: 'inherit' });
const out = `dist/AgentCase_v${maj}_${min}_EN.html`;
copyFileSync('dist/index.html', out);
console.log('release artefact:', out);
