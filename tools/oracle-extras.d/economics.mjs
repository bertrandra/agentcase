// Legacy economics, recorded per fixture into app/fixtures/extras/econ_*/<fixture>.json.
// The DOM extras render the four sections in the legacy page and read back the table cells, so the React views can be
// compared cell by cell (formatting included). All expressions run after readInputs() + refreshAll().
const dom = `(()=>{
  renderFinancial(); renderRun(); renderAnnual(); renderMonthly();
  const rows = id => [...document.querySelectorAll('#'+id+' tr')].map(r => [...r.children].map(c => c.textContent.trim()));
  const band = id => [...document.querySelectorAll('#'+id+' .sb-item')].map(e => [e.children[0].textContent, e.children[1].textContent]);
  const txt = id => (document.getElementById(id)||{textContent:''}).textContent.replace(/\\s+/g,' ').trim();
  const how = [...document.getElementById('roiHow').children].map(d => [...d.children].map(c => c.textContent.trim()));
  const T = {}; ['investTable','opCostTable','savTable','plTable','fteShiftTable','roiYearTable','runTable','annualTable','monthlyTable'].forEach(i => T[i] = rows(i));
  const B = {}; ['roiSummary','investSummary','opCostSummary','savSummary','plSummary','fteShiftSummary','runSummary','annualSummary'].forEach(i => B[i] = band(i));
  const sd = [...document.querySelectorAll('#savDecomp > div')].map(d => d.textContent.replace(/\\s+/g,' ').trim()).filter(Boolean);
  return {T, B, how, reco: txt('roiReco'), sd, sdRows: rows('savDecomp'), note: txt('monthlyCurveNote')};
})()`;
export const EXTRAS = {
  econ_monthly: 'monthlySeries()',
  econ_savings: '(()=>{const b=savingsBreakdown(); return {years:b.years, asis:b.asis, tgt:b.tgt, wd:b.wd, baseEtp:b.baseEtp};})()',
  econ_roi: `(()=>{
    const m = model(), Y = teEngineNow().years(), tb = Y.reduce((a, y) => a + y.savings, 0), net = tb - m.setupTotal, roi = roiCanonical(net, m.setupTotal);
    const rate = (MODEL.CASE && typeof MODEL.CASE.discountRate === 'number') ? MODEL.CASE.discountRate : 0.08, n = monthlySeries().length, be = paybackMonthsCanonical();
    return {totalBen: tb, net, roi, roiPct: fmtRoiPct(roi), payback: be, paybackText: fmtPayback(be, n), months: n, npvRate: rate, npv: npvCanonical(rate), horizon: Y.length,
      freed: Y.map(y => Math.max(0, m.base.etp - y.humanFteEnd))};
  })()`,
  econ_fmt: `({
    roi: [null, 0, 0.004, 0.3, 1.5, 6.5712, -0.4, 12.345].map(fmtRoiPct),
    payback: [[null, 36], [0, 36], [1, 36], [9, 36], [Infinity, 60], [undefined, 120]].map(a => fmtPayback(a[0], a[1])),
    fmtK: [0, 499, 500, 1499, 1500, 1704000, -15379, -400, 1234567, 12345678].map(fmtK),
    fmtE: [0, 0.5, 1.5, 22121.4, -15379.5, 1234567.89].map(fmtE),
    yLabel: [1, 2, 3, 10].map(yLabel),
    roiNull: [roiCanonical(5, 0), roiCanonical(NaN, 10), roiCanonical(Infinity, 10), roiCanonical(50, 10)],
  })`,
  econ_dom: dom,
};
