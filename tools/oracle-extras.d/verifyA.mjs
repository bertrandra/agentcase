// Legacy "verify" views, first half (FTE/vFTE, team-out, TO-BE team, vFTE overview, agent directory / details / usage, phase details).
// vfa_dom renders the eight sections in the legacy page and reads back every table row and summary band, so the React views can be
// compared cell by cell (formatting included). The other extras record the underlying numbers for the domain functions.
const dom = `(()=>{
  const out = {};
  ['fte-vfte','team-out','tobe-team','vfte-ov','agent-dir','agent-detail','agent-usage','phase-art'].forEach(id => {
    try { TABRENDER[id](); } catch (e) { out[id] = { error: String(e) }; return; }
    const root = document.getElementById(id), txt = e => e.textContent.replace(/\\s+/g, ' ').trim();
    out[id] = {
      tables: [...root.querySelectorAll('table')].map(t => [...t.querySelectorAll('tr')].map(r => [...r.children].map(c => c.querySelector('select') ? '' : txt(c)))),
      bands: [...root.querySelectorAll('.sb-item')].map(e => [txt(e.children[0]), txt(e.children[1])]),
    };
  });
  return out;
})()`;
export const EXTRAS = {
  vfa_dom: dom,
  vfa_tobe: `(()=>{ const C = tobeComposition(2); return { rows: C.rows, tot: C.tot, years: C.years, skills: teamSkillList(), def: tobeSkillLocDefault(),
    rate: teamSkillList().map(s => [s, skillGradeRate(s, 'India'), skillGradeRate(s, 'France')]) }; })()`,
  vfa_target: `(()=>{ const t = targetTeam(); const o = {}; for (const k of Object.keys(t)) if (k !== 'm') o[k] = t[k]; o.tjm = locBlendedTJM('India'); o.tgt = targetBlendedTJM(); return o; })()`,
  vfa_maturity: `maturityInfo(model())`,
  vfa_loops: `({ internal: loopInternalTokenCost(), external: loopExternalReworkEffort(), dir: agentDirectoryForPhase('ALL').map(a => a.id), dirV3: agentDirectoryForPhase('V3').map(a => a.id),
    roles: rolesForPhase('ALL'), rolesV4: rolesForPhase('V4') })`,
  vfa_usage: `(()=>{ const e = tokenUsageEstimate(); return { totM: e.totM, y3: e.y3, inputM: e.inputM, outputM: e.outputM, runs: e.agentRuns, tpa: e.tpa, endL: e.endL }; })()`,
};
