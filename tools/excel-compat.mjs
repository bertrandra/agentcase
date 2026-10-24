#!/usr/bin/env node
// Excel compatibility (OUR writer → LEGACY reader): the workbook our TypeScript writer produces for each fixture is imported by the legacy page's
// importParams() in headless Chromium; the legacy state afterwards must equal what OUR reader makes of the same file (state keys, import notes and the
// computed figures). A second group feeds hand-damaged variants of our workbook (unknown ids, out-of-range values, contradictory scope, …) to both readers.
// Usage: node tools/excel-compat.mjs [legacy.html] [--only id,id] [--no-mutations]
// Needs Playwright (PW_MODULE / PLAYWRIGHT_BROWSERS_PATH like tools/oracle.mjs) and `cd app && npm ci`. Our TS modules are loaded through vite (no build step).
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EXCEL_FIXTURES } from './excel-fixtures.mjs';
import { MUTATIONS } from './excel-mutations.mjs';

const require = createRequire(import.meta.url), appReq = createRequire(resolve('app/package.json'));
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const args = process.argv.slice(2);
const file = resolve(args.find((a) => a.endsWith('.html')) || readdirSync('.').filter((f) => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const only = args.includes('--only') ? (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean) : [];
const ids = only.length ? only : EXCEL_FIXTURES;

// ---- our modules, loaded as TypeScript through vite's SSR loader
const { createServer } = await import(pathToFileURL(resolve('app/node_modules/vite/dist/node/index.js')).href);
const vite = await createServer({ root: resolve('app'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const load = (p) => vite.ssrLoadModule(p);
const P = await load('/src/store/persistence/excel/params/index.ts'), A = await load('/src/store/persistence/excel/params/apply.ts');
const { LEGACY_SECTIONS } = await load('/src/ui/zones/registry.ts'), { fromSnapshot } = await load('/src/store/persistence/snapshot.ts');
const { THEME_DEFAULT } = await load('/src/domain/theme/index.ts');   // the print theme of the exports (the default look)
const { BUILTIN_PERSONAS } = await load('/src/domain/nav/structures.ts');
const { makeDefaultDoc } = await load('/src/store/instance.ts'), { refitPotential } = await load('/src/store/derive.ts'), { computeCase } = await load('/src/domain/index.ts');
const { produce } = appReq('immer'), ExcelJS = appReq('exceljs');
const ENV = { sections: LEGACY_SECTIONS };   // the 79 case sections, as the app's own export (ParamsExcelPanel): the legacy file knows no other

const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([, y]) => y !== undefined).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
/** Legacy drops the production flag of the environments on import; ours keeps it (documented difference). */
const norm = (k, v) => (k === 'ENVIRONMENTS' && Array.isArray(v) ? v.map(({ isProd, ...e }) => e) : v);
const near = (a, b, p, out) => {
  if (a === 'Infinity') { if (b !== Infinity && b !== 'Infinity') out.push(`${p}: ${a} vs ${b}`); }
  else if (typeof a === 'number') { if (!(typeof b === 'number' && (Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a)) || (Number.isNaN(a) && Number.isNaN(b))))) out.push(`${p}: legacy ${a} vs ours ${b}`); }
  else if (Array.isArray(a)) a.forEach((x, i) => near(x, b?.[i], `${p}[${i}]`, out));
  else if (a && typeof a === 'object') Object.keys(a).forEach((k) => near(a[k], b?.[k], `${p}.${k}`, out));
  else if (a !== b) out.push(`${p}: legacy ${a} vs ours ${b}`);
};

const browser = await pw.chromium.launch();
const boot = async () => {
  const page = await (await browser.newContext()).newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  return page;
};
const SNAP = () => {
  const state = collectSnapshotState({ skipPackage: true }); delete state.savedAt; delete state.namedSnapshots;
  const exp = { model: JSON.parse(JSON.stringify(model())) };
  try { exp.payback = paybackMonthsCanonical(); exp.npv = npvCanonical(); } catch (e) { exp.canonErr = String(e); }
  exp.phaseScope = phaseScope(); exp.glassCeiling = computeGlassCeiling();
  return { state, exp };
};
/** The legacy page imports `bytes` (pristine page); resolves to its state, figures and notes. */
async function legacyImport(bytes) {
  const page = await boot();
  const b64 = Buffer.from(bytes).toString('base64');
  const res = await page.evaluate(async ([data, snapFn]) => {
    const bin = atob(data); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    await importParams({ files: [{ name: 'ours.xlsx', arrayBuffer: async () => buf.buffer }] });
    const failed = /Import failed/.test(document.getElementById('importStatus').innerText);
    return { failed, status: document.getElementById('importStatus').innerText.split('\n')[0], notes: [...document.querySelectorAll('#importStatus li')].map((li) => li.textContent), ...(0, eval)('(' + snapFn + ')')() };
  }, [b64, SNAP.toString()]);
  await page.close();
  return res;
}
/**
 * The default case as the legacy app shipped it (the pristine page the legacy import runs on), as `tests/helpers/excelParams.ts` freshDoc:
 * without the built-in personas added since (Business journey, DEV-MENU-STRUCTURES), which a workbook without the persona sheets
 * would otherwise show as a difference of the base, not of the import.
 */
function legacyPristineDoc() {
  const d = makeDefaultDoc(), ids = new Set(BUILTIN_PERSONAS.map((p) => p.id));
  d.PERSONAS = d.PERSONAS.filter((p) => !ids.has(p.id));
  d.PERSONA_SECTIONS = Object.fromEntries(Object.entries(d.PERSONA_SECTIONS).filter(([k]) => !ids.has(k)));
  return d;
}
/** Our reader on the pristine case, applied the way the import command does. */
async function ourImport(bytes) {
  const base = legacyPristineDoc(), { patch, notes } = await P.readParamsWorkbook(bytes, base, ENV);
  return { notes, doc: produce(base, (d) => { A.applyParamsPatch(d, patch); }) };
}
/**
 * Keys outside the comparison: the save time, our schema stamp, and `currentPersona` — the persona is view state of the tab here (D3,
 * `store/persona.ts`), never a key of the case; the legacy snapshot carries the pristine page's persona, which no import touches.
 */
const SKIP_KEYS = new Set(['savedAt', '_schema', 'currentPersona']);
function compare(label, leg, ours) {
  const problems = [], keys = new Set([...Object.keys(leg.state), ...Object.keys(ours.doc)]);
  for (const k of keys) if (!SKIP_KEYS.has(k) && canon(norm(k, leg.state[k])) !== canon(norm(k, ours.doc[k]))) problems.push(`state key ${k}`);
  // the two notes below are ours alone: the legacy page applied those columns to constants it never saved, here they are reported as reference-only
  ours.notes = ours.notes.filter((n) => !/^(Agent Catalog|Loop Pairs): /.test(n));
  if (canon(leg.notes) !== canon(ours.notes)) problems.push(`notes: legacy ${JSON.stringify(leg.notes)} vs ours ${JSON.stringify(ours.notes)}`);
  const c = computeCase(ours.doc);
  near(leg.exp.model, JSON.parse(JSON.stringify(c.model, (_k, v) => (v === Infinity ? 'Infinity' : v))), 'model', problems);
  near(leg.exp.phaseScope, c.phaseScope, 'phaseScope', problems); near(leg.exp.glassCeiling, c.glassCeiling, 'glassCeiling', problems);
  near(leg.exp.payback, c.payback, 'payback', problems); near(leg.exp.npv, c.npv, 'npv', problems);
  console.log((problems.length ? 'FAIL ' : 'ok   ') + label.padEnd(34) + (problems.length ? problems.slice(0, 4).join(' | ') : `${leg.notes.length} notes, figures equal`));
  return problems.length === 0;
}

let ok = 0, bad = 0;
const tally = (r) => { if (r) ok++; else { bad++; process.exitCode = 1; } };
// ---- group 1: each fixture's workbook, written by us, read by the legacy app
let golden;
for (const id of ids) {
  const opened = produce(fromSnapshot(JSON.parse(readFileSync(`app/fixtures/cases/${id}.json`, 'utf8'))), (d) => { refitPotential(d); });   // as the app opens a case
  const bytes = await P.paramsWorkbookBytes(opened, 'all', ENV, THEME_DEFAULT);
  if (id === 'golden') golden = bytes;
  const leg = await legacyImport(bytes);
  if (leg.failed) { console.log(`FAIL ${id.padEnd(34)}legacy refused our workbook: ${leg.status}`); tally(false); continue; }
  tally(compare(id, leg, await ourImport(bytes)));
}
// ---- group 2: hand-damaged variants of our workbook, read by both
if (!args.includes('--no-mutations')) {
  golden ??= await P.paramsWorkbookBytes(makeDefaultDoc(), 'all', ENV, THEME_DEFAULT);
  for (const [name, edit] of Object.entries(MUTATIONS)) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(golden); edit(wb);
    const bytes = new Uint8Array(await wb.xlsx.writeBuffer()), leg = await legacyImport(bytes);
    tally(compare(`mutation: ${name}`, leg, await ourImport(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))));
  }
}
console.log(`\n${ok} identical, ${bad} different`);
await browser.close(); await vite.close();
