// Extra fixture cases for the navigation: custom groups, per-persona orders and guided sequences.
// (No fixture holds a dynamic section — the Board's tests assume none; the nav extras add one transiently, see oracle-extras.d/nav.mjs.)
const clientcase = "PERSONAS.find(function(p){ return p.id==='clientcase'; })";
export const RECIPES = [
  { id: 'nav-custom-group', desc: 'a new menu group with two relocated sections, one group moved first, one persona with an empty group',
    code: "GROUPS.push({id:'compliance',label:'🛡️ Compliance',order:55,description:'Custom'}); GROUP_COLORS.compliance='#123456';"
      + "sectionById('risk').group='compliance'; sectionById('risk').groupSeq=20; sectionById('assumptions').group='compliance'; sectionById('assumptions').groupSeq=10;"
      + "GROUPS.find(function(g){ return g.id==='verdict'; }).order=5;" },
  { id: 'nav-persona-order', desc: 'builder in reverse order, partial override for clientcase, tabs style, hide-menu on clientcase',
    code: "PERSONA_SECTION_ORDER.builder={}; PERSONA_SECTIONS.builder.forEach(function(id,i){ PERSONA_SECTION_ORDER.builder[id]=1000-i; });"
      + "PERSONA_SECTION_ORDER.clientcase={}; PERSONA_SECTION_ORDER.clientcase[PERSONA_SECTIONS.clientcase[PERSONA_SECTIONS.clientcase.length-1]]=-5;"
      + clientcase + ".compactNav=true; SECTION_NAV_STYLE='tabs';" },
  { id: 'nav-guided-seq', desc: 'a two-step guided sequence on clientcase and a disabled one on admin',
    code: "var l=PERSONA_SECTIONS.clientcase.filter(function(x){ return x!=='home'; });"
      + clientcase + ".seq={on:true,steps:[{label:'1 · Look',sections:l.slice(0,3)},{label:'2 · Decide',sections:l.slice(3,6)}]};"
      + "PERSONAS.find(function(p){ return p.id==='admin'; }).seq={on:false,steps:[{label:'Off',sections:['home']}]};" },
];
