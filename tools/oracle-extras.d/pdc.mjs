// Legacy figures of the present / defend / configure sections (commercial, monthly-playback, story-summary, assumptions,
// duediligence, verif, board, personas), recorded per fixture into app/fixtures/extras/pdc_*/<fixture>.json.
export const EXTRAS = {
  pdc_commercial: `(()=>{
    const sel = document.getElementById('cmModel'), keep = sel.value, out = {}, codes = ['ET','AAH','AGS','GS'];
    try { codes.forEach(c => { sel.value = c; readInputs(); renderCommercial(); const h = document.getElementById('cmHost');
      out[c] = { rows: [...h.querySelectorAll('tbody tr')].map(r => [...r.children].map(x => x.textContent.trim())), text: h.textContent.replace(/\\s+/g,' ').trim() }; }); }
    finally { sel.value = keep; readInputs(); renderCommercial(); }
    const m = model();
    return { out, rev: Object.fromEntries(codes.map(c => [c, commercialRevenue(c, m)])), rec: cmRecommend(m), tier: cmTierSplit(), avail: codes.map(cmAvailable) };
  })()`,
  pdc_playback: 'getMonthlySeries()',
  pdc_story: `(()=>{ renderStorySummary(); const h = document.getElementById('storySummaryHost');
    return { text: h.textContent.replace(/\\s+/g,' ').trim(), rows: [...h.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim())), lead: h.querySelector('p').textContent }; })()`,
  pdc_assump: `(()=>{ renderAssumptRegister(); const h = document.getElementById('assumptHost');
    return { text: h.textContent.replace(/\\s+/g,' ').trim(), rows: [...h.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent.trim())),
      defaults: INPUTS_DEFAULTS, ok: ASSUMPT_OK }; })()`,
  pdc_dd: `(()=>{ renderDueDiligence(); const h = document.getElementById('ddHost'), val = s => s ? (s.match(/value="([^"]*)"/) || [])[1] : null;
    const all = ddCollectRows();
    return { rows: all.map(r => ({ id: r.id, g: r.g, l: r.l, v: r.v, where: r.where, eff: r.eff, edit: r.edit, cls: r.cls, share: r.ceilShare, role: r.ceilRole, ok: !!r.ok,
        ed: r.ed ? [val(r.ed.a), r.ed.t ? val(r.ed.t) : null] : null, use: ddUse(r), useText: ddUseText(r), editText: ddEditText(r) })),
      cover: ddCeilingCoverage(all), ceilRows: ddCeilingRows().map(r => r.id),
      tr: [...h.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent.trim())), top: h.textContent.split('Used in')[0].replace(/\\s+/g,' ').trim() }; })()`,
  pdc_ddsens: `(()=>{ const keep = DD_SENS; try { ddComputeSensitivity(); const h = document.getElementById('ddHost');
    return JSON.parse(JSON.stringify({ base: DD_SENS.base, w: DD_SENS.w, unmeasurable: DD_SENS.unmeasurable, top: h.textContent.split('Used in')[0].replace(/\\s+/g,' ').trim(),
      tr: [...h.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent.trim())) })); } finally { DD_SENS = keep; } })()`,
  pdc_verif: `(()=>{ renderVerif(); renderConvChecks();
    const rows = id => [...document.querySelectorAll('#'+id+' tr')].map(r => [...r.children].map(c => c.textContent.trim()));
    const txt = id => document.getElementById(id).textContent.replace(/\\s+/g,' ').trim();
    return { checks: rows('verifChecks'), chain: rows('verifChain'), sensi: rows('verifSensi'), prov: rows('provenanceHost'), provText: txt('provenanceHost'), conv: rows('convChecksHost') }; })()`,
  pdc_board: `(()=>({ dyn: JSON.parse(JSON.stringify(DYNAMIC_SECTIONS)) }))()`,
  pdc_personas: `(()=>{ renderPersonas(); return { personas: JSON.parse(JSON.stringify(PERSONAS)), sections: JSON.parse(JSON.stringify(PERSONA_SECTIONS)),
    table: [...document.querySelectorAll('#pmPersonaTable tr')].map(r => [...r.children].map(c => c.textContent.trim())) }; })()`,
};
