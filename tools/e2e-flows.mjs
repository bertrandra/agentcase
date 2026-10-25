#!/usr/bin/env node
// Real-browser check of the BUILT single-file app (app/dist/index.html) under its Content-Security-Policy: every flow that reads or writes a file,
// draws, or runs long. Fails on a page error, a console error, a missing download or result, or ANY `securitypolicyviolation` event.
// Flows: the policy blocks the network (probe), JSON save + open, HTML snapshot save + reopen (the policy travels with it), the critical-delivery
// report (opened under its own policy), parameters workbook export + import, Results and cost-model workbooks, Monte Carlo, display (dark) and case
// themes, a PNG and an SVG customer logo (FileReader, canvas), and a ?theme= link.
// Usage: node tools/e2e-flows.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
process.chdir(new URL('..', import.meta.url).pathname);
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const url = 'file://' + resolve('app/dist/index.html'), out = mkdtempSync(join(tmpdir(), 'agentcase-flows-'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="teal"/></svg>');

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => {   // before the app's script: every CSP violation of every page of the context is kept
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(`${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'}`));
});
let failures = 0, steps = 0;
const fail = (what, why) => { failures++; console.log(`FAIL ${what}: ${why}`); };
const watch = (page, errors) => {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Content Security Policy/.test(m.text())) errors.push('console: ' + m.text()); });
};
const violations = (page) => page.evaluate(() => window.__cspViolations.splice(0));
const page = await ctx.newPage(), errors = [];
watch(page, errors);

/** One named step: runs `fn`, then fails on errors or CSP violations raised meanwhile. */
async function step(name, fn, p = page) {
  steps++; errors.length = 0;
  try { await fn(); } catch (e) { fail(name, e.message.split('\n')[0]); }
  const v = await violations(p).catch(() => []);
  if (v.length) fail(name, `CSP violation(s): ${[...new Set(v)].join(' | ')}`);
  if (errors.length) fail(name, errors.slice(0, 2).join(' | '));
  console.log(`${name}: done`);
}
const download = async (click) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]); const f = join(out, d.suggestedFilename()); await d.saveAs(f); return f; };
const section = async (label) => {
  const b = page.locator('nav[aria-label=Sections] button:visible, .ac-groupbar button:visible').filter({ hasText: label }).first();
  if (!(await b.count())) {   // sidebar groups are collapsible: open the group headers (▼) until the section button is visible (as tools/perf.mjs)
    const heads = page.locator('nav[aria-label=Sections] button').filter({ hasText: /▼$/ });
    for (let i = 0, n = await heads.count(); i < n && !(await b.count()); i++) await heads.nth(i).click();
  }
  await b.click(); await page.waitForSelector('main h1');
};
const openCase = async (p, file) => {
  await p.setInputFiles('input[type=file][accept*="json"] >> nth=0', { name: 'case.json', mimeType: 'application/json', buffer: readFileSync(file) });
  await p.selectOption('select[aria-label=Persona]', 'advanced');
};
const kpis = (p) => p.evaluate(() => [...document.querySelectorAll('.ac-kpi-v')].map((e) => e.textContent).join('|'));

