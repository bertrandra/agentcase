#!/usr/bin/env node
// Headless smoke test: loads the app from file://, collects console/page errors, prints headline figures and AUDIT
// results, and checks them against tools/golden.json (the reference figures of the default case).
// Usage: node tools/smoke.mjs [file] [--no-golden]
// Needs Playwright with a Chromium (PLAYWRIGHT_BROWSERS_PATH); set PW_MODULE to its path if not resolvable.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
let goldenFail = [];
if (!args.includes('--no-golden')) {
  const g = JSON.parse(readFileSync(fileURLToPath(new URL('./golden.json', import.meta.url)), 'utf8'));
  const close = (a, b) => typeof a === 'number' && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
  const checks = [['yearSav3', out.model && out.model.yearSav[2], g.yearSav3], ['yearRun3', out.model && out.model.yearRun[2], g.yearRun3], ['setupTotal', out.model && out.model.setupTotal, g.setupTotal],
    ['npv', out.npv, g.npv], ['payback', out.payback, g.payback], ['horizon', out.model && out.model.horizon, g.horizon], ['auditViolations', out.audit && out.audit.n, g.auditViolations]];
  goldenFail = checks.filter(([, got, want]) => !close(got, want)).map(([k, got, want]) => `${k}: got ${got}, expected ${want}`);
  out.golden = goldenFail.length ? { ok: false, mismatches: goldenFail } : { ok: true };
}
console.log(JSON.stringify(out, null, 2));
await browser.close();
process.exit(errors.length || goldenFail.length ? 1 : 0);
