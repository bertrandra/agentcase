// refshare: section dependency statistics and the build-order proposal, as the legacy page computes them.
export const EXTRAS = {
  depsStats: `(function(){
    var live={}; SECTION_CATALOG.forEach(function(s){ live[s.id]=1; });
    var edges=0; Object.keys(SECTION_DEPS).forEach(function(s){ if(live[s]) edges+=Object.keys(SECTION_DEPS[s]).length; });
    var part={}; Object.keys(SECTION_DEPS).forEach(function(src){ if(!live[src]) return;
      if(Object.keys(SECTION_DEPS[src]).length) part[src]=1; Object.keys(SECTION_DEPS[src]).forEach(function(t){ if(live[t]) part[t]=1; }); });
    return { edges: edges, sources: depSourceIds(), participating: Object.keys(part).sort(),
      incoming: SECTION_CATALOG.map(function(s){ return [s.id, depIncomingCount(s.id)]; }),
      mismatch: SECTION_CATALOG.filter(function(s){ return depTagMismatch(s); }).map(function(s){ return s.id; }) };
  })()`,
  depTree: `(function(){ var t=depTreeCompute();
    return { gOrder:t.gOrder, gLayer:t.gLayer, newGroupOrder:t.newGroupOrder, depth:t.depth, newSeq:t.newSeq,
      gBroken:t.gBroken.map(function(e){ return e.join('>'); }), gEdges:t.gEdges.map(function(e){ return e.join('>'); }) }; })()`,
  catalogue: `({ sections: SECTION_CATALOG.map(function(s){ return [s.id, s.group, s.groupSeq, s.tag||'']; }),
    groups: GROUPS.map(function(g){ return [g.id, g.order]; }) })`,
};
