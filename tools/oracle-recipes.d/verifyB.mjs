// Extra fixture cases for the "verify" group, second half (kpi, exec, asis-tobe, productivity, velocity, quality, compliance, gantt).
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
export const RECIPES = [
  { id: 'vb-seq', desc: 'gantt: phase + artefact sequence ties, overlap 30 %, cross-cutting on with its own seq',
    code: "setRegUse(true); toggleCross('AI',true); toggleCross('SUST',true);"
      + "DATA.phases.find(x=>x.id==='V3').seq=2; DATA.artefacts.filter(a=>a.phase==='V1').slice(0,2).forEach((a,i)=>{a.seq=5-i;});"
      + "refreshAll(); renderGantt(); document.getElementById('ganttOverlap').value='30'; document.getElementById('ganttCrossSeq').value='3';" },
  { id: 'vb-gantt-alt', desc: 'gantt: no onboarding, other start date and durations, horizon 5, setup 6 months',
    code: setCk('ganttShowOnboarding', false) + setIn('rmStart', '2027-03-15') + setIn('rmD1', '2') + setIn('rmD2', '3') + setIn('horizon', '5') + setIn('setupDuration', '6') + setIn('khSetupDays', '60') },
  { id: 'vb-perf-edit', desc: 'quality / DORA / throughput anchors edited, performance coefficients changed, scope V3+V4 only',
    code: "QUALITY[1][1]=50; QUALITY[3][2]=2; QUALITY[0][1]=3.5; COEF.perfRelCap=1.1; COEF.perfUpliftFactor=0.7;"
      + "DORA_ANCHORS.find(a=>a.id==='leadTime').asis=30; THROUGHPUT_ANCHORS.find(a=>a.id==='testCases').target=200;"
      + "selectedArtefacts=new Set(DATA.artefacts.filter(a=>a.phase==='V3'||a.phase==='V4').map(a=>a.id));" },
  { id: 'vb-scope-l0', desc: 'scope limited to L0: no throughput category in scope (productivity fallback)',
    code: "selectedArtefacts=new Set(DATA.artefacts.filter(a=>a.phase==='L0').map(a=>a.id));" },
];
