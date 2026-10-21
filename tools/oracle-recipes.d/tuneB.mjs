// Extra fixtures for the "tune B" sections.
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
export const RECIPES = [
  { id: 'tuneB-risk', desc: 'AI-Act high tier applied, quality premium (maintainability, SDD 40), register applied with edited cells',
    code: setIn('aiActTier', 'high') + setCk('aiActApply', true) + setCk('qualApply', true) + setIn('qualSeverity', 'maintainability') + setIn('sddMat', '40')
      + setCk('riskApply', true) + setIn('risk_p_inject', '1') + setIn('risk_i_supply', '1') + setIn('risk_p_debt', '3') + setCk('vtaxApply', true) },
  { id: 'tuneB-coef', desc: 'edited coefficients: supervision share, quality cap, setup headcount, token mix and output share',
    code: "COEF.supShareCap=0.3; COEF.supShareFactor=0.4; COEF.qualPremiumCap=0.5; COEF.setupETP=3; COEF.prodFactor=1.2; COEF.aiFinOpsFte=0.8;"
      + "TOKEN_MODELS=[{name:'A',mix:60,priceIn:2,priceOut:8},{name:'B',mix:20,priceIn:10,priceOut:50},{name:'C',mix:0,priceIn:1,priceOut:1}]; TOK_OUT_SHARE=50;"
      + setCk('qualApply', true) },
  { id: 'tuneB-run', desc: 'hybrid run sizing with a higher floor and ops load, small knowledge hub, lifecycle posture edit',
    code: setIn('runFloorMin', '2') + setIn('runFloorPct', '10') + setIn('runOpsPerAgent', '0.3') + setIn('khTargetCC', '1') + setIn('khA3', '4')
      + "lifecycleUse=true; STATUS_LIFECYCLE[1].autoPosture=1.3; STATUS_LIFECYCLE[1].weights.V3=0.5;" },
];
