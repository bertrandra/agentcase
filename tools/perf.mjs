#!/usr/bin/env node
// Performance budget of the BUILT single-file app (app/dist/index.html) in headless Chromium.
// Measures: file size, time to the shell, edit → KPI repaint (median/p95 over 25 edits), section switch times (single-case and the 6 Portfolio sections on docs/examples), undo time.
// Every time is measured up to a state of the page, never a fixed wait: a section switch ends when the TARGET section's heading is shown and the next frame
// is painted, an undo when the headline bar shows other figures than before the key press.
// Fails when a measure exceeds app/perf-budget.json, and when that file is missing. Two size budgets: sizeMB / gzipMB are the hard product ceilings (set
// by the user, never rewritten by this script), sizeRegressionMB / gzipRegressionMB are about 1.15 x the measured build and fail on growth.
// Phase B6 (docs/SPEC_BPMN.md § 10): the regression budgets measure the app WITHOUT the lazily loaded BPMN editor payload (the gzipped bpmn-js
// string marked `agentcase-bpmn-js:`, never run before "Edit diagram"); the payload has its own budget, bpmnPayloadMB; the hard ceilings cover the whole file.
// Usage: node tools/perf.mjs [--write-budget]   (--write-budget re-baselines the time and regression budgets from this run, margin rule below)
import { createRequire } from 'node:module';
import { readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
process.chdir(new URL('..', import.meta.url).pathname);   // paths below are relative to the repository root, whatever the caller's directory (npm run e2e runs from app/)
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const file = resolve('app/dist/index.html'), budgetFile = resolve('app/perf-budget.json');
const html = readFileSync(file);
const MB = (n) => +(n / 1048576).toFixed(2), PAYLOAD = /`agentcase-bpmn-js:[A-Za-z0-9+/=]+`/;
const payload = PAYLOAD.exec(html.toString('utf8'))?.[0], app = Buffer.from(html.toString('utf8').replace(PAYLOAD, '``'));
const m = { sizeMB: MB(statSync(file).size), gzipMB: MB(gzipSync(html).length), appMB: MB(app.length), appGzipMB: MB(gzipSync(app).length) };
if (payload) m.bpmnPayloadMB = MB(payload.length);   // absent: the bpmnPayloadMB budget reports an unknown measure (the build lost its editor payload)
const browser = await pw.chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const t0 = Date.now(); await page.goto('file://' + file); await page.waitForSelector('.ac-shell .ac-kpi-v'); m.shellMs = Date.now() - t0;
await page.setInputFiles('input[type=file]', { name: 'c.json', mimeType: 'application/json', buffer: readFileSync('app/fixtures/cases/golden.json') });
await page.selectOption('select[aria-label=Persona]', 'advanced');
// sidebar groups are collapsible: open the group headers (▼) one by one until the wanted section button is visible
// `heading`: the start of the target section's h1 (the previous section's h1 is still in the page when the click lands, so `main h1` alone proves nothing)
const painted = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const go = async (label, heading) => {
  const sel = 'nav[aria-label=Sections] button:visible, .ac-groupbar button:visible', b = page.locator(sel).filter({ hasText: label }).first();
  if (!(await b.count())) { const heads = page.locator('nav[aria-label=Sections] button').filter({ hasText: /▼$/ }); for (let i = 0, n = await heads.count(); i < n && !(await b.count()); i++) await heads.nth(i).click(); }
  const t = Date.now(); await b.click();
  await page.waitForFunction((h) => [...document.querySelectorAll('main h1')].some((e) => e.textContent.trim().startsWith(h)), heading, { timeout: 10000 });
  await painted(); return Date.now() - t;
};
await go(/^🎯 Scope$/, 'Scope — target artifact selection'); await page.locator('summary:has-text("Adjust % auto")').click();
const input = page.locator('input[aria-label="% auto of A017"]');
// the headline bar now starts with FTE before (not affected by an automation edit): watch the whole bar
const kpi = () => page.evaluate(() => [...document.querySelectorAll('.ac-kpi-v')].map(e => e.textContent).join('|'));
const edits = [];
for (let i = 0; i < 25; i++) {
  const before = await kpi(), t = Date.now();
  await input.fill(String(30 + ((i * 7) % 70)));
  await page.waitForFunction(b => [...document.querySelectorAll('.ac-kpi-v')].map(e => e.textContent).join('|') !== b, before, { timeout: 5000 }).catch(() => {});
  edits.push(Date.now() - t);
}
edits.sort((a, b) => a - b); m.editMedianMs = edits[12]; m.editP95Ms = edits[23];
// undo of the last edit (58 % back to 51 %): timed until the headline bar has repainted with other figures; no change within 5 s fails the run
const beforeUndo = await kpi(), t1 = Date.now(); await page.keyboard.press('Control+z');
await page.waitForFunction(b => [...document.querySelectorAll('.ac-kpi-v')].map(e => e.textContent).join('|') !== b, beforeUndo, { timeout: 5000 });
await painted(); m.undoMs = Date.now() - t1;
m.sectionMs = {};
const SECTIONS = [['Financial', 'Financial Summary'], ['Monte Carlo', '🎲 Monte Carlo'], ['Logic verification', '🔍 Detailed logic verification'],
  ['Board', '📊 Board'], ['Gantt', '📅 Plan'], ['Persona management', '👥 Persona management'], ['Data Model', '🗄️ Data Model']];
for (const [l, h] of SECTIONS) m.sectionMs[l] = await go(l, h);
m.sectionMaxMs = Math.max(...Object.values(m.sectionMs));
// Portfolio group on the shipped example (3 planned products, 2 waves, hub, rho): the six portfolio sections
await page.setInputFiles('input[type=file]', { name: 'p.json', mimeType: 'application/json', buffer: readFileSync('docs/examples/AgentCase_Portfolio_Example.json') });
await page.selectOption('select[aria-label=Persona]', 'advanced');   // opening a file resets the persona
await page.waitForFunction(() => document.querySelector('select[aria-label=Persona]')?.value === 'advanced'
  && document.querySelector('nav[aria-label=Sections]')?.textContent.includes('Products'));   // the portfolio file is open
m.portfolioSectionMs = {};
const PF = [['Products', '📦 Products'], ['Overrides', '🧬 Overrides'], ['Knowledge transfer', '🔁 Knowledge transfer'], ['Waves', '🌊 Waves'],
  ['Consolidation', '📈 Consolidation'], ['Portfolio stress', '🎲 Portfolio stress']];
for (const [l, h] of PF) m.portfolioSectionMs[l] = await go(l, h);
m.portfolioSectionMaxMs = Math.max(...Object.values(m.portfolioSectionMs));
m.heapMB = +((await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0))).toFixed(1);
m.errors = errors.length;
await browser.close();
console.log(JSON.stringify(m, null, 1));
if (!existsSync(budgetFile)) {
  console.log(`perf budget FAILED: ${budgetFile} is missing (a tracked file: restore it; it is never created implicitly)`); process.exit(1);
}
const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
// re-baseline: times = max(floor, 3 x measured); regression size budgets = 1.15 x measured (2 decimals, rounded up); the hard ceilings sizeMB / gzipMB are kept
if (process.argv.includes('--write-budget')) {
  const up = (v) => Math.ceil(v * 1.15 * 100) / 100;
  const b = { sizeMB: budget.sizeMB, gzipMB: budget.gzipMB, sizeRegressionMB: up(m.appMB), gzipRegressionMB: up(m.appGzipMB), bpmnPayloadMB: up(m.bpmnPayloadMB),
    shellMs: Math.max(3000, m.shellMs * 3), editMedianMs: Math.max(200, m.editMedianMs * 3), editP95Ms: Math.max(500, m.editP95Ms * 3), undoMs: Math.max(250, m.undoMs * 3),
    sectionMaxMs: Math.max(1500, m.sectionMaxMs * 3), portfolioSectionMaxMs: Math.max(1500, m.portfolioSectionMaxMs * 3), heapMB: Math.max(300, Math.ceil(m.heapMB * 2.5)) };
  writeFileSync(budgetFile, JSON.stringify(b, null, 1) + '\n'); console.log('budget written', b);
  process.exit(0);
}
const measureOf = { sizeRegressionMB: 'appMB', gzipRegressionMB: 'appGzipMB' }; let bad = 0;
for (const [k, lim] of Object.entries(budget)) {
  const v = m[measureOf[k] ?? k];
  if (typeof v !== 'number') { bad++; console.log(`UNKNOWN BUDGET ${k}: no such measure`); }
  else if (v > lim) { bad++; console.log(`OVER BUDGET ${k}: ${v} > ${lim}`); }
}
if (m.errors) { bad++; console.log('page errors', errors); }
console.log(bad ? 'perf budget FAILED' : 'perf budget ok'); process.exit(bad ? 1 : 0);
