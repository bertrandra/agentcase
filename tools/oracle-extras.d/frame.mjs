// Legacy figures for the "frame" group sections (home, engagement-context, engage, transform-params).
export const EXTRAS = {
  frameIndustries: "getIndustries()",
  frameGlossaryCount: "SHARED_GLOSSARY.length",
  frameRegCeil: "computeRegGlassCeiling()",
  frameQuarters: "plannedQuarters()",
  frameEngageBand: "(renderEngage(), [...document.querySelectorAll('#engageSummary .sb-value')].map(e=>e.textContent))",
  frameRoadmap: "(renderEngage(), [...document.querySelectorAll('#roadmapHost > div > div')].map(e=>[...e.children].map(c=>c.textContent.replace(' \\u25c0 now','')).join('|')))",
  frameTrackStatus: "(TRACKER_OPEN=true, renderTracker(), [...document.querySelectorAll('#trackStatus .sb-value')].map(e=>e.textContent))",
  frameCtxSummary: "(updateCtxBadge(), document.getElementById('ctxSummary').textContent)",
  frameCrossOn: "['AI','SUSTAINABILITY','USABILITY'].map(crossOn)",
};
