// Fixture recipes for the Factory sections: a loaded demo dataset, generated datasets (default and tuned parameters, regulated scope, longer horizon).
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
export const RECIPES = [
  { id: 'fm-demo', desc: 'factory demo dataset loaded', code: 'fmLoadDemoDataset();' },
  { id: 'fm-generated', desc: 'weekly factory data generated from the default case', code: 'fgGenerateWeekly();' },
  { id: 'fm-generated-tuned', desc: 'generated, 5 years, logistic curve, density 0.5, other seed and cadence, regulated scope',
    code: setIn('horizon', '5') + " TIME_ACTIVE_CURVE='logistic.default'; SC_FAMILY='logistic'; setRegUse(true); " + setIn('industry', 'MED') + " onIndustryChangedReg(); readInputs(); fgSet('density',0.5); fgSet('seed',4242); fgSet('releaseEveryWeeks',6); fgSet('maxRecords',400); fgGenerateWeekly();" },
  { id: 'fm-generated-scope', desc: 'generated over a one-year horizon with 3-week sprints and a fractional RC lead time', code: setIn('horizon', '1') + " readInputs(); fgSet('sprintWeeks',3); fgSet('rcLeadDays',7.5); fgGenerateWeekly();" },
];
