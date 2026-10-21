// Extras for the scope tools group. Each function is serialised and evaluated inside the LEGACY page after the fixture state is loaded,
// so everything it calls (scFit, scEval, scEnsurePts, afStages, renderQuickPhases…) is the legacy implementation.
const run = (fn) => `(${fn.toString()})()`;

/** S-curve editor maths on fixed point sets and every family: curve samples, sampled ramps, add/remove point, drag clamping, ensure. */
function scurveMath() {
  const copy = (p) => p.map((x) => ({ t: x.t, a: x.a }));
  const sets = [
    [{ t: 12, a: 25 }, { t: 24, a: 55 }, { t: 36, a: 100 }],
    [{ t: 6, a: 10 }, { t: 12, a: 35 }, { t: 24, a: 70 }, { t: 36, a: 95 }],
    [{ t: 3, a: 2 }, { t: 9, a: 20 }, { t: 15, a: 30 }, { t: 30, a: 80 }, { t: 36, a: 97 }],
    [{ t: 12, a: 8 }, { t: 24, a: 12 }, { t: 36, a: 20 }],
    [{ t: 12, a: 60 }, { t: 24, a: 90 }, { t: 36, a: 99 }],
  ];
  const saved = { pts: SC_PTS, fam: SC_FAMILY, fit: SC_FIT, geo: SC_GEO, rf: refreshAll, ptd: scPtToData, drag: _scDrag,
    ramps: scRampIds().map((id) => [document.getElementById(id).value, INPUTS.v[id]]) };
  const anchors = scRampIds().map((id) => P(id));
  const N = teEngineNow().horizonMonths;
  renderScurveMaturity();                                   // sets SC_GEO for the current horizon
  const geo = SC_GEO;
  refreshAll = function () {};
  const out = [];
  try {
    ['spline', 'logistic', 'gompertz', 'bass'].forEach((fam) => sets.forEach((pts) => {
      SC_FAMILY = fam; SC_PTS = copy(pts); SC_FIT = null; scFitNow();
      const r = { fam, pts: copy(pts), eval: [1, 2, 3, 6, 9, 12, 18, 24, 30, 36, 48, 60].map((t) => scEval(t)) };
      r.ramps = [scSetRamp(0, scEval(12)), scSetRamp(1, scEval(24)), scSetRamp(2, scEval(36))];
      SC_GEO = geo; scAddPoint(); r.add = { pts: copy(SC_PTS), ramps: scRampIds().map((id) => P(id)) };
      SC_PTS = copy(pts); scRemovePoint(); r.remove = { pts: copy(SC_PTS), ramps: scRampIds().map((id) => P(id)) };
      if (fam === 'spline' || fam === 'logistic') {
        scPtToData = function (e) { return { x: e.x, y: e.y }; };
        r.drag = [];
        [[0, 1, 5], [1, 20, 50], [1, 50, 120], [pts.length - 1, 99, 100], [pts.length - 1, 3, -10], [0, 8, 40]].forEach(([i, t, a]) => {
          SC_PTS = copy(pts); _scDrag = i; scDragMove({ preventDefault() {}, x: geo.sx(t), y: geo.sy(a) });
          r.drag.push({ i, t, a, pts: copy(SC_PTS) });
        });
        _scDrag = null;
      }
      out.push(r);
    }));
    scRampIds().forEach((id, i) => { document.getElementById(id).value = saved.ramps[i][0]; INPUTS.v[id] = saved.ramps[i][1]; });   // seeds read the case's own anchors
    const ensure = [];
    [12, 24, 36, 60].forEach((n) => {
      [null, [{ t: 1, a: 5 }, { t: 2, a: 10 }], [{ t: 30, a: 20 }, { t: 40, a: 50 }, { t: 50, a: 80 }], [{ t: 36, a: 100 }, { t: 36, a: 100 }, { t: 36, a: 100 }, { t: 36, a: 100 }], [{ t: 12, a: 25 }, { t: 24, a: 55 }, { t: 36, a: 100 }]]
        .forEach((pts) => { SC_PTS = pts && copy(pts); scEnsurePts(n); ensure.push({ n, in: pts, out: copy(SC_PTS) }); });
    });
    return { N, anchors, out, ensure };
  } finally {
    SC_PTS = saved.pts; SC_FAMILY = saved.fam; SC_FIT = saved.fit; SC_GEO = saved.geo; refreshAll = saved.rf; scPtToData = saved.ptd; _scDrag = saved.drag;
    scRampIds().forEach((id, i) => { document.getElementById(id).value = saved.ramps[i][0]; INPUTS.v[id] = saved.ramps[i][1]; });
  }
}