await page.goto(url); await page.waitForSelector('.ac-shell .ac-kpi-v');
await step('the policy blocks the network (probe)', async () => {
  await page.evaluate(() => { const i = new Image(); i.src = 'https://example.invalid/probe.png'; document.body.append(i); return fetch('https://example.invalid/').catch(() => null); });
  // the violation reports are asynchronous: until both arrived (5 s at most; read without consuming them)
  await page.waitForFunction(() => ['img-src', 'connect-src'].every((d) => window.__cspViolations.some((x) => x.startsWith(d))), null, { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('img[src^="https://example.invalid"]').forEach((i) => i.remove()));   // not into the snapshot below
  const v = await violations(page);
  if (!v.some((x) => x.startsWith('img-src')) || !v.some((x) => x.startsWith('connect-src'))) throw new Error(`expected img-src and connect-src violations, got: ${v.join(' | ') || 'none'}`);
});
await step('open a case (JSON, industry-med)', () => openCase(page, 'app/fixtures/cases/industry-med.json'));
const before = await kpis(page);
await step('JSON save + open', async () => {
  await section('Import / Export');
  const f = await download(() => page.getByRole('button', { name: '⬇️ Save snapshot file' }).click());
  await page.setInputFiles('input[aria-label="Snapshot file"]', f);
  await page.getByText(/Opened .* — Ctrl\+Z restores/).first().waitFor();
  if ((await kpis(page)) !== before) throw new Error('the reopened case shows other headline figures');
});
let snapshot = '';
await step('HTML snapshot save', async () => {
  snapshot = await download(() => page.getByRole('button', { name: '💾 Download HTML snapshot' }).click());
  if (!/http-equiv="Content-Security-Policy"/.test(readFileSync(snapshot, 'utf8'))) throw new Error('the snapshot does not carry the policy');
});
const reopened = await ctx.newPage(), errors2 = [];
watch(reopened, errors2);
await step('HTML snapshot reopen', async () => {
  await reopened.goto('file://' + snapshot); await reopened.waitForSelector('.ac-shell .ac-kpi-v');
  // the embedded case is applied after the shell: until the headline shows its figures (5 s), then compared
  await reopened.waitForFunction((b) => [...document.querySelectorAll('.ac-kpi-v')].map((e) => e.textContent).join('|') === b, before, { timeout: 5000 }).catch(() => {});
  if ((await kpis(reopened)) !== before) throw new Error('the snapshot reopens with other headline figures');
  if (errors2.length) throw new Error(errors2.join(' | '));
}, reopened);
await reopened.close();
await step('critical-delivery report (opened under its own policy)', async () => {
  const f = await download(() => page.getByRole('button', { name: '📄 Export critical-delivery report' }).click());
  if (!/http-equiv="Content-Security-Policy"/.test(readFileSync(f, 'utf8'))) throw new Error('the report has no policy');
  const r = await ctx.newPage(); await r.goto('file://' + f); await r.waitForSelector('h1');
  const v = await violations(r); await r.close();
  if (v.length) throw new Error(`report: ${v.join(' | ')}`);
});
// D5: ExcelJS is embedded gzip-compressed and started on the first Excel use, as an inline script removed at once (no code of it at boot, none left after)
const excelInDom = (p) => p.evaluate(() => [...document.scripts].some((s) => (s.textContent ?? '').includes('ExcelJS 19-10-2023')) || 'ExcelJS' in window);
await step('parameters workbook export + import', async () => {
  if (await excelInDom(page)) throw new Error('ExcelJS is present before the first Excel use');
  await page.getByRole('tab', { name: /Export \/ Import current settings/ }).click();
  const f = await download(() => page.getByRole('button', { name: '⬇️ Export all', exact: true }).click());
  if (await excelInDom(page)) throw new Error('the decompressed ExcelJS script or its global was left in the page');
  await page.setInputFiles('input[aria-label="Settings workbook (.xlsx)"]', f);
  await page.getByText(/Imported successfully/).first().waitFor({ timeout: 30000 });
  if ((await kpis(page)) !== before) throw new Error('the re-imported workbook changed the headline figures');
});
await step('Results workbook + cost model export', async () => {
  await page.getByRole('tab', { name: /Results workbook/ }).click();
  await download(() => page.getByRole('button', { name: /Export financial to Excel/ }).click());
  await download(() => page.getByRole('button', { name: /Export cost model/ }).click());
});
await step('Monte Carlo run', async () => {
  await section('Monte Carlo');
  await page.getByRole('button', { name: '▶ Run simulation' }).click();
  await page.waitForFunction(() => /P50/.test(document.querySelector('main')?.textContent ?? ''), null, { timeout: 60000 });
});
await step('display theme: dark, then back to light', async () => {
  await page.getByRole('button', { name: 'Display settings' }).click();
  await page.getByRole('radio', { name: /Dark/ }).check(); await page.waitForFunction(() => document.documentElement.getAttribute('data-ac-mode') === 'dark');
  await page.getByRole('radio', { name: /Light/ }).check(); await page.waitForFunction(() => !document.documentElement.hasAttribute('data-ac-mode'));
  await page.getByRole('button', { name: 'Display settings' }).click();
});
await step('case theme: activate another built-in theme', async () => {
  await section('Brand & theme');
  await page.locator('.ac-bt-item').nth(1).click();
  await page.getByRole('button', { name: 'Activate', exact: true }).click(); await page.locator('.ac-bt-item').nth(1).locator('.ac-bt-badge.is-active').waitFor();
});
await step('customer logo: PNG, then SVG (FileReader, canvas)', async () => {
  await section('Engagement context');
  for (const [name, mimeType, buffer] of [['logo.png', 'image/png', PNG], ['logo.svg', 'image/svg+xml', SVG]]) {
    await page.setInputFiles('input[aria-label="Customer logo file"]', { name, mimeType, buffer });
    await page.waitForFunction(() => [...document.querySelectorAll('img')].some((i) => i.src.startsWith('data:image/png') && i.complete), null, { timeout: 10000 });
  }
});
await step('?theme= link', async () => {
  await page.goto(url + '?theme=2'); await page.waitForSelector('.ac-shell .ac-kpi-v');
  await page.getByText(/Viewing theme 2 · .* from the link/).waitFor({ timeout: 5000 });   // the link's theme is in effect (its notice is shown)
});
await browser.close();
console.log(steps, 'flows,', failures, 'failure(s)');
process.exit(failures ? 1 : 0);
