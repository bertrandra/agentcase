// Legacy figures the baseline sections rely on (team weights, location mix, blended rates, apportionment, build/align actions).
const restore = body => `(()=>{ const _s=JSON.stringify(teamIn); try { ${body} } finally { teamIn=JSON.parse(_s); } })()`;
export const EXTRAS = {
  baselineTeamWeights: `(()=>{ const w=teamWeights(); return {rowW:w.rowW,totW:w.totW,staffedW:w.staffedW,poolBySkill:w.poolBySkill,unassigned:w.unassigned,unassignedW:w.unassignedW,impliedETP:w.impliedETP,targetFTE:w.targetFTE,totalFTE:w.totalFTE,fteToFullScope:w.fteToFullScope,pin:w.pin}; })()`,
  baselineLocation: `(()=>{ ensureTargetLoc(); const mx=locationMix(); return {mix:mx, tjm:targetBlendedTJM(), cls:{Local:classTargetPct('Local'),Nearshore:classTargetPct('Nearshore'),Offshore:classTargetPct('Offshore')}, asis:teamInCost(), target:targetLocPct}; })()`,
  baselineApportion: `[apportionFTE([3,2,1],10),apportionFTE([0,0,0],7.5),apportionFTE([5.5,0.2,12],15),apportionFTE([1,1,1],0.5),apportionFTE([],4),apportionFTE([2,3],0)]`,
  baselineBuild: restore(`buildTeamFromArtefacts(); return JSON.parse(JSON.stringify(teamIn));`),
  baselineAlign: restore(`alignTeamToMix(); return JSON.parse(JSON.stringify(teamIn));`),
  baselineScale: restore(`scaleTeamTotal(23.3); return JSON.parse(JSON.stringify(teamIn));`),
};
