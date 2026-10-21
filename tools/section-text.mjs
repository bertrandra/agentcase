#!/usr/bin/env node
// Dumps the visible text of legacy sections for given fixtures -> app/fixtures/sections/<fixture>/<section>.txt
// Used by the section parity tests: every figure the legacy section shows must also appear in the migrated one.
// Usage: node tools/section-text.mjs [--sections id,id|all] [--fixtures golden,ctx-msi] [legacy.html]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2);
const opt = n => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '').split(',').filter(Boolean);
const file = resolve(args.find(a => a.endsWith('.html')) || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const fixtures = opt('--fixtures').length ? opt('--fixtures') : ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
const wanted = opt('--sections');
const browser = await pw.chromium.launch();
for (const fx of fixtures) {
  const state = JSON.parse(readFileSync(`app/fixtures/cases/${fx}.json`, 'utf8'));
  const page = await (await browser.newContext()).newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  const ids = await page.evaluate(s => { state_ = s; applySnapshotState(Object.assign({}, s, { currentPersona: 'advanced' }), { background: true }); readInputs(); refreshAll(); return [...document.querySelectorAll('.tab-content')].map(e => e.id); }, state);
  const dir = `app/fixtures/sections/${fx}`; mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    if (wanted.length && wanted[0] !== 'all' && !wanted.includes(id)) continue;
    await page.evaluate(s => { applySnapshotState(Object.assign({}, s, { currentPersona: 'advanced' }), { background: true }); readInputs(); refreshAll(); }, state);   // fresh state per section: rendering one section (e.g. scurve) must not change what the next one shows
    const text = await page.evaluate(async i => { try { goTab(i); } catch (e) { return 'ERR ' + e; } await new Promise(r => setTimeout(r, 250)); /* goTab renders after a 50 ms timeout */ const el = document.getElementById(i); return el ? el.innerText : ''; }, id);
    writeFileSync(`${dir}/${id}.txt`, text);
  }
  console.log(fx, ids.length, 'sections');
  await page.close();
}
await browser.close();
