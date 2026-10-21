#!/usr/bin/env node
// Generates app/fixtures/snapshots/ from the LEGACY app (needs Playwright + Chromium, see tools/oracle.mjs):
//   <id>.html     a real legacy "Save HTML snapshot" download, reduced to its first 3 KB + the baked restore script
//                 (the full file is ~3.5 MB; the parser only needs the script)
//   <id>.json     the state object inside that script (what applySnapshotState() receives)
//   open-fit.json autoPotential the legacy shows after applySnapshotState() on every oracle fixture (fit-to-scope on open)
// Usage: node tools/snapshot-fixtures.mjs [legacy.html]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RECIPES as BASE } from './oracle-recipes.mjs';

const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const RECIPES = [...BASE];
const dir = new URL('./oracle-recipes.d/', import.meta.url);
if (existsSync(dir)) for (const f of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) RECIPES.push(...(await import(new URL(f, dir))).RECIPES);
const file = resolve(process.argv.find((a) => a.endsWith('.html')) || 'AgentCase_v18_11_EN.html');
const IDS = ['golden', 'industry-med', 'ctx-msi'];
const out = resolve('app/fixtures/snapshots');
mkdirSync(out, { recursive: true });

const browser = await pw.chromium.launch();
const open = async () => {
  const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  return page;
};
for (const id of IDS) {
  const page = await open();
  await page.evaluate((code) => { (0, eval)(code); readInputs(); refreshAll(); }, RECIPES.find((r) => r.id === id).code || '');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => saveHtmlSnapshot())]);
  const path = await dl.path();
  const html = readFileSync(path, 'utf8');
  const at = html.lastIndexOf('<script data-agentcase-snapshot="1">');
  const script = html.slice(at, html.indexOf('</script>', at) + 9);
  writeFileSync(`${out}/${id}.html`, html.slice(0, 3000) + '\n<!-- reduced fixture: the rest of the application was cut out -->\n</head><body>\n' + script + '\n</body></html>\n');
  const json = script.slice(script.indexOf('applySnapshotState(') + 19, script.lastIndexOf('); }catch'));
  writeFileSync(`${out}/${id}.json`, JSON.stringify(JSON.parse(json)));
  console.log(id, 'download', html.length, 'bytes; script', script.length);
  await page.close();
}
const page = await open();
const fit = {};
for (const f of readdirSync('app/fixtures/cases')) {
  const id = f.replace('.json', ''), st = JSON.parse(readFileSync(`app/fixtures/cases/${f}`, 'utf8'));
  fit[id] = await page.evaluate((s) => { applySnapshotState(s); return document.getElementById('autoPotential').value; }, st);
}
writeFileSync(`${out}/open-fit.json`, JSON.stringify(fit));
console.log(Object.keys(fit).length, 'fit-on-open values');
await browser.close();
