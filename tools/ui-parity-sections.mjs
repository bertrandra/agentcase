// Section-content parity: for every section (all 79 on golden, a sample on the other fixtures) both the frozen legacy AgentCase_v18_13_EN.html and
// the BUILT app (app/dist/index.html) are opened on the same case; for each element kind of tools/ui-parity-kinds.mjs the computed style of the
// first visible element of the kind is compared. Results are aggregated per KIND (property, legacy value, new value, sections affected).
// Standalone report:  node tools/ui-parity-sections.mjs [--fixtures golden,ctx-msi,industry-med] [--sections id,id] [--json out.json] [--shots dir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { KINDS, SPROPS } from './ui-parity-kinds.mjs';

export const SAMPLE = ['financial', 'params', 'compliance'];   // sections visited on the non-golden fixtures
export const norm = (v) => String(v ?? '').replace(/(\d+\.\d+)px/g, (_, n) => `${Math.round(Number(n) * 10) / 10}px`).replace(/ (0|100)%(?=[,)])/g, '').replace(/\s+/g, ' ').trim();

/** Runs in the page: the first visible match of every kind under `rootSel` that does not inherit an inline typography override; its computed style, or (`mark`) a data-parity attribute for Playwright. */
function extract({ rootSel, kinds, props, mark }) {
  const root = document.querySelector(rootSel), out = {};
  if (!root) return out;
  root.querySelectorAll('[data-parity]').forEach((e) => e.removeAttribute('data-parity'));
  for (const k of kinds) {
    let el = null;
    if (k.sel === ':scope') el = root;
    else for (const e of root.querySelectorAll(k.sel)) {
      const cx = e.parentElement && e.parentElement.closest('[style*="font"], [style*="color"], [style*="line-height"], [style*="text-transform"], [style*="letter-spacing"], [style*="opacity"]');   // inherits an inline typography override: the section's own decision
      if (e.offsetWidth > 0 && e.offsetHeight > 0 && getComputedStyle(e).visibility !== 'hidden' && !(cx && root.contains(cx) && cx !== root)) { el = e; break; }
    }
    if (!el) { out[k.kind] = null; continue; }
    if (mark) { el.setAttribute('data-parity', k.kind); out[k.kind] = true; continue; }
    const cs = getComputedStyle(el), o = { _text: (el.textContent || '').trim().slice(0, 28) };
    for (const p of props) o[p] = cs.getPropertyValue(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (o[`border${s}Width`] === '0px' || o[`border${s}Style`] === 'none') o[`border${s}Color`] = '-';
    out[k.kind] = o;
  }
  return out;
}
const sty = (el, props) => {
  const cs = getComputedStyle(el), o = { _text: (el.textContent || '').trim().slice(0, 28) };
  for (const p of props) o[p] = cs.getPropertyValue(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
  for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (o[`border${s}Width`] === '0px' || o[`border${s}Style`] === 'none') o[`border${s}Color`] = '-';
  return o;
};

/** Hover / focus kinds need a real pointer or focus: the picked element of the kind, measured after the action. */
async function interactive(page, rootSel, kinds, which, state) {
  const out = {}, picked = await page.evaluate(extract, { rootSel, kinds: kinds.map((k) => ({ kind: k.kind, sel: k[which] })), props: [], mark: true });
  for (const k of kinds) {
    const loc = page.locator(`${rootSel} [data-parity="${k.kind}"]`);
    if (!picked[k.kind] || !(await loc.count())) { out[k.kind] = null; continue; }
    await loc.scrollIntoViewIfNeeded();
    try {
      if (state === 'hover') { await loc.hover({ timeout: 4000 }); await page.waitForTimeout(220); } else await loc.focus({ timeout: 4000 });
      out[k.kind] = await loc.evaluate(sty, SPROPS);
    } catch { out[k.kind] = null; }   // covered or scrolled out of reach: not measurable here
    if (state === 'hover') await page.mouse.move(0, 0); else await loc.blur().catch(() => {});
  }
  return out;
}

async function measureSection(page, rootSel, which, helpSel) {
  const pick = (f) => KINDS.filter(f).map((k) => ({ kind: k.kind, sel: k[which] }));
  const res = await page.evaluate(extract, { rootSel, kinds: pick((k) => !k.state), props: SPROPS });
  Object.assign(res, await interactive(page, rootSel, KINDS.filter((k) => k.state === 'hover'), which, 'hover'));
  Object.assign(res, await interactive(page, rootSel, KINDS.filter((k) => k.state === 'focus'), which, 'focus'));
  const help = page.locator(`${rootSel} ${helpSel}`).first();
  if (await help.count()) { await help.click(); await page.mouse.move(0, 0); await page.waitForTimeout(150); Object.assign(res, await page.evaluate(extract, { rootSel, kinds: pick((k) => k.state === 'help'), props: SPROPS })); }
  return res;
}

async function openLegacy(browser, root, state) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('file://' + resolve(root, 'AgentCase_v18_13_EN.html')); await page.waitForSelector('#scenarioBar'); await page.waitForTimeout(2500);
  await page.evaluate((s) => { window.setPersona('advanced'); state_ = s; applySnapshotState(Object.assign({}, s, { currentPersona: 'advanced' }), { background: true }); readInputs(); refreshAll(); }, state);
  return page;
}
async function openCurrent(browser, root, fx) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  await page.goto('file://' + resolve(root, 'app/dist/index.html')); await page.waitForSelector('.ac-shell');
  await page.setInputFiles('input[type=file]', { name: fx + '.json', mimeType: 'application/json', buffer: readFileSync(resolve(root, `app/fixtures/cases/${fx}.json`)) });
  await page.selectOption('select[aria-label=Persona]', 'advanced'); await page.waitForTimeout(300);
  const toggle = page.locator('button[aria-label="Toggle the sidebar menu"]');
  if ((await toggle.getAttribute('aria-pressed')) === 'false') await toggle.click();
  return page;
}
async function gotoCurrent(page, id) {
  const btn = page.locator(`nav[aria-label=Sections] button[data-section="${id}"]`).first();
  if (!(await btn.isVisible())) await btn.locator('xpath=ancestor::section').locator('.ac-nav-toggle').click();
  await btn.click(); await page.waitForTimeout(260);
  await page.mouse.move(0, 0);
}

