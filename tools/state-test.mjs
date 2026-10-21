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
  // M-1: the P4 stochastic NPV must discount at the case rate (as the headline does), and 0 % must stay 0 %
  async p4_npv_uses_case_rate() {
    const base = () => ({ y1Ramp: P('y1Ramp'), y2Ramp: P('y2Ramp'), y3Ramp: P('y3Ramp'), dayRate: mcsBaseValue('dayRate'), tokenPrice: mcsBaseValue('tokenPrice'), supCapacity: mcsBaseValue('supCapacity'), p: mcsBaseValue('p') });
    MODEL.FLOW.discountRate = 0.08; MODEL.CASE.discountRate = 0.12; refreshAll();
    const a = mcsEvaluate(base()).npv, head = npvCanonical();
    MODEL.CASE.discountRate = 0; refreshAll();
    const z = mcsEvaluate(base()).npv, headZ = npvCanonical();
    const close = (x, y) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
    return { ok: close(a, head) && close(z, headZ), detail: 'case 12%: P4 ' + a.toFixed(0) + ' vs headline ' + head.toFixed(0) + ' ; case 0%: P4 ' + z.toFixed(0) + ' vs headline ' + headZ.toFixed(0) };
  },
  async p5_zero_discount_kept() {
    MODEL.FLOW.marginPerMonth = 1000; MODEL.FLOW.throughputInShare = 100; MODEL.FLOW.discountRate = 0; refreshAll();
    const v = flowValue();
    return { ok: v.discountRate === 0, detail: 'P5 discount rate used = ' + v.discountRate };
  },
  // H-8: P2 population = the in-scope population model() sums (regulatory artefacts counted once)
  async p2_scope_not_double_counted() {
    document.getElementById('industry').value = 'AERO'; document.getElementById('industry').dispatchEvent(new Event('change', { bubbles: true }));
    regInclude = true; selectedRegArtefacts = new Set(REG_CATALOG.artifacts.filter(a => a.norm && /AERO|DO-178|ARP/i.test(a.industry || a.norm || '')).slice(0, 12).map(a => a.id));
    if (!selectedRegArtefacts.size) selectedRegArtefacts = new Set(REG_CATALOG.artifacts.slice(0, 12).map(a => a.id));
    refreshAll();
    const a = activeArtefacts().length, e = evtScopeArtefacts().length, w = phaseScope().count;
    return { ok: a === e && a > 0, detail: 'activeArtefacts=' + a + ' evtScopeArtefacts=' + e + ' (reg selected ' + selectedRegArtefacts.size + ')' };
  },
  // M-2 / M-3: with no setup cost nothing may print Infinity / NaN, and month-0 payback is "immediate"
  async roi_payback_labels() {
    ['setupTooling', 'setupTraining', 'setupCoaching', 'setupGov', 'khSetupBase', 'khSetupDays'].forEach(id => { const el = document.getElementById(id); if (el) { el.value = '0'; INPUTS.v[id] = '0'; } });
    document.getElementById('setupETPCoef').value = '0'; INPUTS.v.setupETPCoef = '0';
    refreshAll();
    const bad = []; const m = model();
    const BADRX = /Infinity%|NaN%|NaN mo|Infinity mo|€\s*NaN|NaN\s*€|NaN\s*k\b|-Infinity|\bInfinity\b/;
    const scan = id => { goTab(id); if (TABRENDER[id]) TABRENDER[id](); const el = document.getElementById(id); const txt = el ? el.innerText : ''; const mm = txt.match(new RegExp('.{0,30}(' + BADRX.source + ').{0,20}')); if (mm) bad.push(id + ': ' + mm[0].replace(/\s+/g, ' ')); };
    ['financial', 'annual', 'results', 'sensitivity', 'scenarios', 'verif', 'monthly', 'kpi', 'exec'].forEach(scan);
    const labels = [fmtPayback(0, 36), fmtPayback(null, 60), fmtPayback(7, 36), fmtRoiPct(null), fmtRoiPct(roiCanonical(5, 0)), fmtRoiPct(roiCanonical(50, 100))];
    const ok = bad.length === 0 && labels.join('|') === 'immediate|>60 mo|7 mo|n/a|n/a|50%';
    return { ok, detail: 'setupTotal=' + Math.round(m.setupTotal) + ' bad=' + JSON.stringify(bad) + ' labels=' + labels.join('|') };
  },
  // M-4: applying a strategy twice must not compound, and the comparison row must match the live case
  async strategy_apply_idempotent() {
    const S = STRATEGY_DEFS.find(s => s.levers && s.levers.setupF > 0 && s.levers.setupF < 1);
    if (!S) return { ok: false, detail: 'no strategy with a setup factor' };
    const ids = ['setupTooling', 'setupGov', 'setupTraining', 'setupCoaching', 'infra'];
    const val = () => ids.map(i => document.getElementById(i).value).join(',');
    const orig = val();
    applyStrategy(S.id); const once = val(); const setup1 = model().setupTotal;
    applyStrategy(S.id); const twice = val();
    const row = evaluateStrategies().find(r => r.id === S.id);
    const rowMatchesLive = Math.abs(row.computed.setup - model().setupTotal) < 1;
    // factor-1 strategy restores the base
    const T = STRATEGY_DEFS.find(s => !s.levers || s.levers.setupF == null || s.levers.setupF === 1);
    applyStrategy(T.id); const restored = val();
    const ok = once === twice && rowMatchesLive && restored === orig && once !== orig;
    return { ok, detail: 'orig=' + orig + ' once=' + once + ' twice=' + twice + ' rowMatchesLive=' + rowMatchesLive + ' afterFactor1=' + restored };
  },
  // M-8: a failure inside a what-if run must not leave the live inputs / location mix perturbed
  async whatif_restores_on_error() {
    readInputs(); const snapV = JSON.stringify(INPUTS.v), snapT = JSON.stringify(targetLocPct);
    const realOutcome = mcOutcome; let calls = 0; window.mcOutcome = function () { if (++calls === 6) throw new Error('boom'); return realOutcome.apply(this, arguments); };
    let threw1 = false; try { runMonteCarlo(50); } catch (e) { threw1 = true; }
    window.mcOutcome = realOutcome;
    const afterMc = JSON.stringify(INPUTS.v) === snapV;
    const realModel = model; let c2 = 0; window.model = function () { if (++c2 === 3) throw new Error('boom2'); return realModel.apply(this, arguments); };
    let threw2 = false; try { evaluateStrategies(); } catch (e) { threw2 = true; }
    window.model = realModel;
    const afterStrat = JSON.stringify(INPUTS.v) === snapV && JSON.stringify(targetLocPct) === snapT;
    return { ok: threw1 && threw2 && afterMc && afterStrat, detail: 'threw=' + threw1 + '/' + threw2 + ' inputsRestoredAfterMC=' + afterMc + ' afterStrategies=' + afterStrat };
  },
  // M-9: rendering Results must not change the TO-BE year the user picked
  async results_keeps_tobe_year() {
    setTobeYear(0); const before = tobeYear; renderResults();
    return { ok: tobeYear === before && before === 0, detail: 'tobeYear before=' + before + ' after Results render=' + tobeYear };
  },
  // M-10: with a clamped loop, P1 must not rebuild (and zero) the user's t_rev on every call
  async p1_calibration_keeps_edits() {
    MODEL.LCE.nMax = 3; MODEL.LCE.loops = []; MODEL.LCE.calibrated = false; MODEL.LCE.built = false;
    lceModel();
    const clamped = MODEL.LCE.loops.filter(l => l.clamped).length;
    mcvSetTRev(0, '2'); lceModel(); lceIterFor(LOOP_PAIRS[0], 0);
    const t0 = MODEL.LCE.loops[0].tRev;
    return { ok: clamped > 0 && t0 === 2, detail: 'clamped loops=' + clamped + ' tRev after re-evaluation=' + t0 };
  },
  // M-16: the due-diligence sensitivity freshness check must notice a same-length edit
  async dd_fingerprint_content() {
    readInputs(); const a = ddFingerprint(); const old = INPUTS.v.autoPotential;
    INPUTS.v.autoPotential = old === '75' ? '80' : '75';           // same length, different content
    const b = ddFingerprint(); INPUTS.v.autoPotential = old;
    return { ok: a !== b, detail: 'fingerprint ' + a + ' → ' + b + ' after autoPotential ' + old + ' → ' + (old === '75' ? '80' : '75') };
  },
  // M-7: the MC fingerprint is cheap, stable across calls, ignores navigation/snapshot-library state and reacts to model inputs
  async mc_fingerprint_stable_and_cheap() {
    runMonteCarlo(200);
    const f1 = mcFingerprint(), f2 = mcFingerprint();
    snapCreate('fp-test'); const f3 = mcFingerprint();            // capturing a snapshot is not a scenario change
    const t0 = performance.now(); for (let i = 0; i < 20; i++) mcFingerprint(); const ms = (performance.now() - t0) / 20;
    const el = document.getElementById('y1Ramp'); const old = el.value; el.value = String(+old + 1); readInputs(); const f4 = mcFingerprint(); el.value = old; readInputs();
    return { ok: f1 === f2 && f2 === f3 && f4 !== f1 && ms < 25, detail: 'stable=' + (f1 === f2) + ' snapshotNeutral=' + (f2 === f3) + ' reacts=' + (f4 !== f1) + ' ms/call=' + ms.toFixed(1) };
  },
  // M-15: the directional-sensitivity self-check must be able to fail
  async verif_sensitivity_can_fail() {
    goTab('verif'); renderVerif(); const txt = () => document.querySelector('#verifSensi tbody').innerText;
    const healthy = txt();
    const real = model; window.model = function () { const mm = real.apply(this, arguments); return Object.assign({}, mm); };   // still healthy
    renderVerif(); const stillHealthy = txt();
    // a "broken" model that ignores its inputs (constant): both variants equal the base
    const base = real(); window.model = function () { return base; };
    renderVerif(); const broken = txt(); window.model = real;
    const cnt = (x, rx) => (x.match(rx) || []).length;
    const ok = cnt(healthy, /consistent/gi) === 2 && cnt(stillHealthy, /consistent/gi) === 2 && /abnormal/i.test(broken) && !/consistent/i.test(broken);
    return { ok, detail: 'healthy=' + cnt(healthy, /consistent/gi) + '/2 consistent ; constant model → ' + broken.replace(/\s+/g, ' ').slice(-60) };
  },
  // M-17: an overlay failure must be reported (flag + AUDIT check), not swallowed
  async model_overlay_error_reported() {
    const okBefore = AgentCaseArch.AUDIT.runChecks().length;
    const realFor = TIME.for; TIME.for = function () { throw new Error('engine down'); };
    const m = model(); const flagged = m._overlayError; const viol = AgentCaseArch.AUDIT.runChecks().map(v => v.id || v.check || JSON.stringify(v)).join(',');
    TIME.for = realFor;
    const after = AgentCaseArch.AUDIT.runChecks().length;
    return { ok: okBefore === 0 && /engine down/.test(flagged || '') && /CC-OV-01/.test(viol) && after === 0, detail: 'flag=' + flagged + ' violations while broken=' + viol + ' after repair=' + after };
  },
  // M-5 / M-6: redrawing the Snapshot manager must not move the user and must not recompute on every redraw
  async snapshot_manager_redraw_quiet() {
    setPersona('admin'); goTab('io'); await new Promise(r => setTimeout(r, 120));
    const s = collectSnapshotState({ excludeKeys: ['namedSnapshots'] }); MODEL.FLAGS.lce = true; snapCreateAmeRef(); MODEL.FLAGS.lce = false;
    let calls = 0; const real = applySnapshotState; window.applySnapshotState = function () { calls++; return real.apply(this, arguments); };
    renderSnapshotManager(); const first = calls; const p1 = currentPersona, t1 = document.querySelector('.tab-content.active').id;
    renderSnapshotManager(); renderSnapshotManager(); const total = calls;
    window.applySnapshotState = real;
    return { ok: p1 === 'admin' && t1 === 'io' && first <= 3 && total === first, detail: 'persona=' + p1 + ' tab=' + t1 + ' restores on 1st redraw=' + first + ' after 3 redraws=' + total };
  },
  // L-13: an imported "__proto__" location must not write onto Object.prototype; a rate of 0 is a rate
  async import_proto_and_zero_rate() {
    const wb = new ExcelJS.Workbook();
    const w1 = wb.addWorksheet('Rate Card'); w1.addRow(['Band', '__proto__', 'France']); w1.addRow(['A', 111, 0]);
    const w2 = wb.addWorksheet('Input Team'); w2.addRow(['Skill', 'Grade', 'Location', 'FTE']); w2.addRow(['Dev', 'B2', '__proto__', 2]);
    const w3 = wb.addWorksheet('Location Target'); w3.addRow(['Location', 'AS-IS', 'Target %']); w3.addRow(['__proto__', 0, 50]);
    const buf = await wb.xlsx.writeBuffer();
    await importParams({ files: [{ name: 'p.xlsx', arrayBuffer: async () => buf }] });
    const polluted = ({}).A !== undefined || Object.prototype.hasOwnProperty.call(Object.prototype, 'A');
    const zero = rateFor('France', 'A1');
    return { ok: !polluted && zero === 0, detail: 'Object.prototype polluted=' + polluted + ' rateFor(France, A1)=' + zero };
  },
  // L-10 / L-11: an empty team and all-zero ramps must not produce NaN / Infinity anywhere
  async degenerate_inputs_finite() {
    teamIn.length = 0; ['y1Ramp', 'y2Ramp', 'y3Ramp'].forEach(id => { const el = document.getElementById(id); el.value = '0'; INPUTS.v[id] = '0'; }); refreshAll();
    const bad = []; const BADRX = /Infinity%|NaN%|NaN mo|Infinity mo|€\s*NaN|NaN\s*€|NaN\s*k\b|-Infinity|\bInfinity\b|\bNaN\b/;
    for (const id of ['team-in', 'ratecard', 'loc-strat', 'kpi', 'annual', 'financial', 'results', 'monthly', 'fte-vfte', 'tobe-team', 'run']) {
      try { goTab(id); if (TABRENDER[id]) TABRENDER[id](); } catch (e) { bad.push(id + ' threw ' + e.message); continue; }
      const txt = document.getElementById(id) ? document.getElementById(id).innerText : ''; const mm = txt.match(new RegExp('.{0,30}(' + BADRX.source + ').{0,20}')); if (mm) bad.push(id + ': ' + mm[0].replace(/\s+/g, ' '));
    }
    return { ok: bad.length === 0, detail: bad.length ? JSON.stringify(bad.slice(0, 6)) : 'no NaN/Infinity on 11 sections' };
  },
  async kpi_signs() {
    const lbl = [fmtChg(65, 100), fmtChg(112, 100), fmtChg(100, 100), fmtChg(5, 0), fmtChg(NaN, 10)].join('|');
    return { ok: lbl === '-35%|+12%|0%|—|—', detail: lbl };
  },
  // L-15: the HRI floor and slope are different coefficients and must get different sensitivity weights
  async dd_sensitivity_distinct_coefficients() {
    goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve(); scSetFamily('logistic');   // the readiness drag only acts on curves fitted to the ramp anchors
    const el = document.getElementById('hriEnabled');
    if (!el) return { ok: false, detail: 'no HRI toggle found' };
    el.checked = true; INPUTS.c = INPUTS.c || {}; INPUTS.c[el.id] = true; el.dispatchEvent(new Event('change', { bubbles: true })); readInputs();
    const before = JSON.stringify(COEF);
    ddComputeSensitivity();
    const f = DD_SENS.w['cf-hri-floor'], s = DD_SENS.w['cf-hri-slope'];
    const unm = DD_SENS.unmeasurable.filter(x => /supshare/.test(x));
    return { ok: before === JSON.stringify(COEF) && f > 0 && s > 0 && Math.abs(f - s) > 1 && unm.length === 0, detail: 'floor=' + (f || 0).toFixed(0) + ' slope=' + (s || 0).toFixed(0) + ' supshare unmeasurable=' + unm.length + ' COEF restored=' + (before === JSON.stringify(COEF)) };
  },
  // navigation still works after removing the boot-time listener on discarded sidebar buttons
  async sidebar_click_navigates() {
    setPersona('advanced'); const btns = [...document.querySelectorAll('#sidebarNav button[data-tab]')];
    const target = btns.find(b => b.dataset.tab === 'ratecard') || btns[3];
    target.click(); await new Promise(r => setTimeout(r, 150));
    const active = document.querySelector('.tab-content.active').id;
    return { ok: active === target.dataset.tab, detail: 'clicked ' + target.dataset.tab + ' → active ' + active };
  },
  // L-27: the AUDIT log must not retain full copies of large state
  async audit_log_bounded() {
    AgentCaseArch.AUDIT.clear(); snapCreate('audit-size-test'); snapCreate('audit-size-test-2');
    const bytes = JSON.stringify(AgentCaseArch.AUDIT.log()).length;
    return { ok: bytes < 60000, detail: 'audit log after two snapshot captures = ' + bytes + ' bytes' };
  },
  // L-27: form controls need an accessible name; click-only elements must be keyboard-reachable
  async a11y_labels_and_roles() {
    setPersona('advanced');
    for (const s of SECTION_CATALOG) { try { goTab(s.id); if (TABRENDER[s.id]) TABRENDER[s.id](); } catch (e) { } }
    await new Promise(r => setTimeout(r, 1300));   // the pass is throttled to 250 ms; animations keep mutating the DOM
    const unnamed = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')].filter(c =>
      !c.closest('label') && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby') && !c.getAttribute('title') && !(c.id && document.querySelector('label[for="' + c.id + '"]')));
    const total = document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea').length;
    const clickOnly = [...document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(summary)')].filter(e => !e.getAttribute('role') || !e.hasAttribute('tabindex'));
    return { ok: unnamed.length <= total * 0.02 && clickOnly.length === 0, detail: 'controls without a name: ' + unnamed.length + '/' + total + ' (' + unnamed.slice(0, 4).map(c => c.id || c.tagName).join(',') + ') ; click-only elements without role/tabindex: ' + clickOnly.length };
  },
  // v18.10: the readiness drag and the engagement ramp speed / cap act on the default spline curve too
  async hri_and_engagement_apply_to_spline() {
    const sav = () => { refreshAll(); return teEndYearRow().savings; };
    const base = sav(); const el = document.getElementById('hriEnabled');
    el.checked = true; INPUTS.c.hriEnabled = true; el.dispatchEvent(new Event('change', { bubbles: true })); readInputs();
    const withHri = sav(); const rf = hriRampFactor();
    COEF.hriFloor = 0.3; const harsher = sav(); COEF.hriFloor = 0.6;
    el.checked = false; INPUTS.c.hriEnabled = false; readInputs();
    const back = sav();
    return { ok: TIME_ACTIVE_CURVE === 'spline.default' && rf < 1 && withHri < base - 1 && harsher < withHri - 1 && Math.abs(back - base) < 1e-6,
      detail: 'spline: off ' + base.toFixed(0) + ' -> HRI on (x' + rf.toFixed(2) + ') ' + withHri.toFixed(0) + ' -> harsher floor ' + harsher.toFixed(0) + ' ; HRI off again ' + back.toFixed(0) };
  },
  async engagement_context_moves_spline() {
    const sel = document.getElementById('engagementCtx'); const sav = v => { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); readInputs(); refreshAll(); return teEndYearRow().savings; };
    const msc = sav('MSC'), msi = sav('MSI'), sta = sav('STA'); sav('MSC');
    return { ok: TIME_ACTIVE_CURVE === 'spline.default' && msi < msc - 1 && sta < msi - 1, detail: 'MSC ' + msc.toFixed(0) + ' > MSI ' + msi.toFixed(0) + ' > STA ' + sta.toFixed(0) };
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
  // L-12: month labels must not shift west of UTC
  async dates_local_new_york(browser, file) {
    const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US' }); const page = await boot(ctx, file);
    const r = await page.evaluate(() => { goTab('scurve'); if (TABRENDER.scurve) TABRENDER.scurve(); const el = document.getElementById('scurveMaturityHost') || document.getElementById('scurve'); const txt = el ? el.innerText : ''; return { start: V('rmStart'), has: /Sep\s*(20)?26/.test(txt), early: /Aug\s*(20)?26/.test(txt), sample: (txt.match(/(Aug|Sep|Oct)[ a-z]*26/i) || [''])[0] }; });
    await ctx.close();
    return { ok: r.has && !r.early, detail: JSON.stringify(r) };
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
