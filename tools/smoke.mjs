#!/usr/bin/env node
// Headless smoke test: loads the app from file://, collects console/page errors and prints headline figures
// and AUDIT results. Usage: node tools/smoke.mjs [file] [--json]
// Needs Playwright with a Chromium (PLAYWRIGHT_BROWSERS_PATH); set PW_MODULE to its path if not resolvable.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2);
const file = resolve(args.find(a => a.endsWith('.html')) || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort().pop());
const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + file);
await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
const out = await page.evaluate(() => {
  const A = window.AgentCaseArch, r = { version: A.VERSION };
  try { const m = model(); r.model = { yearSav: m.yearSav, yearRun: m.yearRun, setupTotal: m.setupTotal, horizon: m.horizon }; } catch (e) { r.modelErr = String(e); }
  try { const h = teEngineNow().headline; r.headline = typeof h === 'function' ? h() : h; } catch (e) { r.headlineErr = String(e); }
  try { r.payback = paybackMonthsCanonical(); r.npv = npvCanonical(); } catch (e) { r.canonErr = String(e); }
  try { const v = A.AUDIT.runChecks(); r.audit = { n: Array.isArray(v) ? v.length : v }; r.auditViolations = (Array.isArray(v) ? v : []).map(x => x.id || x.check || JSON.stringify(x).slice(0, 80)); } catch (e) { r.auditErr = String(e); }
  return r;
});
out.errors = errors;
console.log(JSON.stringify(out, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
