#!/usr/bin/env node
// Oracle: loads the LEGACY single-file app, applies each fixture recipe, and records
//   app/fixtures/cases/<id>.json     the full snapshot state (the new engine's input)
//   app/fixtures/expected/<id>.json  what the legacy engine computes from it (the new engine's contract)
// Usage: node tools/oracle.mjs [legacy.html] [--only id[,id]]
// Needs Playwright + Chromium (PLAYWRIGHT_BROWSERS_PATH; PW_MODULE if playwright is not resolvable).
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RECIPES } from './oracle-recipes.mjs';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2);
const file = resolve(args.find(a => a.endsWith('.html')) || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean);
const outDir = resolve('app/fixtures');
mkdirSync(outDir + '/cases', { recursive: true }); mkdirSync(outDir + '/expected', { recursive: true });
const browser = await pw.chromium.launch();
let n = 0;
for (const r of RECIPES) {
  if (only.length && !only.includes(r.id)) continue;
  const page = await (await browser.newContext()).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  const res = await page.evaluate(code => {
    // eslint-disable-next-line no-eval
    (0, eval)(code); readInputs(); refreshAll();
    const state = collectSnapshotState({ skipPackage: true }); delete state.savedAt; delete state.namedSnapshots;
    const exp = { model: JSON.parse(JSON.stringify(model())) };
    try { exp.payback = paybackMonthsCanonical(); exp.npv = npvCanonical(); } catch (e) { exp.canonErr = String(e); }
    try { const h = teEngineNow().headline; exp.headline = JSON.parse(JSON.stringify(typeof h === 'function' ? h() : h)); } catch (e) { exp.headlineErr = String(e); }
    exp.phaseScope = phaseScope(); exp.glassCeiling = computeGlassCeiling();
    exp.audit = AgentCaseArch.AUDIT.runChecks();
    return { state, exp };
  }, r.code || '');
  if (errors.length) console.error(r.id, 'page errors:', errors.slice(0, 2));
  res.exp.id = r.id; res.exp.desc = r.desc;
  writeFileSync(`${outDir}/cases/${r.id}.json`, JSON.stringify(res.state));
  writeFileSync(`${outDir}/expected/${r.id}.json`, JSON.stringify(res.exp, null, 1));
  console.log(r.id.padEnd(28), 'sav3', Math.round(res.exp.model.yearSav?.[2] ?? NaN), 'run3', Math.round(res.exp.model.yearRun?.[2] ?? NaN), 'eff', res.exp.model.eff?.toFixed?.(1));
  await page.close(); n++;
}
await browser.close();
console.log(n, 'fixtures written to', outDir);
