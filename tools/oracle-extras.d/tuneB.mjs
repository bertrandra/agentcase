// Extras of the "tune B" sections (run-sizing, token-econ, setup, risk, knowledge, lifecycle-edit): legacy values recorded per fixture.
const num = 'function(t){return parseFloat(String(t).replace(/[^0-9.\\-]/g,""));}';
const tbl = (sel) => `(renderTokenModels(), [].slice.call(document.querySelectorAll('${sel} tbody tr')).map(function(tr){return [].slice.call(tr.children).map(function(td){var i=td.querySelector('input'); return i&&i.type==='number'?parseFloat(i.value):(i?i.value:(${num})(td.textContent));});}))`;
export const EXTRAS = {
  tuneBTokenUsage: "(function(){var e=tokenUsageEstimate();return {totM:e.totM,y3:e.y3,inputM:e.inputM,outputM:e.outputM,tpa:e.tpa,agentRuns:e.agentRuns,runsY3:e.runsY3,blended:blendedTokenCostPer1M(),mixTot:tokMixTotal(),endL:e.endL};})()",
  tuneBTokenModels: tbl('#tokenModelTable'),
  tuneBAgentRuns: tbl('#agentRunTable'),
  tuneBArtifactRuns: tbl('#artifactRunTable'),
  tuneBRunSizing: "(function(){var Y=teYears(),t=targetTeam();return {av:Y.map(function(y){return y.agentVfteEnd;}),rt:Y.map(function(y){return y.runTeamFteEnd;}),rc:Y.map(function(y){return y.runTeamCost;}),eff:model().eff,dev:t.devETP,sup:t.supETP,res:t.residualETP,share:t.supShare,avgSup:t.avgHumanSup};})()",
  tuneBSetup: "({t:P('setupTooling'),tr:P('setupTraining'),c:P('setupCoaching'),g:P('setupGov')})",
  tuneBRisk: "(function(){return {score:riskScoreRaw(),riskBar:riskBar(),aiBar:aiActBar(),aiKey:aiActKey(),qualKey:qualKey(),prem:qualPremium(),factor:aiQualityTaxFactor(),qualBar:qualBar(),wave2:wave2RiskPremium(),sdd:qualSdd(),probs:RISK_REGISTER.map(function(r){return [riskProb(r),riskImp(r)];})};})()",
  tuneBKnowledge: "(function(){var m=model(),on=khEnabled(),dEff=0,dSav3=0;if(on){var keep=INPUTS.c.khEnabled;INPUTS.c.khEnabled=false;var m0=model();INPUTS.c.khEnabled=keep;dEff=m.eff-m0.eff;var s=function(a){return a.reduce(function(x,y){return x+y;},0);};dSav3=s(m.yearSav)-s(m0.yearSav);}return {on:on,asisScore:khAsisScore(),asis:khAsisCC(),tgt:khTargetCC(),mult:khMult(),dEff:dEff,dSav:dSav3,kt:m.conv.ktAvoidYr.reduce(function(a,b){return a+b;},0),hub:m.conv.khSetup+m.conv.khRunYr.reduce(function(a,b){return a+b;},0),effCap:m.conv.effCap};})()",
  tuneBLifecycle: "(function(){return {table:STATUS_LIFECYCLE.map(function(s){return {id:s.id,p:s.autoPosture,w:s.weights};}),posture:lifecycleAutoPosture()};})()",
};
