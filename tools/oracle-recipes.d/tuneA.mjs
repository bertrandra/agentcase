// Extra oracle cases of the "tune" group, first half.
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
const hriMixed = Array.from({ length: 18 }, (_, i) => setIn('hriQ' + i, ['0', '2', '4'][i % 3])).join('');

export const RECIPES = [
  { id: 'tuneA-readiness', desc: 'AI readiness partly answered; Human Readiness on with mixed answers, costs and coefficients',
    code: `setAllReadiness(50); setReadiness('doc',0,'100'); setReadiness('sec',1,'0'); setReadiness('cloud',2,''); setReadiness('arch',0,'0'); setReadiness('skills',1,'100');`
      + setCk('hriEnabled', true) + hriMixed + setIn('hriCostStd', '3500') + setIn('hriCostInt', '6000') + `coefSet('hriFloor','0.5'); coefSet('hriSlope','0.5');` },
  { id: 'tuneA-hri-light', desc: 'Human Readiness on, every answer Yes (light intensity)',
    code: setCk('hriEnabled', true) + Array.from({ length: 18 }, (_, i) => setIn('hriQ' + i, '4')).join('') + `setAllReadiness(100);` },
  { id: 'tuneA-maturity-bounds', desc: 'edited L1-L4 thresholds and labels, 5-year horizon',
    code: `setMaturityBound('ramp',1,40); setMaturityBound('ramp',2,60); setMaturityBound('ramp',3,70); setMaturityBound('share',1,5); setMaturityBound('share',2,15); setMaturityBound('share',3,20); setMaturityLabel(0,'Level one');`
      + setIn('horizon', '5') },
  { id: 'tuneA-elig-nogo', desc: 'critical delivery, 600 kLoC, unmet spec gate, modernisation profile with pillar leverage and net verification tax',
    code: setIn('elNature', 'critical') + setIn('elLoc', '600') + setIn('elPre_spec', 'unmet') + setIn('elPre_client', 'partial') + setCk('pillarApply', true)
      + `setProductProfile('modernisation');` + setCk('vtaxApply', true) + setIn('vtaxMode', 'net') + setIn('vtaxBase', '0.45') + `coefSet('vtaxCap','0.5');` },
  { id: 'tuneA-program', desc: 'programme parameters changed, 4-FTE pods, SDD and coaching set, STA context',
    code: setIn('pilotFte', '5') + setIn('pilotBreakin', '3') + setIn('pilotWeeks', '16') + setIn('capOps', '80') + setIn('capTrain', '120') + setIn('capTarget', '400')
      + setIn('cacheShare', '40') + setIn('cacheDisc', '60') + setIn('omPodSize', '4') + setIn('sddMat', '60') + setIn('harnessMat', '35')
      + setIn('coachY1', '55') + setIn('coachCruise', '10') + setIn('engagementCtx', 'STA') },
];
