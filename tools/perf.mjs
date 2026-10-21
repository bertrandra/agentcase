#!/usr/bin/env node
// Performance budget of the BUILT single-file app (app/dist/index.html) in headless Chromium.
// Measures: file size, time to the shell, edit → KPI repaint (median/p95 over 25 edits), section switch times, undo time.
// Fails when a measure exceeds app/perf-budget.json. Usage: node tools/perf.mjs [--write-budget]
import { createRequire } from 'node:module';
import { readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const file = resolve('app/dist/index.html'), budgetFile = resolve('app/perf-budget.json');
const html = readFileSync(file);
const m = { sizeMB: +(statSync(file).size / 1048576).toFixed(2), gzipMB: +(gzipSync(html).length / 1048576).toFixed(2) };
const browser = await pw.chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const t0 = Date.now(); await page.goto('file://' + file); await page.waitForSelector('.ac-shell .ac-kpi-v'); m.shellMs = Date.now() - t0;
await page.setInputFiles('input[type=file]', { name: 'c.json', mimeType: 'application/json', buffer: readFileSync('app/fixtures/cases/golden.json') });
await page.selectOption('select[aria-label=Persona]', 'advanced');
const go = async label => { const b = page.locator('nav[aria-label=Sections] button, .ac-groupbar button').filter({ hasText: label }).first(); const t = Date.now(); await b.click(); await page.waitForSelector('main h1'); await page.waitForTimeout(30); return Date.now() - t; };
await go(/^🎯 Scope$/); await page.locator('summary:has-text("Adjust % auto")').click();
const input = page.locator('input[aria-label="% auto of A017"]');
const kpi = () => page.locator('.ac-kpi-v').first().textContent();
const edits = [];
for (let i = 0; i < 25; i++) {
  const before = await kpi(), t = Date.now();
  await input.fill(String(30 + ((i * 7) % 70)));
  await page.waitForFunction(b => document.querySelector('.ac-kpi-v').textContent !== b, before, { timeout: 5000 }).catch(() => {});
  edits.push(Date.now() - t);
}
edits.sort((a, b) => a - b); m.editMedianMs = edits[12]; m.editP95Ms = edits[23];
const t1 = Date.now(); await page.keyboard.press('Control+z'); await page.waitForTimeout(30); m.undoMs = Date.now() - t1;
m.sectionMs = {};
for (const l of ['Financial', 'Monte Carlo', 'Logic verification', 'Board', 'Gantt', 'Persona management', 'Data Model']) m.sectionMs[l] = await go(l);
m.sectionMaxMs = Math.max(...Object.values(m.sectionMs));
m.heapMB = +((await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0))).toFixed(1);
m.errors = errors.length;
await browser.close();
console.log(JSON.stringify(m, null, 1));
if (process.argv.includes('--write-budget') || !existsSync(budgetFile)) {
  const b = { sizeMB: Math.ceil(m.sizeMB * 1.15 * 10) / 10, gzipMB: Math.ceil(m.gzipMB * 1.15 * 10) / 10, shellMs: Math.max(3000, m.shellMs * 3), editMedianMs: Math.max(200, m.editMedianMs * 3), editP95Ms: Math.max(500, m.editP95Ms * 3), undoMs: Math.max(250, m.undoMs * 3), sectionMaxMs: Math.max(1500, m.sectionMaxMs * 3), heapMB: Math.max(300, Math.ceil(m.heapMB * 2.5)) };
  writeFileSync(budgetFile, JSON.stringify(b, null, 1) + '\n'); console.log('budget written', b);
  process.exit(0);
}
const budget = JSON.parse(readFileSync(budgetFile, 'utf8')); let bad = 0;
for (const [k, lim] of Object.entries(budget)) if (m[k] > lim) { bad++; console.log(`OVER BUDGET ${k}: ${m[k]} > ${lim}`); }
if (m.errors) { bad++; console.log('page errors', errors); }
console.log(bad ? 'perf budget FAILED' : 'perf budget ok'); process.exit(bad ? 1 : 0);
