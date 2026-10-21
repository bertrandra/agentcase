// Oracle extras of the "stress" group: legacy expressions evaluated per fixture (see ../oracle.mjs).
const rows = (sel) => `[...document.querySelectorAll('${sel} tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()))`;
const ds = (id) => `charts.${id}.data.datasets.map(d=>({l:d.label,d:d.data}))`;
export const EXTRAS = {
  scenarioSet: "scenarioSet().map(s=>({key:s.key,label:s.label,m:s.m}))",
  scenarioTables: `(renderScenarios(), {cost:${rows('#scenCostTable')}, roi:${rows('#scenRoiTable')}, costChart:${ds('scenCost')}, roiChart:${ds('scenRoi')}, roiLabels:charts.scenRoi.data.labels})`,
  compareView: `(renderCompare(), {table:${rows('#cmpTable')}, fte:${ds('cmpFteChart')}, cost:${ds('cmpCostChart')}, save:${ds('cmpSaveChart')}, velo:${ds('cmpVeloChart')}})`,
  sensitivityView: `(renderSensitivity(), {table:${rows('#sensTable')}, matrix:${rows('#sensMatrix')}, head:[...document.querySelectorAll('#sensMatrix thead th')].map(t=>t.textContent)})`,
  mcRun: "(function(){ MC_LAST=null; const r=runMonteCarlo(200); return {stats:r.stats, sens:r.sens, outcomes:r.outcomes, params:MC_PARAMS}; })()",
  thinNow: "teThinNow(modelRaw(), 0.08)",
};
