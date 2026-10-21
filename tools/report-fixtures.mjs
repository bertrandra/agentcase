#!/usr/bin/env node
// Records what the LEGACY "Critical & Regulated Software Delivery" report (exportCriticalReport) produces for oracle fixtures that have
// regulatory norms: app/fixtures/reports/<id>.html (the downloaded file) and <id>.name.txt (its file name). Needs Playwright + Chromium.
// Usage: node tools/report-fixtures.mjs [legacy.html]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RECIPES as BASE } from './oracle-recipes.mjs';

const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const RECIPES = [...BASE];
const dir = new URL('./oracle-recipes.d/', import.meta.url);
if (existsSync(dir)) for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) RECIPES.push(...(await import(new URL(f, dir))).RECIPES);
const file = resolve(process.argv.find((a) => a.endsWith('.html')) || readdirSync('.').filter((f) => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const out = resolve('app/fixtures/reports');
mkdirSync(out, { recursive: true });

const browser = await pw.chromium.launch();
for (const f of readdirSync('app/fixtures/cases')) {
  const id = f.replace('.json', ''), st = JSON.parse(readFileSync(`app/fixtures/cases/${f}`, 'utf8'));
  if (!(st.regUse && st.selectedNorms.length)) continue;
  const page = await (await browser.newContext()).newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  // the fixture is the state AFTER the recipe ran in the page, so run the recipe again rather than applySnapshotState (which also re-fits and resets)
  const res = await page.evaluate(async (code) => {
    (0, eval)(code); readInputs(); refreshAll();
    let blob = null, name = '';
    URL.createObjectURL = (b) => { blob = b; return 'blob:report'; };
    HTMLAnchorElement.prototype.click = function () { name = this.download; };
    exportCriticalReport();
    return blob ? { html: await blob.text(), name } : null;
  }, RECIPES.find((r) => r.id === id).code || '');
  if (!res) { console.log(id, 'no report'); continue; }
  writeFileSync(`${out}/${id}.html`, res.html);
  writeFileSync(`${out}/${id}.name.txt`, res.name);
  console.log(id.padEnd(24), res.html.length, 'bytes', res.name);
  await page.close();
}
await browser.close();
