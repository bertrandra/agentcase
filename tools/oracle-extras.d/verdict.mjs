// Oracle extras of the "verdict" group (results, decision, strategies). Each expression is self-contained (it runs its own Monte Carlo).
export const EXTRAS = {
  decisionRun: "(function(){ MC_LAST=null; runMonteCarlo(200); const d=decisionEngine(); return {verdict:d.verdict, confidence:d.confidence, stats:d.stats, p10Floor:d.p10Floor, drivers:d.drivers, conditions:d.conditions, ctx:d.ctx, setup:d.setup, premium:(engagementCoef().riskPremium||0)/100+wave2RiskPremium()}; })()",
  resultsCore: "(function(){ const m=model(); let net=0; horizonYears().sav.forEach(function(v){ net+=v; }); net-=m.setupTotal; const sb=savingsBreakdown().years; const B=sb[sb.length-1]; const C=tobeComposition(teEndYear()-1); let cum=-m.setupTotal, pb='—'; const sy=teYears(); for(let y=0;y<sy.length;y++){ cum+=sy[y].savings; if(cum>0){ pb='Year '+(y+1); break; } } return {net, roi:roiCanonical(net,m.setupTotal), payback:pb, B:{grossAuto:B.grossAuto,agentCost:B.agentCost,relocation:B.relocation,total:B.total,netAuto:B.netAuto}, years:sb.map(y=>({grossAuto:y.grossAuto,agentCost:y.agentCost,relocation:y.relocation,total:y.total})), tot:C.tot, eff:m.eff, setup:m.setupTotal, horizon:m.horizon, status:lifecycleStatusLabel()}; })()",
  resultsText: "(function(){ MC_LAST=null; renderResults(); const a=document.getElementById('resultsHost').innerText; runMonteCarlo(200); renderResults(); return {noMc:a, mc:document.getElementById('resultsHost').innerText}; })()",
  strategyEval: "evaluateStrategies()",
  strategyLocSplits: "strategyLocSplits()",
  strategyRanking: "stratNormalize(evaluateStrategies()).map(o=>({id:o.id,norm:o.norm,score:o.score}))",
};