/** The toast: legacy sbToast() versus the app's own status toast, right after a case was opened. */
async function toastKind(lp, np) {
  const live = np.locator('.ac-live:not(:empty)'), n = (await live.count()) ? await live.first().evaluate(sty, SPROPS) : null;
  await lp.evaluate(() => sbToast('Case opened', '#0058AB')); await lp.waitForTimeout(260);
  const l = await lp.locator('#advToast').evaluate(sty, SPROPS);
  return { toast: { l, n } };
}

/** Returns { cells: Map kind -> Map "prop|l|n" -> {kind, prop, l, n, sections:[fixture/id]} , compared, unpaired: Map kind -> count }. */
export async function compareSections(browser, root, { fixtures = ['golden', 'ctx-msi', 'industry-med'], only = [], shots = '' } = {}) {
  // the multi-product Portefeuille group has no legacy counterpart and is not in the single-product nav
  const catalog = JSON.parse(readFileSync(resolve(root, 'app/src/ui/zones/data/sectionCatalog.json'), 'utf8')).filter((s) => s.group !== 'portfolio'), cells = new Map(), unpaired = new Map(), seen = new Map();
  let compared = 0; const cross = [];
  if (shots) mkdirSync(shots, { recursive: true });
  const first = new Map(), paired = new Map();   // first element of each kind per side (fallback for kinds that never co-occur in one section)
  const diff = (label, kind, l, n, skip = []) => {
    for (const prop of SPROPS) {
      if (skip.includes(prop)) continue;
      compared++;
      const [lv, nv] = [norm(l[prop]), norm(n[prop])];
      if (lv === nv) continue;
      const key = `${kind}|${prop}|${lv}|${nv}`, c = cells.get(key) ?? { kind, prop, l: lv, n: nv, sections: [], text: `${l._text} / ${n._text}` };
      c.sections.push(label); cells.set(key, c);
    }
  };
  const add = (fx, id, kind, l, n, skip = []) => {
    seen.set(kind, (seen.get(kind) ?? 0) + 1);
    const f = first.get(kind) ?? {}; if (l && !f.l) f.l = { v: l, id }; if (n && !f.n) f.n = { v: n, id }; first.set(kind, f);
    if (!l || !n) { unpaired.set(kind, (unpaired.get(kind) ?? 0) + 1); return; }
    paired.set(kind, (paired.get(kind) ?? 0) + 1);
    diff(`${fx}/${id}`, kind, l, n, skip);
  };
  for (const fx of fixtures) {
    const state = JSON.parse(readFileSync(resolve(root, `app/fixtures/cases/${fx}.json`), 'utf8'));
    const [lp, np] = [await openLegacy(browser, root, state), await openCurrent(browser, root, fx)];
    if (fx === 'golden') { const t = await toastKind(lp, np); add(fx, '(shell)', 'toast', t.toast.l, t.toast.n); }   // the app's toast is still up from opening the case
    const ids = (only.length ? only : fx === 'golden' ? catalog.map((s) => s.id) : SAMPLE).filter((id) => catalog.some((s) => s.id === id));
    for (const id of ids) {
      await lp.evaluate(async (i) => { goTab(i); await new Promise((r) => setTimeout(r, 120)); }, id); await lp.waitForTimeout(250);
      await gotoCurrent(np, id);
      if (shots && (fx === 'golden' && SAMPLE.includes(id))) for (const [t, pg] of [['legacy', lp], ['new', np]]) await pg.screenshot({ path: resolve(shots, `${t}-${id}.png`) });
      const [l, n] = [await measureSection(lp, `#${id}`, 'legacy', '.sec-help-btn'), await measureSection(np, '.ac-section', 'current', '.ac-help-btn')];
      for (const k of KINDS) if (k.state !== 'global') add(fx, id, k.kind, l[k.kind], n[k.kind], k.skip);
    }
    await lp.close(); await np.close();
  }
  for (const k of KINDS) {   // a kind that never occurs on both sides in one section: compare its first legacy element with its first new one
    const f = first.get(k.kind);
    if (!paired.get(k.kind) && f?.l && f?.n) { cross.push(k.kind); diff(`${f.l.id}~${f.n.id}`, k.kind, f.l.v, f.n.v, k.skip); }
  }
  return { cells, compared, unpaired, seen, cross };
}

