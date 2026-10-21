// Extra fixture cases for the "frame" group.
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
export const RECIPES = [
  { id: 'frame-engage', desc: 'custom onboarding durations, start date and tracker actuals',
    code: setIn('rmD1', '2') + setIn('rmD2', '6') + setIn('rmD3', '3') + setIn('rmD4', '10') + setIn('rmStart', '2026-03-15')
      + "trackQSet('q1').ad=10; trackQSet('q2').ad=40; trackQSet('q2').sav=50000; trackQSet('q3').ad=1;" },
  { id: 'frame-industry-cross', desc: 'automotive profile, one norm unticked, AI + usability cross-cutting',
    code: "setRegUse(true); " + setIn('industry', 'AUTO') + " onIndustryChangedReg(); toggleNorm('AUTO', REG_CATALOG.norms.filter(n=>n.industry==='AUTO')[0].name, false); toggleCross('AI', true); toggleCross('USABILITY', true); setRegInclude(false);" },
  { id: 'frame-ctx-edit', desc: 'STA context, edited coefficient, discount 12 %, customer name',
    code: setIn('engagementCtx', 'STA') + "ENGAGE_COEF.STA.rampSpeed=0.6; onCustomerNameChange('Acme Corp'); setCaseDiscountRate(0.12);" },
];
