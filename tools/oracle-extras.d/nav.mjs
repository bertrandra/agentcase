// nav: what the legacy page shows in its sidebar, group bar and guided-sequence walk for every persona of the case.
// For each persona: the sidebar (renderPersonaNav → #sidebarNav: groups in order, their section buttons in order), the section it lands on
// (setPersona → goTab), its hide-menu flag, the in-content group bar of that landing section and the flattened guided sequence (wizFlatten).
export const EXTRAS = {
  nav: `(function(){
    var out={}, cur=currentPersona, prev=document.querySelector('.tab-content.active'), prevId=prev?prev.id:'home';
    var gid=function(label){ var g=GROUPS.find(function(x){ return x.label===label; }); return g?g.id:label; };
    PERSONAS.forEach(function(p){
      setPersona(p.id);
      var locked=currentPersona!==p.id;
      if(locked) renderPersonaNav(p.id);
      var groups=[].map.call(document.querySelectorAll('#sidebarNav .side-group'),function(g){
        return { group: gid(g.dataset.group), sections: [].map.call(g.querySelectorAll('button[data-tab]'),function(b){ return b.dataset.tab; }) }; });
      var act=document.querySelector('.tab-content.active'), landing=locked?'home':(act?act.id:'home');
      var bar=null;
      if(!locked && !document.body.classList.contains('wiz-active')){
        renderGroupNavBar(landing);
        var sel=document.querySelector('#groupNavBar select.gnav-select');
        var ids=[].map.call(document.querySelectorAll('#groupNavBar button.gnav-item:not([title="Welcome"]), #groupNavBar button.pm-subtab-btn'),function(b){
          var m=/goTab\\('([^']+)'\\)/.exec(b.getAttribute('onclick')||''); return m?m[1]:null; }).filter(Boolean);
        bar={ group: sel?sel.value:null, sections: ids, groups: sel?[].map.call(sel.options,function(o){ return o.value; }):[] };
      }
      var seq=locked?null:wizSeq(), flat=seq?wizFlatten(seq):null, first={};
      GROUPS.forEach(function(g){ first[g.id]=firstSectionOfGroup(g.id,p.id); });
      out[p.id]={ locked:locked, landing:landing, compact:!locked&&document.body.classList.contains('menu-hidden'), groups:groups, bar:bar, first:first,
        wiz: flat?flat.map(function(f){ return [f.si,f.step,f.sec]; }):null };
    });
    setPersona(cur); goTab(prevId);
    return { style: SECTION_NAV_STYLE, personas: out };
  })()`,
  // A dynamic section as the Board generates it (menuGroup tune, order 15, added to every persona list), added transiently: the sidebar of every persona with it.
  navDyn: `(function(){
    var out={}, id='dyn-groups-1', saved=JSON.stringify(PERSONA_SECTIONS);
    DYNAMIC_SECTIONS.push({id:id,title:'Dashboard — Tune',archetype:'GROUPS:tune',description:'t',menuGroup:'tune',order:15,visible:true,cards:[],rows:[]});
    reconcileDynamicSections(); Object.keys(PERSONA_SECTIONS).forEach(function(k){ PERSONA_SECTIONS[k].push(id); });
    var gid=function(label){ var g=GROUPS.find(function(x){ return x.label===label; }); return g?g.id:label; };
    PERSONAS.forEach(function(p){
      renderPersonaNav(p.id);
      out[p.id]=[].map.call(document.querySelectorAll('#sidebarNav .side-group'),function(g){
        return { group: gid(g.dataset.group), sections: [].map.call(g.querySelectorAll('button[data-tab]'),function(b){ return b.dataset.tab; }) }; });
    });
    DYNAMIC_SECTIONS.length=0; PERSONA_SECTIONS=JSON.parse(saved); reconcileDynamicSections();
    var host=document.getElementById(id); if(host) host.remove();
    renderPersonaNav(currentPersona);
    return out;
  })()`,
};
