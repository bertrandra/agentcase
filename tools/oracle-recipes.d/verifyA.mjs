// Extra fixture cases for the first half of the "verify" group: an edited skill map, an edited TO-BE location split, the agentic loops applied.
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
export const RECIPES = [
  { id: 'verifyA-skillmap', desc: 'artefact skill map edited (Dev -> Lead, Test/QA -> Dev)', code: `SKILL_MAP.Dev='Lead'; SKILL_MAP['Test/QA']='Dev';` },
  { id: 'verifyA-tobesplit', desc: 'TO-BE location split edited for Dev and Test/QA, mixed AS-IS team',
    code: `teamIn=[{pins:[],skill:'Analysis/PO',grade:'C1',loc:'France',etp:2},{pins:[],skill:'Dev',grade:'B2',loc:'Portugal',etp:4},{pins:[],skill:'Dev',grade:'B1',loc:'India',etp:3},` +
      `{pins:[],skill:'Test/QA',grade:'B2',loc:'Egypt',etp:2},{pins:[],skill:'Ops/Run',grade:'C1',loc:'France',etp:1}]; tobeLocSplit=null; ensureLocSplit(); ` +
      `tobeLocSplit.Dev={France:10,Portugal:20,Poland:0,Morocco:0,Egypt:0,China:0,India:70}; tobeLocSplit['Test/QA'].India=40;` },
  { id: 'verifyA-loops', desc: 'internal and external agentic loops applied', code: setCk('loopInternalApply', true) + setCk('loopExternalApply', true) },
  { id: 'verifyA-loops-lce', desc: 'internal loop applied with the loop-calibration flag on (calibrated iteration counts)', code: setCk('loopInternalApply', true) + 'MODEL.FLAGS.lce=true;' },
  { id: 'verifyA-agentdir-v3', desc: 'agent directory filtered on phase V3',
    code: `document.getElementById('agentDirPhaseSel').innerHTML='<option value="ALL">All</option><option value="V3">V3</option>'; document.getElementById('agentDirPhaseSel').value='V3';` },
];
