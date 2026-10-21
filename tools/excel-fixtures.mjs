// Cases exercised by the Excel oracle / compatibility scripts.
// EXCEL_FIXTURES: ids of app/fixtures/cases (the legacy page loads the case, exports its workbook, a pristine page imports it).
export const EXCEL_FIXTURES = ['golden', 'industry-aero', 'industry-bfi', 'industry-med', 'scope-reduced', 'artefact-edits', 'spline-custom', 'strat-custom',
  'strat-applied-agentic', 'verifyA-skillmap', 'verifyA-tobesplit', 'target-loc-offshore', 'team-large', 'baseline-pins-med', 'tokens-heavy', 'lifecycle-pos-37',
  'lifecycle-off', 'sc-gompertz-4pt', 'sc-logistic-4pt', 'ctx-msi', 'horizon-10', 'fm-demo', 'fm-generated-scope', 'qual-security', 'loop-rework',
  'combo-stress', 'cross-cutting', 'vb-seq', 'tuneA-readiness', 'fit-off-manual', 'force-ceiling-40', 'empty-scope-edge', 'fit-off-high'];

// EXCEL_RECIPES: synthetic cases for sheets no fixture exercises. `base` runs on a pristine page and is captured as the import target's
// state; `edit` then changes the case further and the workbook is exported from THAT state. Importing it onto the base state therefore
// exercises the "edit an existing thing" paths (dynamic sections, groups, dependencies …) as well as the "create" paths.
export const EXCEL_RECIPES = [
  { id: 'xl-dynamic', desc: 'two generated dashboards, one edited (title/group/order/visibility), a card added, a row added',
    base: "dynSectionGenerate(['tune','verify'], false); dynSectionGenerate([], true); DYNAMIC_SECTIONS[0].rows.push({id:'row-a',seq:1,label:'Row A',var:null,source:DYNAMIC_SECTIONS[0].id,format:'TEXT',defaultValue:'hello'});",
    edit: "const d=DYNAMIC_SECTIONS[0], s=sectionById(d.id); d.title='Renamed board'; s.label='🗂️ Renamed board'; d.order=77; s.groupSeq=77; d.visible=false; d.description='edited'; d.menuGroup='verify'; s.group='verify'; d.cards[0].CARD_ENABLED=false; d.cards[0].CARD_NAME_VALUE='My card'; d.cards[1].CARD_KEY1_LABEL='lbl'; d.cards.push(Object.assign({}, d.cards[0], {CARD_ID:'card-new', CARD_NAME_VALUE:'New card', CARD_ENABLED:true})); d.rows[0].label='Row A2'; d.rows[0].defaultValue='bye'; d.rows.push({id:'row-b',seq:2,label:'Row B',var:null,source:d.id,format:'INT',defaultValue:'12'});" },
  { id: 'xl-personas', desc: 'new persona with a guided sequence (one empty step), per-persona order overrides, default persona moved',
    base: '', edit: "PERSONAS.push({id:'probe',label:'Probe persona',protected:false,order:9,compactNav:true,seq:{on:true,steps:[{label:'First',sections:['home','io']},{label:'Empty',sections:[]},{label:'Third',sections:['params']}]}}); PERSONA_SECTIONS.probe=['home','io','params']; PERSONA_SECTION_ORDER.builder={home:5,io:9}; PERSONA_SECTION_ORDER.probe={params:1}; PERSONAS.forEach(function(p){ delete p.default; }); PERSONAS.find(function(p){return p.id==='probe';}).default=true; PERSONA_SECTIONS.builder=PERSONA_SECTIONS.builder.filter(function(x){return x!=='io';});" },
  { id: 'xl-groups', desc: 'new group with colour and description, sections reassigned with tag/MVP changes',
    base: '', edit: "GROUPS.push({id:'custom',label:'Custom',order:200,description:'My group'}); GROUP_COLORS.custom='#123456'; GROUPS.find(function(g){return g.id==='frame';}).label='Frame (renamed)'; GROUP_COLORS.frame='#abcdef'; var p=sectionById('params'); p.group='custom'; p.groupSeq=3; p.tag='drives,shapes'; p.mvp=true; delete sectionById('home').tag; delete sectionById('engagement-context').mvp;" },
  { id: 'xl-deps', desc: 'dependency edges edited: one flipped to soft, one added, one removed, a description changed',
    base: '', edit: "SECTION_DEPS.params.financial='I'; SECTION_DEPS.home={params:'I'}; SECTION_DEPS_DESC.home='A new source-level note'; delete SECTION_DEPS['engage'];" },
  { id: 'xl-lifecycle', desc: 'status weights and posture edited, lifecycle position moved, skill map and TO-BE location split edited',
    base: '', edit: "STATUS_LIFECYCLE[0].weights.V1=1.7; STATUS_LIFECYCLE[1].autoPosture=0.9; lifecycleUse=true; lifecyclePos=60; SKILL_MAP.Dev='Arch/Design'; tobeLocSplit=null; ensureLocSplit(); tobeLocSplit['Dev']={France:10,Portugal:20,Poland:0,Morocco:0,Egypt:0,China:0,India:70};" },
  { id: 'xl-reg', desc: 'MED profile with one regulatory artefact deselected and edited, reg toggles changed, forced ceiling',
    base: '', edit: "setRegUse(true); document.getElementById('industry').value='MED'; onIndustryChangedReg(); readInputs(); selectedRegArtefacts.delete('R039'); var r=REG_CATALOG.artifacts.find(function(a){return a.id==='R040';}); r.agentSup=70; r.humanSup=30; r.effort=9; r.seq=4; regInclude=false; forceGlassCeiling=true; document.getElementById('glassCeiling').value='33'; readInputs();" },
  { id: 'xl-misc', desc: 'customer, rates, quality, tokens, location targets, pinned team, contradictory phase scope, new/duplicate pins',
    base: '', edit: "CUSTOMER_NAME='ACME & Sons'; RATE.France.A=401; RATE.India.F=777; QUALITY[0][1]=3.5; TOKEN_MODELS[1].mix=45; TOKEN_MODELS[2].priceIn=4; TOK_OUT_SHARE=42; ensureTargetLoc(); targetLocPct.France=30; targetLocPct.India=70; teamIn=[{pins:['A017','R001'],skill:'Dev',grade:'B2',loc:'France',etp:6.5},{pins:['A017','A018'],skill:'Test/QA',grade:'B1',loc:'India',etp:3.5}]; phaseOff.add('V3'); selectedArtefacts.add('A013'); readInputs();" },
];
