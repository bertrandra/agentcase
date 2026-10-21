#!/usr/bin/env node
// State / persistence / calculation regression tests, run in headless Chromium against the built file.
// Each test is a function evaluated in the page that returns {ok, detail}.
// Usage: node tools/state-test.mjs [file] [--only name]
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const arg = process.argv.slice(2).find(a => a.endsWith('.html'));
const file = resolve(arg || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort().pop());
const onlyIdx = process.argv.indexOf('--only'); const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
const browser = await pw.chromium.launch();

// Every test gets a fresh page. `t` bodies run inside the page.
const tests = {
  // H-2: restoring a snapshot must copy, not alias; and capturing must not alias live state either.
  async golden_not_aliased() {
    snapResetToGolden();
    const g = goldenSnapshot();
    const before = JSON.stringify([g.state.RATE, g.state.QUALITY, g.state.PERSONAS, g.state.teamIn]);
    RATE.France.A = 99999; QUALITY[0][1] = 4242; PERSONAS[0].label = 'EDITED'; teamIn[0].etp = 77;
    const after = JSON.stringify([g.state.RATE, g.state.QUALITY, g.state.PERSONAS, g.state.teamIn]);
    return { ok: before === after, detail: before === after ? 'golden unchanged' : 'golden state was modified by live edits' };
  },
  async capture_not_aliased() {
    const snap = snapCreate('alias-test');
    const before = JSON.stringify([snap.state.RATE, snap.state.teamIn, snap.state.TOKEN_MODELS]);
    RATE.France.B = 88888; teamIn[0].skill = 'Changed'; TOKEN_MODELS[0].name = 'Changed';
    const after = JSON.stringify([snap.state.RATE, snap.state.teamIn, snap.state.TOKEN_MODELS]);
    return { ok: before === after, detail: before === after ? 'snapshot unchanged' : 'captured snapshot followed live edits' };
  },
  async activate_not_aliased() {
    const snap = snapCreate('act-test');
    snapActivate(snap.id);
    const before = JSON.stringify(snap.state.RATE);
    RATE.France.C = 77777;
    return { ok: before === JSON.stringify(snap.state.RATE), detail: 'activate then edit' };
  },
  // H-3: S-curve control points / family must survive collect → apply (save, autosave, snapshots)
  async scurve_persisted() {
    goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve();
    SC_PTS = [{ t: 5, a: 11 }, { t: 14, a: 47 }, { t: 22, a: 80 }, { t: 33, a: 97 }];
    scSetFamily('gompertz');
    const s = collectSnapshotState({ excludeKeys: ['namedSnapshots'] });
    SC_PTS = null; scSetFamily('spline');
    applySnapshotState(s);
    const ok = Array.isArray(SC_PTS) && SC_PTS.length === 4 && SC_PTS[1].t === 14 && SC_PTS[3].a === 97 && SC_FAMILY === 'gompertz' && TIME_ACTIVE_CURVE === 'gompertz.default';
    return { ok, detail: ok ? 'points + family restored' : 'SC_PTS=' + JSON.stringify(SC_PTS) + ' family=' + SC_FAMILY + ' curve=' + TIME_ACTIVE_CURVE };
  },
  async scurve_default_roundtrip_stable() {
    const hl = () => { const x = teEngineNow().headline; return JSON.stringify(typeof x === 'function' ? x() : x); };
    const a = hl();
    const s = collectSnapshotState({ excludeKeys: ['namedSnapshots'] });
    applySnapshotState(s);
    const b = hl();
    return { ok: a === b, detail: a === b ? 'headline identical after round-trip' : a + ' vs ' + b };
  },
  async scurve_excel_roundtrip() {
    goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve();
    SC_PTS = [{ t: 5, a: 11 }, { t: 14, a: 47 }, { t: 22, a: 80 }, { t: 33, a: 97 }];
    scSetFamily('gompertz');
    let captured = null; const cu = URL.createObjectURL; URL.createObjectURL = b => { if (!captured) captured = b; return cu.call(URL, b); };
    await exportParams('all'); URL.createObjectURL = cu;
    const buf = await captured.arrayBuffer();
    SC_PTS = null; scSetFamily('spline');
    await importParams({ files: [{ name: 'rt.xlsx', arrayBuffer: async () => buf }] });
    const ok = Array.isArray(SC_PTS) && SC_PTS.length === 4 && SC_PTS[1].t === 14 && SC_FAMILY === 'gompertz';
    return { ok, detail: ok ? 'Excel round-trip keeps points + family' : 'SC_PTS=' + JSON.stringify(SC_PTS) + ' fam=' + SC_FAMILY };
  },
  // M-13 / M-14: saving a snapshot must not freeze runtime UI into the file
  async snapshot_file_clean() {
    let blob = null; const cu = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return cu.call(URL, b); };
    const optsBefore = document.getElementById('industry').options.length;
    saveHtmlSnapshot(); URL.createObjectURL = cu;
    const html = await blob.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bootReady = doc.documentElement.classList.contains('boot-ready');
    const opts = doc.getElementById('industry').options.length;
    const snapScripts = doc.querySelectorAll('script[data-agentcase-snapshot]').length;
    const ok = !bootReady && opts === 0 && snapScripts === 1 && optsBefore > 0 && optsBefore < 30;
    return { ok, detail: 'boot-ready=' + bootReady + ' industryOptionsInFile=' + opts + ' liveOptions=' + optsBefore + ' snapshotScripts=' + snapScripts };
  },
  // H-4: shrinking the horizon must never produce NaN
  async horizon_shrink_finite() {
    const setH = v => { const el = document.getElementById('horizon'); el.value = v; INPUTS.v.horizon = String(v); el.dispatchEvent(new Event('change', { bubbles: true })); };
    setH(3); goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve();
    SC_PTS = [{ t: 6, a: 30 }, { t: 24, a: 70 }, { t: 36, a: 100 }]; scCommit();
    setH(1); goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve();
    const m = model(), hh = teEngineNow().headline, h = typeof hh === 'function' ? hh() : hh;
    const vals = [...m.yearSav, ...m.yearRun, h.npv, h.roi, scSplineEval(9, SC_PTS), scSplineEval(11, SC_PTS)];
    const ok = vals.every(Number.isFinite);
    return { ok, detail: ok ? 'all finite, pts=' + JSON.stringify(SC_PTS) : 'non-finite values: ' + JSON.stringify(vals) + ' pts=' + JSON.stringify(SC_PTS) };
  },
};