/** One row per (kind, prop, legacy, new) with the sections affected, sorted by kind order then section count. */
export const rowsOf = (cells) => [...cells.values()].sort((a, b) => KINDS.findIndex((k) => k.kind === a.kind) - KINDS.findIndex((k) => k.kind === b.kind) || b.sections.length - a.sections.length);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import('node:module'), { existsSync } = await import('node:fs');
  const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '').split(',').filter(Boolean);
  const root = resolve(opt('--root')[0] ?? resolve(import.meta.dirname, '..')), pw = createRequire(import.meta.url)(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve(root, 'app/node_modules/playwright')));
  const browser = await pw.chromium.launch();
  const res = await compareSections(browser, root, { fixtures: opt('--fixtures').length ? opt('--fixtures') : undefined, only: opt('--sections'), shots: opt('--shots')[0] ?? '' });
  await browser.close();
  const rows = rowsOf(res.cells);
  if (opt('--json')[0]) writeFileSync(opt('--json')[0], JSON.stringify({ compared: res.compared, rows, unpaired: Object.fromEntries(res.unpaired), seen: Object.fromEntries(res.seen), cross: res.cross }, null, 1));
  const cut = (s, k) => (s.length > k ? s.slice(0, k - 1) + '…' : s);
  for (const r of rows) console.log(`${r.kind.padEnd(20)} ${r.prop.padEnd(22)} ${String(r.sections.length).padStart(3)} | legacy=${cut(r.l, 48)} | new=${cut(r.n, 48)}`);
  console.log(`${res.compared} properties compared; ${rows.length} distinct divergences`);
}
