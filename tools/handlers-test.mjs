#!/usr/bin/env node
// Every inline handler (onclick="fn(...)", onchange=…) found in the markup and in the HTML the app generates
// for every section must call a function that exists. Catches dead-code removal that went one step too far.
// Usage: node tools/handlers-test.mjs [file]
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const arg = process.argv.slice(2).find(a => a.endsWith('.html'));
const file = resolve(arg || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort().pop());
const browser = await pw.chromium.launch(); const page = await (await browser.newContext()).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
await page.goto('file://' + file);
await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
const r = await page.evaluate(async () => {
  const sleep = ms => new Promise(x => setTimeout(x, ms)); const seen = new Map();
  const KW = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof', 'new', 'void', 'event', 'this', 'else', 'do', 'in', 'of', 'confirm', 'alert', 'prompt', 'parseInt', 'parseFloat', 'String', 'Number', 'Math', 'JSON', 'Array', 'Object', 'Boolean', 'isNaN', 'isFinite', 'Date', 'setTimeout', 'clearTimeout', 'document', 'window', 'Set', 'Map', 'encodeURIComponent', 'decodeURIComponent', 'stopPropagation', 'preventDefault', 'getElementById', 'querySelector', 'querySelectorAll', 'rgba', 'rgb', 'calc', 'var', 'url']);
  const scan = () => document.querySelectorAll('*').forEach(el => { for (const a of el.getAttributeNames()) { if (!a.startsWith('on')) continue; const v = el.getAttribute(a) || ''; for (const m of v.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) { const n = m[2]; if (KW.has(n)) continue; if (!seen.has(n)) seen.set(n, (el.closest('.tab-content') || {}).id || '?'); } } });
  setPersona('advanced'); scan();
  for (const s of SECTION_CATALOG) { try { goTab(s.id); if (TABRENDER[s.id]) TABRENDER[s.id](); await sleep(25); } catch (e) { } scan(); }
  for (const t of ['personas', 'groups', 'sections', 'assign', 'layout', 'sequence', 'deps', 'preview']) { try { goTab('personas'); pmSubTab(t); await sleep(25); } catch (e) { } scan(); }
  try { renderSnapshotManager(); renderAutosavePanel(); wizStart(); renderWizBar(); openPalette(); } catch (e) { } scan();
  const missing = []; for (const [n, sec] of seen) { let ok = false; try { ok = typeof (0, eval)(n) === 'function'; } catch (e) { } if (!ok) missing.push(n + ' (in ' + sec + ')'); }
  return { checked: seen.size, missing };
});
console.log(JSON.stringify({ ...r, pageErrors: errors.slice(0, 5) }, null, 1));
await browser.close();
console.log(r.missing.length ? `FAIL: ${r.missing.length} handler target(s) undefined` : `PASS: ${r.checked} distinct handler functions all defined`);
process.exit(r.missing.length || errors.length ? 1 : 0);
