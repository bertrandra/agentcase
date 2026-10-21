// Extra fixture cases for the economics group (Financial, Run, Annual, Monthly). The standard recipes already cover
// horizons 1/2/5/10, every curve family, discount-12, setup-large and target-loc-offshore; these add the verdict bands,
// the "nothing invested" edge (ROI n/a) and horizon 7.
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setup = (t, tr, c, g) => setIn('setupTooling', t) + setIn('setupTraining', tr) + setIn('setupCoaching', c) + setIn('setupGov', g);
export const RECIPES = [
  { id: 'econ-no-setup', desc: 'no setup spend: ROI n/a, payback immediate', code: setup(0, 0, 0, 0) + "document.getElementById('khEnabled').checked=false;" },
  { id: 'econ-roi-mid', desc: 'setup around 1M: conditional GO band', code: setup(400000, 300000, 200000, 100000) },
  { id: 'econ-roi-low', desc: 'setup 4M: reconsider band, no payback', code: setup(2000000, 1000000, 600000, 400000) },
  { id: 'econ-horizon-7', desc: 'horizon 7 years', code: setIn('horizon', '7') },
];
