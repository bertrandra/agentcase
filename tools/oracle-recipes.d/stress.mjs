// Oracle recipes of the "stress" and "verdict" groups (scenarios, compare, sensitivity, Monte Carlo, results, decision, strategies).
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
export const RECIPES = [
  { id: 'scen-india-ramp50', desc: 'scenarios: destination India, 50 %/yr relocation ramp', code: setIn('scenTargetLoc', 'India') + setIn('scenFrPerYear', '50') },
  { id: 'scen-poland-h5', desc: 'scenarios: destination Poland, 5-year horizon, classic saving 8 %', code: setIn('scenTargetLoc', 'Poland') + setIn('horizon', '5') + setIn('classicSaving', '8') },
  { id: 'mc-seed-7', desc: 'Monte Carlo: seed 7, 300 draws, widened y3 ramp range', code: "renderMonteCarlo(false); document.getElementById('mcSeed').value='7'; document.getElementById('mcDraws').value='300'; MC_PARAMS.find(p=>p.id==='y3Ramp').spread=20;" },
  { id: 'strat-custom', desc: 'strategies: edited weights, levers, declared metrics and geo split', code: "STRAT_WEIGHTS.roi=60; STRAT_WEIGHTS.agility=5; STRATEGY_DEFS.find(s=>s.id==='hybrid').levers.auto=55; STRATEGY_DEFS.find(s=>s.id==='tm').declared.risk=5; STRATEGY_DEFS.find(s=>s.id==='nearshore').locSplit.Egypt=10;" },
  { id: 'strat-applied-hybrid', desc: 'strategies: Skill center applied, then Hybrid applied (base is kept, factors do not compound)', code: "applyStrategy('skill'); applyStrategy('hybrid');" },
  { id: 'strat-applied-agentic', desc: 'strategies: Agentic Organization applied (inherits levers)', code: "applyStrategy('agentic');" },
  { id: 'di-risk-on', desc: 'decision: AI-Act high, quality and risk register applied, eligibility conditional, readiness answered', code: setIn('aiActTier', 'high') + setCk('aiActApply', true) + setCk('qualApply', true) + setCk('riskApply', true) + setIn('elNature', 'critical') + setIn('elPre_plat', 'unmet') + setCk('hriEnabled', true) + "READINESS_DIMS.forEach((d,i)=>d.q.forEach((_,j)=>{readinessAns[d.key][j]=[0,50,100][(i+j)%3];}));" },
];
