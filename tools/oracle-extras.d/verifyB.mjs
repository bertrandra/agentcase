// Legacy "verify" views (second half), recorded per fixture into app/fixtures/extras/vb_*/<fixture>.json.
// vb_dom renders the section functions and reads back table cells / cards / chart data, so the React views can be compared cell by cell.
// vb_gantt renders the Gantt (collapsed, then every phase expanded) and reads back rows, bar positions, ticks and milestone markers.
const dom = `(()=>{
  renderKpi(); renderExec(); renderAsisTobe(); renderProductivity(); renderVelocity(); renderQuality(); renderCompliance();
  const rows = sel => [...document.querySelectorAll(sel+' tr')].map(r => [...r.children].map(c => c.textContent.replace(/\\s+/g,' ').trim()));
  const cards = id => [...document.querySelectorAll('#'+id+' .card')].map(c => [...c.children].map(e => e.textContent.replace(/\\s+/g,' ').trim()));
  const ch = id => charts[id] ? {labels: charts[id].data.labels, sets: charts[id].data.datasets.map(d => ({label: d.label, data: d.data}))} : null;
  const C = {}; ['kc','ec','prc','vc','qr','cc'].forEach(i => C[i] = ch(i));
  return {kpiCards: cards('kpiCards'), kpiEco: rows('#kpiEco'), kpiVq: rows('#kpiVq'), kpiComp: rows('#kpiComp'), exec: rows('#execTable'), asis: rows('#asisTable'),
    prod: rows('#prodTable'), dora: rows('#doraTable'), qual: rows('#qualTable'), qualInputs: [...document.querySelectorAll('#qualTable input')].map(i => i.value),
    velo: [document.getElementById('veloPerfRelCap').value, document.getElementById('veloPerfUpliftFactor').value],
    compCards: cards('compCards'), comp: rows('#compSectorTable'), charts: C};
})()`;
const gantt = `(()=>{
  const cap = () => {
    const host = document.getElementById('ganttHost'), card = host.querySelector('.card');
    const bars = row => [...row.children[1].querySelectorAll('div')].map(d => [d.style.left, d.style.width]);
    const rowsOf = h => [...card.children].filter(r => r.style.height === h + 'px').map(r => ({label: r.children[0].textContent.trim(), bars: bars(r), title: r.children[0].getAttribute('title')}));
    const head = [...card.children].find(r => r.style.height === '18px');
    return {
      summary: [...host.querySelectorAll('.sb-item')].map(e => [e.children[0].textContent, e.children[1].textContent]),
      ticks: [...head.children[1].children].map(t => [t.style.left, t.textContent.trim()]),
      prog: rowsOf(21), phases: rowsOf(22),
      marks: [...host.querySelectorAll('[title*="(month"]')].map(m => [m.getAttribute('title'), m.style.left, m.textContent.trim()]),
      release: [...host.querySelectorAll('div')].filter(d => d.textContent.trim() === '🏁 full cycle complete').map(d => d.style.left),
      overlap: document.getElementById('ganttOverlap').value, crossSeq: (document.getElementById('ganttCrossSeq') || {value: null}).value,
      note: [...card.children].map(c => c.textContent).filter(t => /No phase in scope/.test(t)),
    };
  };
  ganttExpanded = {}; renderGantt(); const collapsed = cap();
  DATA.phases.forEach(p => { ganttExpanded[p.id] = true; }); ganttExpanded['__cross__'] = true; renderGantt(); const expanded = cap();
  ganttExpanded = {}; renderGantt();
  return {collapsed, expanded};
})()`;
export const EXTRAS = { vb_dom: dom, vb_gantt: gantt };
