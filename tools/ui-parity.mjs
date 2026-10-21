#!/usr/bin/env node
// UI parity of the 3 shell areas (title/header bar, KPI/scenario bar, left sidebar) against the frozen legacy AgentCase_v18_13_EN.html.
// Opens the legacy file and the BUILT app (app/dist/index.html) in Chromium, loads the golden case, and compares getComputedStyle of every
// matching element pair (plus hover / active states) for each persona. Fails on any divergence that is not a recorded exception in
// app/ui-parity-exceptions.json (each exception pins the NEW value, so drift inside an exception fails too).
// Usage: node tools/ui-parity.mjs [--personas builder,admin] [--shots <dir>] [--all]   (--all also lists the excepted rows)
import { createRequire } from 'node:module';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, PROPS } from './ui-parity-areas.mjs';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..'), app = resolve(root, 'app');
const pw = createRequire(import.meta.url)(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve(app, 'node_modules/playwright')));
const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '');
const personas = (opt('--personas') || 'builder,admin,clientcase').split(',');
const shots = opt('--shots'), showAll = args.includes('--all');
const exceptions = JSON.parse(readFileSync(resolve(app, 'ui-parity-exceptions.json'), 'utf8')).exceptions;
if (shots) mkdirSync(shots, { recursive: true });

/** Computed style + box of the first VISIBLE match of `sel` (after an optional hover), or null. */
async function measure(page, sel, state) {
  const loc = page.locator(sel).first();
  if (!(await loc.count()) || !(await loc.isVisible())) return null;
  if (state === 'hover') { await loc.scrollIntoViewIfNeeded(); await loc.hover(); await page.waitForTimeout(320); }
  const out = await loc.evaluate((el, props) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (o['border' + side + 'Width'] === '0px' || o['border' + side + 'Style'] === 'none') o['border' + side + 'Color'] = '-';   // colour of an absent border is noise
    o.boxW = Math.round(r.width * 10) / 10; o.boxH = Math.round(r.height * 10) / 10;
    return o;
  }, PROPS);
  if (state === 'hover') await page.mouse.move(0, 0);
  return out;
}
const norm = (v) => String(v ?? '').replace(/(\d+\.\d+)px/g, (_, n) => `${Math.round(Number(n) * 10) / 10}px`).replace(/ (0|100)%(?=[,)])/g, '').replace(/\s+/g, ' ').trim();   // the minifier drops the default 0% / 100% gradient stops

async function legacy(browser, persona) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('file://' + resolve(root, 'AgentCase_v18_13_EN.html')); await page.waitForSelector('#scenarioBar'); await page.waitForTimeout(2500);
  await page.evaluate((p) => {
    window.setPersona(p);
    if (document.body.classList.contains('menu-hidden')) window.toggleMenuHidden();
    document.querySelectorAll('.side-group').forEach((g) => g.classList.remove('collapsed'));
  }, persona);
  await page.waitForTimeout(500);
  return page;
}
async function current(browser, persona) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('file://' + resolve(app, 'dist/index.html')); await page.waitForSelector('.ac-shell');
  await page.setInputFiles('input[type=file]', { name: 'golden.json', mimeType: 'application/json', buffer: readFileSync(resolve(app, 'fixtures/cases/golden.json')) });
  await page.selectOption('select[aria-label=Persona]', persona); await page.waitForTimeout(400);
  const toggle = page.locator('button[aria-label="Toggle the sidebar menu"]');
  if ((await toggle.getAttribute('aria-pressed')) === 'false') await toggle.click();
  for (const h of await page.locator('nav[aria-label=Sections] [aria-expanded=false]').all()) await h.click();   // expand collapsible groups
  await page.mouse.move(0, 0); await page.waitForTimeout(400);
  return page;
}

const browser = await pw.chromium.launch();
const rows = []; let unexpected = 0, excepted = 0, compared = 0;
for (const persona of personas) {
  const [lp, np] = [await legacy(browser, persona), await current(browser, persona)];
  if (shots) for (const [n, pg] of [['legacy', lp], ['new', np]]) await pg.screenshot({ path: resolve(shots, `${persona}-${n}.png`) });
  for (const a of AREAS) {
    const [l, n] = [await measure(lp, a.legacy, a.state), await measure(np, a.current, a.state)];
    if (!l || !n) { if (!(a.optional || (persona === 'clientcase' && a.scope === 'sidebar'))) { rows.push({ persona, area: a.name, prop: '(element)', l: l ? 'present' : 'missing', n: n ? 'present' : 'missing', status: 'FAIL' }); unexpected++; } continue; }
    for (const prop of a.props ?? PROPS.concat(['boxW', 'boxH']).filter((p) => !(a.skip ?? []).includes(p))) {
      compared++;
      const [lv, nv] = [norm(l[prop]), norm(n[prop])];
      if (lv === nv) continue;
      const ex = exceptions.find((e) => e.area === a.name && e.prop === prop && (!e.persona || e.persona === persona));
      if (ex && norm(ex.expected) === nv) { excepted++; if (showAll) rows.push({ persona, area: a.name, prop, l: lv, n: nv, status: 'EXCEPTED' }); continue; }
      unexpected++; rows.push({ persona, area: a.name, prop, l: lv, n: nv, status: ex ? 'FAIL (exception drifted)' : 'FAIL' });
    }
  }
  await lp.close(); await np.close();
}
await browser.close();
const cut = (s, k) => (s.length > k ? s.slice(0, k - 1) + '…' : s);
for (const r of rows) console.log(`${r.status.padEnd(8)} ${r.persona.padEnd(10)} ${r.area.padEnd(22)} ${r.prop.padEnd(18)} legacy=${cut(r.l, 60)} | new=${cut(r.n, 60)}`);
console.log(`${compared} properties compared over ${personas.length} persona(s): ${unexpected} divergence(s), ${excepted} recorded exception(s)`);
process.exit(unexpected ? 1 : 0);
