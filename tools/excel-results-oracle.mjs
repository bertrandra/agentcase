#!/usr/bin/env node
// Oracle for the two Phase-6 workbooks that are built from the case results:
//   - the results workbook (legacy exportFinancialExcel, button "Export financial to Excel")
//   - the due-diligence pack (legacy ddExportPack / ddImportPack)
// For each fixture the LEGACY page is loaded, the legacy export is triggered with URL.createObjectURL hooked to capture the
// produced .xlsx, and a normalised JSON dump (sheet name, dimensions, every row's cell values/formulas) is written to
//   app/fixtures/xlsx-results/<id>.json        results workbook
//   app/fixtures/xlsx-results/dd-<id>.json     DD pack + the legacy outcome of re-importing a hand-edited copy of it
// Chart pictures are not dumped (images are ignored by the tests). Usage: node tools/excel-results-oracle.mjs [legacy.html] [--only id,id]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dumpWorkbook, editDdWorkbook, DD_EDITS } from './xlsx-dump.mjs';
import { RECIPES } from './oracle-recipes.mjs';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const ExcelJS = require(resolve('app/node_modules/exceljs'));
const args = process.argv.slice(2);
const file = resolve(args.find(a => a.endsWith('.html')) || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const only = (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean);
const RESULTS = ['golden', 'ctx-msi', 'curve-logistic', 'curve-gompertz', 'curve-bass', 'industry-med', 'horizon-1', 'horizon-5', 'econ-horizon-7', 'horizon-10', 'scope-reduced', 'hri-on', 'vtax-on', 'kh-high', 'econ-no-setup', 'econ-roi-low', 'econ-roi-mid'];
const DD = { golden: true, 'ctx-msi': true, 'industry-med': false, 'horizon-5': false, 'hri-on': false, 'scope-reduced': false, 'curve-gompertz': false, 'kh-high': false };
const out = resolve('app/fixtures/xlsx-results'); mkdirSync(out, { recursive: true });

const HOOK = `window.__cap = null; const _c = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { window.__cap = b; return _c(b); };
  HTMLAnchorElement.prototype.click = function () {}; window.alert = m => { window.__alert = m; };`;
const CAPTURED = `(async () => { const b = window.__cap; if (!b) return null; const u = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); })()`;
// The legacy snapshot restore silently drops the 'bass' adoption family (the page falls back to the default spline), so for the fixtures
// listed here the recipe code that selected the curve in the first place is replayed after the snapshot is applied.
const REPLAY = ['curve-bass'];
const load = async (browser, id) => {
  const state = JSON.parse(readFileSync(`app/fixtures/cases/${id}.json`, 'utf8'));
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', e => console.error(id, 'page error:', e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  const replay = REPLAY.includes(id) ? RECIPES.find(r => r.id === id).code : '';
  await page.evaluate(([s, hook, code]) => { (0, eval)(hook); applySnapshotState(Object.assign({}, s, { currentPersona: 'advanced' }), { background: true }); (0, eval)(code); readInputs(); refreshAll(); }, [state, HOOK, replay]);
  return page;
};
const parse = async b64 => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(b64, 'base64')); return wb; };

const browser = await pw.chromium.launch();
for (const id of RESULTS) {
  if (only.length && !only.includes(id)) continue;
  const page = await load(browser, id);
  await page.evaluate(() => exportFinancialExcel());
  const b64 = await page.evaluate(CAPTURED);
  if (!b64) { console.error(id, 'no workbook captured'); continue; }
  const dump = await dumpWorkbook(await parse(b64));
  writeFileSync(`${out}/${id}.json`, JSON.stringify(dump));
  console.log(id.padEnd(18), dump.map(s => `${s.name}[${s.rowCount}x${s.columnCount}]`).join(' '));
  await page.close();
}
for (const [id, withSens] of Object.entries(DD)) {
  if (only.length && !only.includes(id)) continue;
  const page = await load(browser, id);
  const { ids, exportState, preState } = await page.evaluate(() => {
    const ids = ddCollectRows().map(r => r.id), exportState = {}, preState = {};
    ids.forEach((id, i) => {
      const k = i % 6;
      if (k === 0) exportState[id] = { st: 'confirmed', owner: 'Ann', dueDate: '2026-01-02', note: 'n' + i };
      else if (k === 1) exportState[id] = { st: 'requested' };
      else if (k === 2) exportState[id] = { st: 'disputed', note: 'x' };
      else if (k === 3) exportState[id] = { st: 'waived' };
      else if (k === 4) exportState[id] = { owner: 'OnlyOwner' };
    });
    preState[ids[2]] = { st: 'requested', owner: 'Pre', dueDate: '2025-05-05', note: 'pre note' };
    preState[ids[5]] = { st: 'confirmed' };
    DD_STATE = JSON.parse(JSON.stringify(exportState));
    return { ids, exportState, preState };
  });
  let sens = null;
  if (withSens) sens = await page.evaluate(() => { ddComputeSensitivity(); return JSON.parse(JSON.stringify(DD_SENS)); });
  await page.evaluate(() => ddExportPack());
  const b64 = await page.evaluate(CAPTURED);
  const wb = await parse(b64), dump = await dumpWorkbook(wb);
  // re-import a hand-edited copy of the pack into a case holding preState; record the legacy state and status message
  const edits = DD_EDITS(ids);
  await editDdWorkbook(wb, edits);
  const edited = Buffer.from(await wb.xlsx.writeBuffer()).toString('base64');
  const imported = await page.evaluate(async ([b64e, pre]) => {
    DD_STATE = pre; renderDueDiligence = function () {};   // a re-render would replace the status element the message is written to
    document.body.insertAdjacentHTML('afterbegin', '<span id="ddImportStatus"></span>');
    const bin = Uint8Array.from(atob(b64e), c => c.charCodeAt(0));
    await ddImportPack(new File([bin], 'pack.xlsx'));
    return { state: JSON.parse(JSON.stringify(DD_STATE)), message: document.getElementById('ddImportStatus').innerText };
  }, [edited, preState]);
  const bad = await page.evaluate(async pre => {   // a file with no DD_Register sheet, and a file that is not a workbook
    const res = [];
    const ws = new (window.ExcelJS.Workbook)(); ws.addWorksheet('Other').addRow(['x']);
    const noSheet = new Uint8Array(await ws.xlsx.writeBuffer());
    for (const bytes of [new Uint8Array([1, 2, 3, 4]), noSheet]) { DD_STATE = pre; document.getElementById('ddImportStatus').innerText = ''; await ddImportPack(new File([bytes], 'x.xlsx')); res.push({ message: document.getElementById('ddImportStatus').innerText, state: JSON.parse(JSON.stringify(DD_STATE)) }); }
    return res;
  }, preState);
  writeFileSync(`${out}/dd-${id}.json`, JSON.stringify({ id, withSens, exportState, preState, sens, sheets: dump, edits, imported, notAWorkbook: bad[0], noSheet: bad[1] }));
  console.log('dd-' + id.padEnd(15), dump.map(s => `${s.name}[${s.rowCount}x${s.columnCount}]`).join(' '), '|', imported.message);
  await page.close();
}
await browser.close();
