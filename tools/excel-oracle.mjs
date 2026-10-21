#!/usr/bin/env node
// Excel oracle: for each case, the LEGACY app exports its "all parameters" workbook, then a pristine legacy page imports that same file.
// Records, per case id:
//   app/fixtures/xlsx/<id>.xlsx           the legacy exportParams('all') workbook
//   app/fixtures/xlsx/<id>.imported.json  { status, notes, exp, state, base? } legacy result of importParams on a pristine page (or, for a recipe,
//                                         on its base state `base`); `state` / `base` hold only the keys differing from pristine.json
//   app/fixtures/xlsx/pristine.json       the pristine legacy state (reference for the diffs)
// Cases: app/fixtures/cases/<id>.json (tools/excel-fixtures.mjs EXCEL_FIXTURES) and the synthetic EXCEL_RECIPES.
// Usage: node tools/excel-oracle.mjs [legacy.html] [--only id,id] [--all]   (--all = every fixture of app/fixtures/cases, no recipes)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXCEL_FIXTURES, EXCEL_RECIPES } from './excel-fixtures.mjs';

const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2);
const file = resolve(args.find((a) => a.endsWith('.html')) || readdirSync('.').filter((f) => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean);
const out = resolve('app/fixtures/xlsx'), casesDir = resolve('app/fixtures/cases');
mkdirSync(out, { recursive: true });
const ids = args.includes('--all') ? readdirSync(casesDir).map((f) => f.replace(/\.json$/, '')) : (only.length ? only.filter((i) => existsSync(`${casesDir}/${i}.json`)) : EXCEL_FIXTURES);

const boot = async (browser) => {
  const page = await (await browser.newContext()).newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  return page;
};
/** Page-side: the figures + state the comparison needs (same shape as tools/oracle.mjs). */
const SNAP = () => {
  const state = collectSnapshotState({ skipPackage: true }); delete state.savedAt; delete state.namedSnapshots;
  const exp = { model: JSON.parse(JSON.stringify(model())) };
  try { exp.payback = paybackMonthsCanonical(); exp.npv = npvCanonical(); } catch (e) { exp.canonErr = String(e); }
  try { const h = teEngineNow().headline; exp.headline = JSON.parse(JSON.stringify(typeof h === 'function' ? h() : h)); } catch (e) { exp.headlineErr = String(e); }
  exp.phaseScope = phaseScope(); exp.glassCeiling = computeGlassCeiling();
  return { state, exp };
};
/** Page-side: Blob → base64. */
const TO_B64 = async (blob) => { const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(bin); };

const browser = await pw.chromium.launch();
{ const p = await boot(browser); writeFileSync(out + '/pristine.json', JSON.stringify(await p.evaluate(SNAP))); await p.close(); }
const base0 = JSON.parse(readFileSync(out + '/pristine.json', 'utf8')).state;
const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const diffKeys = (state) => Object.fromEntries(Object.keys(state).filter((k) => canon(state[k]) !== canon(base0[k])).map((k) => [k, state[k]]));
const cases = [...ids.map((id) => ({ id, state: JSON.parse(readFileSync(`${casesDir}/${id}.json`, 'utf8')) })),
  ...(args.includes('--all') ? [] : EXCEL_RECIPES.filter((r) => !only.length || only.includes(r.id)))];

for (const c of cases) {
  // page A: the case as the legacy app sees it (a fixture state, or a recipe's base then edit) → its workbook
  const a = await boot(browser);
  const gen = await a.evaluate(async ([st, base, edit, conv]) => {
    if (st) applySnapshotState(Object.assign({}, st, { currentPersona: 'advanced' }), { background: true });
    if (base) (0, eval)(base);
    readInputs(); refreshAll();
    let baseState = null;
    if (base !== undefined) baseState = collectSnapshotState({ skipPackage: true });
    if (edit) { (0, eval)(edit); readInputs(); refreshAll(); }
    let blob = null; const cu = URL.createObjectURL; URL.createObjectURL = (x) => { if (!blob) blob = x; return cu.call(URL, x); };
    await exportParams('all'); URL.createObjectURL = cu;
    return { b64: await (0, eval)('(' + conv + ')')(blob), baseState };
  }, [c.state ?? null, c.base, c.edit, TO_B64.toString()]);
  await a.close();
  writeFileSync(`${out}/${c.id}.xlsx`, Buffer.from(gen.b64, 'base64'));
  // page B: the import target (pristine, or a recipe's base state) imports that workbook
  const b = await boot(browser);
  const res = await b.evaluate(async ([data, snapFn, baseState]) => {
    if (baseState) { applySnapshotState(baseState, { background: true }); readInputs(); refreshAll(); }
    const bin = atob(data); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    await importParams({ files: [{ name: 'oracle.xlsx', arrayBuffer: async () => buf.buffer }] });
    const notes = [...document.querySelectorAll('#importStatus li')].map((li) => li.textContent);
    const status = document.getElementById('importStatus').innerText.split('\n')[0];
    return { status, notes, ...(0, eval)('(' + snapFn + ')')() };
  }, [gen.b64, SNAP.toString(), gen.baseState]);
  await b.close();
  // keep the fixture small: only the state keys that differ from the pristine page (the rest equals pristine.json)
  res.state = diffKeys(res.state);
  if (gen.baseState) { delete gen.baseState.savedAt; delete gen.baseState.namedSnapshots; res.base = diffKeys(gen.baseState); }
  writeFileSync(`${out}/${c.id}.imported.json`, JSON.stringify(res));
  console.log(c.id.padEnd(26), (gen.b64.length * 0.75 / 1024).toFixed(0) + 'KB', res.status.slice(0, 40), res.notes.length + ' notes');
}
await browser.close();