// Page-level tests: receive (browser, file, helpers) and drive several pages / reloads.
const boot = async (ctx, file, init) => {
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  if (init) await page.addInitScript(init);
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  return page;
};
const pageTests = {
  // H-5: Restore must bring back the offered session, even after new edits were autosaved
  async autosave_restore_offered(browser, file) {
    const ctx = await browser.newContext(); let page = await boot(ctx, file);
    await page.evaluate(async () => { CUSTOMER_NAME = 'SessionA'; syncState('customerName'); await AUTOSAVE.save(); });
    await page.reload(); await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'));
    await page.waitForFunction(() => document.getElementById('autosaveBanner') && document.getElementById('autosaveBanner').innerText.includes('Restore'), null, { timeout: 8000 });
    await page.evaluate(async () => { CUSTOMER_NAME = 'EditB'; syncState('customerName'); await AUTOSAVE.save(); });
    await page.evaluate(() => autosaveBannerRestore()); await page.waitForTimeout(500);
    const r = await page.evaluate(async () => ({ name: CUSTOMER_NAME, list: (await AUTOSAVE.list()).map(x => x.tabId.slice(-6) + ':' + (x.label || '').slice(0, 40)) }));
    await ctx.close();
    return { ok: r.name === 'SessionA', detail: 'customer after Restore = ' + r.name + ' ; sessions = ' + JSON.stringify(r.list) };
  },
  // H-5: the banner is not shown when the autosave is not newer than the file's own state
  async autosave_banner_only_if_newer(browser, file) {
    const ctx = await browser.newContext(); const page = await boot(ctx, file);
    const saved = await page.evaluate(async () => { await AUTOSAVE.save(); return (await AUTOSAVE.peek()).savedAt; });
    const future = new Date(Date.parse(saved) + 3600e3).toISOString();
    // from now on this tab "boots" from a file whose own state is newer than the stored autosave
    await page.addInitScript(f => { window.__bootSnapshotSavedAtForTest = f; const d = Object.getOwnPropertyDescriptor; Object.defineProperty(window, '__bootSnapshotSavedAt', { configurable: true, get() { return f; }, set() { } }); }, future);
    await page.reload(); await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready')); await page.waitForTimeout(900);
    const shown = await page.evaluate(() => !!(document.getElementById('autosaveBanner') && document.getElementById('autosaveBanner').innerText.includes('Restore')));
    await ctx.close();
    return { ok: shown === false, detail: 'banner shown for an older autosave = ' + shown };
  },
  // M-13: a saved file reopened must show each industry once (and still restore the case)
  async snapshot_reopen_round_trip(browser, file) {
    const ctx = await browser.newContext(); const page = await boot(ctx, file);
    const html = await page.evaluate(async () => { CUSTOMER_NAME = 'RoundTrip Co'; syncState('customerName'); let b = null; const cu = URL.createObjectURL; URL.createObjectURL = x => { b = x; return cu.call(URL, x); }; saveHtmlSnapshot(); URL.createObjectURL = cu; return await b.text(); });
    const fs = await import('node:fs'); const tmp = '/tmp/claude-0/-home-user-agentcase/cae48424-a52a-52ee-85f5-1ec895a061a6/scratchpad/roundtrip.html'; fs.writeFileSync(tmp, html);
    const p2 = await boot(ctx, tmp); await p2.waitForTimeout(500);
    const r = await p2.evaluate(() => ({ opts: document.getElementById('industry').options.length, name: CUSTOMER_NAME, cls: document.documentElement.className, golden: !!goldenSnapshot() }));
    // second generation
    const html2 = await p2.evaluate(async () => { let b = null; const cu = URL.createObjectURL; URL.createObjectURL = x => { b = x; return cu.call(URL, x); }; saveHtmlSnapshot(); URL.createObjectURL = cu; return await b.text(); });
    fs.writeFileSync(tmp, html2); const p3 = await boot(ctx, tmp); await p3.waitForTimeout(500);
    const r3 = await p3.evaluate(() => document.getElementById('industry').options.length);
    await ctx.close();
    return { ok: r.opts === r3 && r.opts < 30 && r.name === 'RoundTrip Co', detail: JSON.stringify(r) + ' gen2 options=' + r3 };
  },
  // H-6: editing a parameter field (no state:changed event) must still trigger an autosave
  async autosave_on_param_edit(browser, file) {
    const ctx = await browser.newContext(); const page = await boot(ctx, file);
    await page.evaluate(async () => { await AUTOSAVE.remove(AUTOSAVE.tabId); });
    await page.evaluate(() => { const el = document.getElementById('autoCapPct'); el.value = '77'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(3200);
    const r = await page.evaluate(async () => { const rec = await AUTOSAVE.peek(); return rec && rec.state && rec.state.dom && rec.state.dom.values ? rec.state.dom.values.autoCapPct : null; });
    await ctx.close();
    return { ok: r === '77' || r === 77, detail: 'autoCapPct in autosave record = ' + r };
  },
  // H-7: a framed copy of the app (live preview) never touches the autosave store
  async autosave_frame_inert(browser, file) {
    const ctx = await browser.newContext(); const page = await boot(ctx, file);
    const r = await page.evaluate(async () => {
      const f = document.createElement('iframe'); document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write('<!DOCTYPE html>\n' + document.documentElement.outerHTML); f.contentDocument.close();
      await new Promise(r => setTimeout(r, 2500));
      const w = f.contentWindow;   // AUTOSAVE is a top-level const, so reach it through the frame's own eval
      const before = (await AUTOSAVE.peek()); const saved = await w.eval('AUTOSAVE.save()');
      const after = (await AUTOSAVE.peek());
      return { isFrame: w.eval('AUTOSAVE.isFrame'), enabled: w.eval('AUTOSAVE.enabled'), saved, same: JSON.stringify(before && before.savedAt) === JSON.stringify(after && after.savedAt) };
    });
    await ctx.close();
    return { ok: r.isFrame === true && r.enabled === false && r.saved === false && r.same, detail: JSON.stringify(r) };
  },
  // L-20: a duplicated tab (same sessionStorage tab id) gets its own id
  async autosave_duplicate_tab(browser, file) {
    const ctx = await browser.newContext(); const p1 = await boot(ctx, file);
    const id1 = await p1.evaluate(() => AUTOSAVE.tabId);
    const p2 = await boot(ctx, file, id => { try { sessionStorage.setItem('agentcase.tabId', id); } catch (e) { } });
    // addInitScript with arg
    await p2.close();
    const p3 = await ctx.newPage(); await p3.addInitScript(id => { try { sessionStorage.setItem('agentcase.tabId', id); } catch (e) { } }, id1);
    await p3.goto('file://' + file); await p3.waitForFunction(() => document.documentElement.classList.contains('boot-ready')); await p3.waitForTimeout(900);
    const id3 = await p3.evaluate(() => AUTOSAVE.tabId);
    await ctx.close();
    return { ok: id3 !== id1, detail: 'original ' + id1.slice(-6) + ' / duplicate ' + id3.slice(-6) };
  },
};

let failed = 0, ran = 0;
for (const [name, fn] of Object.entries(tests)) {
  if (only && name !== only) continue; ran++;
  const page = await (await browser.newContext()).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
  let r;
  try { const src = fn.toString().replace(/^(async\s+)?\w+\s*\(/, '$1function (');
    r = await page.evaluate(`(${src})()`); } catch (e) { r = { ok: false, detail: 'exception: ' + e.message }; }
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}  — ${r.detail}${errs.length ? '  [pageerrors: ' + errs.slice(0, 2).join(' | ') + ']' : ''}`);
  await page.close();
}
for (const [name, fn] of Object.entries(pageTests)) {
  if (only && name !== only) continue; ran++;
  let r; try { r = await fn(browser, file); } catch (e) { r = { ok: false, detail: 'exception: ' + e.message.split('\n')[0] }; }
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}  — ${r.detail}`);
}
await browser.close();
console.log(failed ? `\n${failed}/${ran} failed` : `\nall ${ran} passed`);
process.exit(failed ? 1 : 0);
