// Software/Agentic Factory read-outs and generators as the legacy app computes them: the contract of app/src/domain/factory/*.
// The two generators mutate the factory globals, so they run inside isolated(): the state is saved first and restored after (APP_STATE round trip).
const KEYS = ['VISION', 'PORTFOLIO_ITEMS', 'EPICS', 'FEATURES', 'STORIES', 'SPRINTS', 'PROGRAM_INCREMENTS', 'STORY_ASSIGNMENTS', 'RELEASES', 'RELEASE_ITEMS',
  'RELEASE_CANDIDATES', 'APPROVALS', 'DEPLOYMENTS', 'ENVIRONMENTS', 'COMMITS', 'BUILDS', 'BUILD_ARTIFACTS', 'QUALITY_GATES', 'INTEGRATED_PRODUCT',
  'MONITORING_EVENTS', 'FEEDBACK_ITEMS', 'BACKLOG_ITEMS', 'fmPhaseFeatures', 'fmArtefactTags', 'fmRegArtefactTags', 'FG_PARAMS', 'FG_PROVENANCE'];
const HELPERS = `
  function canon(v){ if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+canon(v[k]);}).join(',')+'}'; return JSON.stringify(v); }
  function fnv(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(16); }
  function digest(a){ return { n:a.length, h:fnv(canon(a)) }; }
  function dump(){
    var o={}; ['PORTFOLIO_ITEMS','EPICS','FEATURES','STORIES','SPRINTS','PROGRAM_INCREMENTS','STORY_ASSIGNMENTS','RELEASES','RELEASE_ITEMS','RELEASE_CANDIDATES','APPROVALS',
      'DEPLOYMENTS','ENVIRONMENTS','COMMITS','BUILDS','BUILD_ARTIFACTS','QUALITY_GATES','MONITORING_EVENTS','FEEDBACK_ITEMS','BACKLOG_ITEMS'].forEach(function(k){ o[k]=digest(APP_STATE.get(k)); });
    o.vision=VISION.statement; o.integrated=INTEGRATED_PRODUCT;
    o.phaseFeatures=digest(APP_STATE.get('fmPhaseFeatures').filter(function(p){return p.featureIds&&p.featureIds.length;}));
    var so={}; APP_STATE.get('fmArtefactTags').concat(APP_STATE.get('fmRegArtefactTags')).forEach(function(t){ if(t.storyId) so[t.id]=t.storyId; }); o.storyOf=digest([so]);
    return o;
  }`;
const isolated = (body) => `(function(){ ${HELPERS}
  var ks=${JSON.stringify(KEYS)}; var sv=ks.map(function(k){ return APP_STATE.get(k); });
  try{ ${body} } finally { ks.forEach(function(k,i){ APP_STATE.set(k, sv[i], 'oracle'); }); } })()`;
const KPI_IDS = ['fmDeployFreq', 'fmPromotionLeadDays', 'fmRollbackRate', 'fmFailedDeployRate', 'fmEnvStabilityDays', 'fmApprovalDurationDays', 'fmAutonomousCompletion',
  'fmHumanIntervention', 'fmGatePassRate', 'fmGateReworkRate', 'fmCommitVolume', 'fmAgentTestShare', 'fmAvgCommitsPerTask', 'fmBuildSuccessRate'];
export const EXTRAS = {
  fm_kpi: `(function(){ var o={}; ${JSON.stringify(KPI_IDS)}.forEach(function(id){ o[id]={ v:variableById(id).get(), n:fmKpiSample(id) }; }); o.minSample=fmMinSample(); o.tasks=fmAllTasks().length; return o; })()`,
  fm_cards: `(function(){ var o={}; ${JSON.stringify(KPI_IDS)}.forEach(function(id){ var v=variableById(id), nS=fmKpiSample(id), thin=(nS!==null && nS<fmMinSample()), showUnit=v.unit&&(v.canonicalFormat==='DEC1'||v.canonicalFormat==='INT'); o[id]={ thin:thin, n:nS, disp: thin?'\u2014':formatValue(v.get(),v.canonicalFormat)+(showUnit?' '+v.unit:'') }; }); return o; })()`,
  fm_pre: 'fgPreflight()',
  fm_win: `(function(){ var g=fgGrid(), w=fgPhaseWindows(g), o={ totalW:g.totalW, first:g.date(1), d9:g.date(9,3) }; Object.keys(w).forEach(function(k){ o[k]=[w[k].sw,w[k].ew,w[k].arts.length]; }); return o; })()`,
  fm_demo: isolated(`fmLoadDemoDataset(); return dump();`),
  fm_gen: isolated(`if(!Object.keys(fgPhaseWindows(fgGrid())).length) return { skipped:true };
    fgGenerateWeekly(); var o=dump(); var pv=Object.assign({},FG_PROVENANCE); delete pv.at; delete pv.ms; o.provenance=pv; return o;`),
};
