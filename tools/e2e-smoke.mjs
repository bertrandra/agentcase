#!/usr/bin/env node
// Real-browser smoke of the BUILT single-file app (app/dist/index.html): opens fixture cases through the Open… file input,
// visits all sections as the Advanced persona and fails on console errors, page errors, "NaN"/"undefined" text or an empty section.
// Usage: node tools/e2e-smoke.mjs [--fixtures golden,ctx-msi,...] [--sections id,id]
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const args = process.argv.slice(2), opt = n => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '').split(',').filter(Boolean);
const fixtures = opt('--fixtures').length ? opt('--fixtures') : ['golden', 'ctx-msi', 'curve-logistic', 'industry-med', 'horizon-5', 'scope-reduced'];
const only = opt('--sections');
// sections whose prose legitimately mentions NaN / undefined (the verification rules and the architecture history)
const PROSE = /Logic verification|Architecture/;
const url = 'file://' + resolve('app/dist/index.html');
const browser = await pw.chromium.launch();
let failures = 0, visited = 0;
for (const fx of fixtures) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to create chart|getContext/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url); await page.waitForSelector('.ac-shell');
  await page.setInputFiles('input[type=file]', { name: fx + '.json', mimeType: 'application/json', buffer: Buffer.from(readFileSync(`app/fixtures/cases/${fx}.json`)) });
  await page.selectOption('select[aria-label=Persona]', 'advanced');
  if (await page.locator('button:has-text("Menu")').count()) { /* hide-menu mode: the group bar lists sections */ }
  const ids = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label=Sections] button, .ac-groupbar button')].map(b => b.textContent));
  const labels = [...new Set(ids)];
  for (const label of labels) {
    const btn = page.locator('nav[aria-label=Sections] button, .ac-groupbar button').filter({ hasText: label }).first();
    if (!(await btn.count())) continue;
    errors.length = 0;
    await btn.click(); await page.waitForTimeout(250);
    const h1 = await page.locator('main h1').first().textContent({ timeout: 5000 }).catch(() => null);
    const text = await page.locator('main').innerText();
    const problems = [];
    if (!h1) problems.push('no heading');
    if (!PROSE.test(label) && /\bNaN\b|\bundefined\b|\[object Object\]/.test(text)) problems.push('NaN/undefined/[object Object] in text');
    if (errors.length) problems.push(errors.slice(0, 2).join(' | '));
    visited++;
    if (problems.length) { failures++; console.log(`FAIL ${fx} · ${label}: ${problems.join('; ')}`); }
  }
  console.log(fx, labels.length, 'sections');
  await ctx.close();
}
await browser.close();
console.log(visited, 'section visits,', failures, 'failure(s)');
process.exit(failures ? 1 : 0);
