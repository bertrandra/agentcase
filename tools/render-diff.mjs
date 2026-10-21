#!/usr/bin/env node
// Render-equivalence check: loads two builds, renders every section in the same state and compares
// the visible text of each. Use it to prove that a refactor (for example output escaping) did not
// change what the user sees.   Usage: node tools/render-diff.mjs <before.html> <after.html> [--persona advanced]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const files = process.argv.slice(2).filter(a => a.endsWith('.html')).map(f => resolve(f));
if (files.length !== 2) { console.error('need two html files'); process.exit(2); }
const browser = await pw.chromium.launch();
async function dump(file) {
  const page = await (await browser.newContext({ timezoneId: 'UTC', locale: 'en-US' })).newPage();
  await page.addInitScript(() => { Math.random = () => 0.5; const D = Date; const t0 = 1790000000000; globalThis.Date = class extends D { constructor(...a) { a.length ? super(...a) : super(t0); } static now() { return t0; } }; });
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  return await page.evaluate(async () => {
    const out = {}; const sleep = ms => new Promise(r => setTimeout(r, ms));
    setPersona('advanced');
    for (const sec of SECTION_CATALOG) {
      try { goTab(sec.id); if (TABRENDER[sec.id]) TABRENDER[sec.id](); await sleep(30); } catch (e) { out[sec.id] = 'ERR ' + e.message; continue; }
      const el = document.getElementById(sec.id);
      out[sec.id] = el ? el.innerText.replace(/\s+/g, ' ').replace(/v18\.[89]/g, 'vX').replace(/18_[89]/g, 'X_X').trim() : 'MISSING';
    }
    for (const [k, id] of [['sidebar', 'sidebarNav'], ['scenarioBar', 'scenarioBar'], ['home', 'homeCards']]) { const el = document.getElementById(id); out['@' + k] = el ? el.innerText.replace(/\s+/g, ' ').replace(/v18\.[89]/g, 'vX').trim() : 'MISSING'; }
    return out;
  });
}
const [a, b] = [await dump(files[0]), await dump(files[1])];
await browser.close();
let diffs = 0;
for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
  if (a[k] === b[k]) continue; diffs++;
  let i = 0; const x = a[k] || '', y = b[k] || ''; while (i < x.length && x[i] === y[i]) i++;
  console.log(`DIFF ${k}: …${x.slice(Math.max(0, i - 40), i + 80)}\n      vs …${y.slice(Math.max(0, i - 40), i + 80)}`);
}
console.log(diffs ? `\n${diffs} section(s) differ` : `\nIDENTICAL: ${Object.keys(a).length} sections render the same text`);
process.exit(diffs ? 1 : 0);
