#!/usr/bin/env node
// Parallel run: opens the same customer files (.xlsx parameter workbooks, .html / .json snapshots) in the LEGACY single-file app
// and in the BUILT TypeScript app, and compares the headline figures (savings and run cost of the last year, NPV, payback,
// effective automation, glass ceiling). Usage: node tools/parallel-run.mjs [--corpus full] [files...]
//   default: the 40 committed parameter workbooks (app/fixtures/xlsx/*.xlsx); --corpus full adds the 107 case files (app/fixtures/cases/*.json).
// A difference recorded in tools/parallel-run-known.json (its deviation id, e.g. DEV-SNAPSHOT-RESTORE, and the exact difference line) is reported as KNOWN
// and does not fail; any other difference fails, and so does a recorded difference that changed or disappeared (update the file and docs/DEVIATIONS.md then).
import { createRequire } from 'node:module';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
const argv = process.argv.slice(2), full = argv.includes('--corpus') && argv[argv.indexOf('--corpus') + 1] === 'full';
const ARGS = argv.filter((a, i) => a !== '--corpus' && argv[i - 1] !== '--corpus').map(f => resolve(f));   // resolved against the caller's directory, before the chdir
process.chdir(new URL('..', import.meta.url).pathname);   // paths below are relative to the repository root, whatever the caller's directory (npm run parallel-run runs from app/)
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const legacyFile = resolve(readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const built = resolve('app/dist/index.html');
let files = ARGS;
if (!files.length) files = readdirSync('app/fixtures/xlsx').filter(f => f.endsWith('.xlsx')).sort().map(f => resolve('app/fixtures/xlsx', f));
if (full) files.push(...readdirSync('app/fixtures/cases').filter(f => f.endsWith('.json')).sort().map(f => resolve('app/fixtures/cases', f)));
const known = JSON.parse(readFileSync('tools/parallel-run-known.json', 'utf8')).known;   // [{ file, deviation, diff }]
const browser = await pw.chromium.launch();

async function legacyFigures(file) {
  const page = await (await browser.newContext()).newPage();
  const ext = extname(file).toLowerCase(), buf = readFileSync(file);
  await page.goto('file://' + (ext === '.html' ? file : legacyFile));
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  if (ext === '.xlsx') await page.evaluate(async b => { const u = Uint8Array.from(atob(b), c => c.charCodeAt(0)); await importParams({ files: [{ name: 'in.xlsx', arrayBuffer: async () => u.buffer }] }); }, buf.toString('base64'));
  if (ext === '.json') await page.evaluate(s => { applySnapshotState(s); readInputs(); refreshAll(); }, JSON.parse(buf.toString('utf8')));
  const r = await page.evaluate(() => { readInputs(); refreshAll(); const m = model(), n = npvCanonical(), p = paybackMonthsCanonical(); const Y = teEngineNow().years(), e = Y[Y.length - 1]; return { sav: e.savings, run: e.totalRunCost, npv: n, payback: p, eff: m.eff, ceiling: m.ceiling }; });
  await page.context().close(); return r;
}
async function newFigures(file) {
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  await page.goto('file://' + built); await page.waitForSelector('.ac-shell .ac-kpi-v');
  const ext = extname(file).toLowerCase(), data = readFileSync(file);
  if (ext === '.xlsx') {
    await page.selectOption('select[aria-label=Persona]', 'advanced');
    // the sidebar groups are collapsible: open the group headers (▼) one by one until the section button is visible
    const io = page.locator('nav[aria-label=Sections] button:visible, .ac-groupbar button:visible').filter({ hasText: /Import \/ Export/ }).first(), heads = page.locator('nav[aria-label=Sections] button').filter({ hasText: /▼$/ });
    for (let i = 0, n = await heads.count(); i < n && !(await io.count()); i++) await heads.nth(i).click();
    await io.click();
    await page.locator('[role=tab]', { hasText: /Export \/ Import current settings/ }).click();
    await page.setInputFiles('input[aria-label="Settings workbook (.xlsx)"]', { name: basename(file), mimeType: 'application/octet-stream', buffer: data });
  } else await page.setInputFiles('input[type=file][accept*="json"]', { name: basename(file), mimeType: ext === '.html' ? 'text/html' : 'application/json', buffer: data });
  await page.waitForTimeout(700);
  const kpi = await page.locator('.ac-kpi').evaluateAll(els => els.map(e => [e.querySelector('.ac-kpi-l').textContent, e.querySelector('.ac-kpi-v').textContent]));
  // the NPV left the top bar (v19): read it from the Financial section's verdict tile ("€1,074K" above "NPV @8%")
  await page.selectOption('select[aria-label=Persona]', 'advanced');   // opening a file resets the persona; Advanced shows every section
  await page.waitForTimeout(300);
  const fin = page.locator('nav[aria-label=Sections] button:visible, .ac-groupbar button:visible').filter({ hasText: /Financial/ }).first(), heads2 = page.locator('nav[aria-label=Sections] button').filter({ hasText: /▼$/ });
  for (let i = 0, n = await heads2.count(); i < n && !(await fin.count()); i++) await heads2.nth(i).click();
  await fin.click(); await page.waitForTimeout(400);
  const npv = /([-−]?€[\d,]+K)\s*\nNPV @/.exec(await page.locator('main').innerText())?.[1];
  await page.context().close(); return { ...Object.fromEntries(kpi), NPV: npv && npv.replace('−', '-').replace('K', 'k') };
}
const k = v => (v < 0 ? '-' : '') + '€' + Math.round(Math.abs(v) / 1000).toLocaleString('en-US') + 'k', pct = v => Math.round(v) + '%';
let bad = 0, knownSeen = 0;
const seen = new Set();
for (const f of files) {
  let L, N;
  try { L = await legacyFigures(f); N = await newFigures(f); } catch (e) { bad++; console.log('ERROR', basename(f), String(e.message).split('\n')[0]); continue; }
  const get = pre => Object.entries(N).find(([l]) => l.startsWith(pre))?.[1]?.replace('−', '-');   // DEV-NEG-MONEY: the new build prints negatives with U+2212
  const checks = [['savings', k(L.sav), get('Savings')], ['run cost', k(L.run), get('Run cost')], ['NPV', k(L.npv), get('NPV')], ['payback', L.payback == null ? 'beyond horizon' : L.payback + ' mo', get('Payback')], ['effective', pct(L.eff), get('Effective')], ['ceiling', pct(L.ceiling), get('Glass')]];
  const diff = checks.filter(([, a, b]) => a !== b);
  const line = diff.map(([n, a, b]) => `${n}: legacy ${a} vs new ${b}`).join(' | '), kn = known.find(x => x.file === basename(f));
  if (kn) seen.add(kn.file);
  if (kn && kn.diff === line) { knownSeen++; console.log('KNOWN', basename(f).padEnd(34), `${kn.deviation}: ${line}`); }
  else if (kn) { bad++; console.log('FAIL ', basename(f).padEnd(34), `recorded ${kn.deviation} difference changed: expected "${kn.diff}", got "${line || 'no difference'}"`); }
  else if (diff.length) { bad++; console.log('DIFF ', basename(f).padEnd(34), line); }
  else console.log('same ', basename(f).padEnd(34), checks.map(c => c[1]).join(' · '));
}
await browser.close();
const verdict = `${files.length} files: ${files.length - bad - knownSeen} identical, ${knownSeen} known (${[...new Set(known.filter(k => seen.has(k.file)).map(k => k.deviation))].join(', ') || 'none'}), ${bad} unexpected`;
console.log(verdict);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Parallel run${full ? ' (full corpus)' : ''}\n\n${bad ? '**FAIL**' : 'OK'}: ${verdict}\n`);
process.exit(bad ? 1 : 0);
