// Fixture cases for the "baseline" sections (team-in, ratecard, loc-strat): pinned rows, unstaffed skills, mixed locations, edited rates.
const ind = c => `setRegUse(true); document.getElementById('industry').value='${c}'; onIndustryChangedReg();`;
export const RECIPES = [
  { id: 'baseline-pins-med', desc: 'medical profile, pinned lines (SDLC + regulatory), unstaffed skills',
    code: ind('MED') + `teamIn=[{pins:['A017','A018'],skill:'Dev',grade:'B2',loc:'Portugal',etp:3},{pins:[],skill:'Dev',grade:'B1',loc:'India',etp:4},` +
      `{pins:[],skill:'Test/QA',grade:'B2',loc:'Poland',etp:2},{pins:['R039'],skill:'Functional Safety',grade:'C2',loc:'France',etp:1.5},{pins:[],skill:'Lead',grade:'D2',loc:'France',etp:0.5}];` },
  { id: 'baseline-mixed-team', desc: 'multi-location team, edited rate card, target mix reset to AS-IS',
    code: `teamIn=[{pins:[],skill:'Analysis/PO',grade:'C1',loc:'France',etp:2},{pins:[],skill:'Arch/Design',grade:'D1',loc:'France',etp:1.5},{pins:[],skill:'Dev',grade:'B2',loc:'Portugal',etp:4},` +
      `{pins:[],skill:'Dev',grade:'B1',loc:'India',etp:2.5},{pins:[],skill:'Test/QA',grade:'B2',loc:'Egypt',etp:2},{pins:[],skill:'Ops/Run',grade:'C1',loc:'France',etp:1.5},{pins:[],skill:'Sec/Quality',grade:'C2',loc:'Morocco',etp:1}];` +
      `RATE.France.B=520; RATE.India.B=240; RATE.Portugal.C=410; targetLocPct=null;` },
];
