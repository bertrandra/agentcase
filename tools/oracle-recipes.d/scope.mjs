// Extra fixture cases for the scope tools group (params, scurve, phase-scope, lc-weighting).
// `sc(...)` mirrors what the S-curve editor does on release: set the points/family, then scCommit() (sample the fit at 12/24/36 into the ramp anchors).
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const commit = 'scFitNow(); scSetRamp(0,scEval(12)); scSetRamp(1,scEval(24)); scSetRamp(2,scEval(36));';
const sc = (family, pts) => `SC_FAMILY='${family}'; TIME_ACTIVE_CURVE='${family}.default'; SC_PTS=${JSON.stringify(pts)}; SC_FIT=null; ${commit}`;
export const RECIPES = [
  { id: 'sc-logistic-4pt', desc: 'logistic curve fitted through four dragged points, ramps sampled', code: sc('logistic', [{ t: 6, a: 10 }, { t: 12, a: 30 }, { t: 24, a: 65 }, { t: 36, a: 92 }]) },
  { id: 'sc-gompertz-4pt', desc: 'Gompertz curve fitted through four dragged points, ramps sampled', code: sc('gompertz', [{ t: 6, a: 8 }, { t: 12, a: 24 }, { t: 24, a: 60 }, { t: 36, a: 90 }]) },
  { id: 'sc-spline-5pt', desc: 'free-form spline through five points, ramps sampled', code: sc('spline', [{ t: 3, a: 2 }, { t: 9, a: 20 }, { t: 15, a: 30 }, { t: 30, a: 80 }, { t: 36, a: 97 }]) },
  { id: 'sc-logistic-seed', desc: 'logistic family chosen in the editor on the seeded points (what scSetFamily does)', code: sc('logistic', [{ t: 12, a: 25 }, { t: 24, a: 55 }, { t: 36, a: 100 }]) },
  { id: 'sc-gompertz-seed', desc: 'Gompertz family chosen in the editor on the seeded points (what scSetFamily does)', code: sc('gompertz', [{ t: 12, a: 25 }, { t: 24, a: 55 }, { t: 36, a: 100 }]) },
  { id: 'lifecycle-pos-37', desc: 'lifecycle position 37 (blend of two statuses)', code: 'lifecyclePos=37;' },
  { id: 'sc-horizon-5', desc: 'spline through three points on a 5-year horizon', code: setIn('horizon', '5') + sc('spline', [{ t: 12, a: 20 }, { t: 36, a: 60 }, { t: 60, a: 95 }]) },
];
