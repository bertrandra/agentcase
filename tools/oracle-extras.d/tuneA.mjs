// Oracle extras of the "tune" group, first half: maturity-map, maturity, readiness, eligibility, program, opmodel.
// Numbers come straight from the legacy functions; the *Text extras are the visible text of the legacy render hosts (text nodes joined
// by spaces), so the section tests can also check every figure the legacy showed on every fixture, not only on the four text dumps.
const txt = `(function(ids){ return ids.map(function(id){ var t=[]; var w=function(n){ if(n.nodeType===3) t.push(n.textContent); else n.childNodes.forEach(w); t.push(' '); }; w(document.getElementById(id)); return t.join(''); }).join(' | '); })`;
const hosts = (render, ids) => `(${render}, ${txt}(${JSON.stringify(ids)}))`;

export const EXTRAS = {
  tuneAMaturity: `({ info: maturityInfo(model()), map: JSON.parse(JSON.stringify(MATURITY_MAP)), ranges: maturityRampLevels().map(function(l){ return l.range; }) })`,
  tuneAMaturityMapText: hosts('renderMaturityMapEditor()', ['maturityMapHost']),
  tuneAReadiness: `({ idx: readinessIndex(), dims: READINESS_DIMS.map(function(d){ return dimScore(d.key); }), bands: READINESS_DIMS.map(function(d){ return readinessBand(dimScore(d.key)).label; }), band: readinessBand(readinessIndex()).label, ans: JSON.parse(JSON.stringify(readinessAns)) })`,
  tuneAReadinessText: hosts('renderReadiness(true)', ['readinessScore', 'readinessBand', 'readinessBars']),
  tuneAHri: `({ on: hriEnabled(), index: hriIndex(), intensity: hriIntensity(), costPerFte: hriCostPerFTE(), change: convChangeCost(), ramp: hriRampFactor() })`,
  tuneAHriText: hosts('renderHri()', ['hriOut']),
  tuneAEligibility: `({ verdict: eligVerdict(), abaque: abaqueRows(), base: vtaxEffBase(), avgHuman: vtaxAvgHuman(), mode: vtaxMode(), profile: currentProfileId(), pillar: PRODUCT_PROFILES.map(function(p){ return PROFILE_PHASES.map(function(ph){ return profileCoef(p[0], ph); }); }), vtaxRate: verificationTaxRate() })`,
  tuneAEligibilityText: hosts('renderEligibilityTab()', ['elGateHost', 'pillarHost', 'abaqueHost']),
  tuneAOpmodel: `(function(){ var m = model(); return { y1: opModelCompute(m, 0), yN: opModelCompute(m, teEndYear() - 1), pods2: opModelCompute(m, 2).pods }; })()`,
  tuneAOpmodelText: hosts('renderOpModel()', ['omHost']),
  tuneAProgramText: hosts('renderProgramTab()', ['pilotHost', 'capHost', 'safeHost', 'ipHost', 'transHost', 'cacheHost']),
  tuneAMaturityTabText: hosts('renderMaturityTab()', ['sddHost', 'coachHost', 'socleHost', 'govGateHost']),
};