/** What the maturity block of the S-curve section derives from the current points/family (legacy renderScurveMaturity). */
function scurveView() {
  const saved = { pts: SC_PTS && SC_PTS.map((p) => ({ t: p.t, a: p.a })), fit: SC_FIT, geo: SC_GEO };
  renderScurveMaturity();   // NB: viewing the section seeds / clamps SC_PTS (a legacy side effect), so it is undone below
  const N = teEngineNow().horizonMonths, crossMonth = (th) => { if (th <= 0) return 1; for (let t = 1; t <= N; t++) if (scEval(t) >= th) return t; return null; };
  const out = { N, family: SC_FAMILY, pts: SC_PTS.map((p) => ({ t: p.t, a: p.a })), endAd: Math.round(scEval(N)),
    levels: maturityRampLevels().map((l) => ({ lvl: l.lvl, from: l.from, range: l.range, month: crossMonth(l.from) })),
    curve: [1, 6, 12, 13, 24, 36, N].map((t) => scEval(t)) };
  SC_PTS = saved.pts; SC_FIT = saved.fit; SC_GEO = saved.geo;
  return out;
}

/** Numbers behind the "Automation over time" chart and the glass-ceiling funnel (legacy renderAutomationCurve / afStages). */
function automationView() {
  const m = model(), eng = teEngineNow(), N = Math.max(1, eng.horizonMonths);
  const auto = Math.max(0, Math.min(100, m.auto)), eff = Math.max(0, Math.min(auto, m.eff));
  const row = teEndYearRow(), tt = targetTeam(), rampEnd = eng.rampAt(N), realEnd = (eff * rampEnd) / 100;
  const months = [1, 6, 12, 13, 24, 36, N].filter((t) => t <= N);
  return { N, auto, eff, rampEnd, realEnd, humanEnd: row.totalHumanFteEnd, vfteEnd: row.agentVfteEnd,
    team: { devETP: tt.devETP, supETP: tt.supETP, runETP: tt.runETP },
    real: months.map((t) => [t, (eff * eng.rampAt(t)) / 100]),
    levels: maturityRampLevels().map((b) => { let mo = null; for (let t = 1; t <= N; t++) if (eng.rampAt(t) >= b.th) { mo = t; break; } return { lvl: b.lvl, month: mo }; }),
    stages: [1, Math.ceil(N / 2), N].map((t) => afStages(t)), active: afActiveStages() };
}

/** Quick phase tiles (legacy renderQuickPhases maths) and the in-scope count. */
function phaseTiles() {
  const act = activeArtefacts(), by = {};
  let totW = 0;
  act.forEach((a) => { const w = +a.w || 0; totW += w; by[a.phase] = by[a.phase] || { w: 0, hw: 0 }; by[a.phase].w += w; by[a.phase].hw += w * (+a.humanSup || 0); });
  const tiles = phasesForScope().map((p) => {
    const v = by[p.id];
    return { id: p.id, state: phaseState(p.id), share: v && totW ? (v.w / totW) * 100 : 0, contrib: v && totW ? v.hw / totW : 0, humanSup: v && v.w ? v.hw / v.w : 0,
      nStd: DATA.artefacts.filter((a) => a.phase === p.id && selectedArtefacts.has(a.id)).length,
      nReg: regOfActiveNorms(p.id).filter((a) => selectedRegArtefacts.has(a.id)).length, empty: phasePopulation(p.id).length === 0 };
  });
  renderQuickPhases();
  return { tiles, count: document.getElementById('quickPhaseCount').textContent };
}

/** Lifecycle weighting block: status label, posture, per-phase weights and effort shares, status table (legacy cascade + doc). */
function lcView() {
  renderLifecycleCascade(); renderLifecycleDoc();
  const wm = lifecycleWeightMap(), wPhase = {};
  activeArtefacts().forEach((a) => { wPhase[a.phase] = (wPhase[a.phase] || 0) + (+a.w || 0); });
  const totW = Object.values(wPhase).reduce((s, v) => s + v, 0) || 1;
  return { use: lifecycleUse, pos: lifecyclePos, label: lifecycleStatusLabel(), posture: lifecycleAutoPosture(),
    rows: phasesForScope().map((p) => ({ id: p.id, weight: wm[p.id], share: ((wPhase[p.id] || 0) / totW) * 100 })),
    doc: [...document.querySelectorAll('#lifecycleDocTable tr')].map((tr) => [...tr.cells].map((td) => td.textContent)),
    cascadeText: document.getElementById('lifecycleCascade').textContent };
}

export const EXTRAS = { scurveMath: run(scurveMath), scurveView: run(scurveView), automationView: run(automationView), phaseTiles: run(phaseTiles), lcView: run(lcView) };
