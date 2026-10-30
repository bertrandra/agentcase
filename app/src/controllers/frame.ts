/** @calc-zone scope-automation */
import { REG_ARTEFACTS } from '@/domain';
import { DEFAULT_DISCOUNT_RATE } from '@/domain/economics/cashflow';
import { CROSS_CATEGORIES, CROSS_CODES, crossOn, normArtefacts, normKey, normsOf, type TrackActual } from '@/domain/frame';
import type { ScopeKeys } from '@/domain/process';
import { refitPotential } from '@/store/derive';
import { editScope, scopeNow } from '@/store/processEdit';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

// ---- Engagement context -------------------------------------------------------------------------------------------------
const setCustomerCmd = defineCommand<{ name: string }>({
  type: 'frame.setCustomerName', label: () => 'Set the customer name', coalesceKey: () => 'frame.setCustomerName',
  run(d, p) { d.customerName = p.name; d.dom.values.customerName = p.name; },
});
const setContextCmd = defineCommand<{ ctx: string }>({
  type: 'frame.setEngagementCtx', label: (p) => `Set the engagement context to ${p.ctx}`,
  run(d, p) { d.dom.values.engagementCtx = p.ctx; },
});
const setDiscountCmd = defineCommand<{ value: string }>({
  type: 'frame.setCaseDiscountRate', label: (p) => `Set the case discount rate to ${p.value}`, coalesceKey: () => 'frame.setCaseDiscountRate',
  run(d, p) {
    let x = parseFloat(p.value); if (isNaN(x)) x = DEFAULT_DISCOUNT_RATE;
    d.MODEL.CASE = { ...(d.MODEL.CASE ?? {}), discountRate: Math.min(1, Math.max(0, x)) };
    d.dom.values.caseDiscountRate = p.value;
  },
});
const setCoefCmd = defineCommand<{ ctx: string; field: string; value: number }>({
  type: 'frame.setEngageCoef', label: (p) => `Set ${p.field} of ${p.ctx} to ${p.value}`, coalesceKey: (p) => `frame.setEngageCoef:${p.ctx}:${p.field}`,
  run(d, p) { const row = d.engageCoef[p.ctx]; if (row && !isNaN(p.value)) (row as unknown as Record<string, number>)[p.field] = p.value; },
});

// ---- Engage: tracker ----------------------------------------------------------------------------------------------------
const setTrackCmd = defineCommand<{ q: string; field: keyof TrackActual; value: number | null }>({
  type: 'frame.setTrackActual', label: (p) => `Record ${p.field} actual for ${p.q.toUpperCase()}`, coalesceKey: (p) => `frame.setTrackActual:${p.q}:${p.field}`,
  run(d, p) {
    const all = (d.trackActuals ??= {}) as Record<string, TrackActual>;
    (all[p.q] ??= { ad: null, fte: null, sav: null })[p.field] = p.value;
  },
});

// ---- Industry / regulatory profile (the scope keys of the case's process document: `editScope`) ------------------------------
const add = (arr: string[], v: string) => { if (!arr.includes(v)) arr.push(v); };
const del = (arr: string[], v: string) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

/** Tick/untick a norm and its artefacts (artefacts of a switched-off phase are not added). */
function setNorm(k: ScopeKeys, code: string, name: string, on: boolean): void {
  const gated = new Set(k.phaseOff);
  if (on) add(k.selectedNorms, normKey(code, name)); else del(k.selectedNorms, normKey(code, name));
  for (const a of normArtefacts(code, name)) { if (on) { if (!gated.has(a.phase)) add(k.selectedRegArtefacts, a.id); } else del(k.selectedRegArtefacts, a.id); }
}
/** Industry norms are cleared when the industry changes; cross-cutting selections survive. */
function clearIndustryNorms(k: ScopeKeys): void {
  k.selectedNorms = k.selectedNorms.filter((x) => CROSS_CODES.includes(x.split(':')[0] as string));
  const keep = new Set(k.selectedRegArtefacts);
  k.selectedRegArtefacts = REG_ARTEFACTS.filter((a) => keep.has(a.id) && CROSS_CODES.includes(a.industry as string)).map((a) => a.id);
}
/** The industry is a shortcut: with the catalogue on, picking it pre-checks all its norms. */
function applyIndustry(d: Doc, k: ScopeKeys): void {
  clearIndustryNorms(k);
  const code = d.dom.values.industry ?? '';
  if (d.regUse && code && code !== 'NONE' && !CROSS_CODES.includes(code)) normsOf(code).forEach((n) => setNorm(k, code, n.name, true));
}
/** Keep the category checkboxes in step with the ticked norms and re-fit the potential to the changed scope (legacy v18.12). */
function finish(d: Doc): void {
  const norms = scopeNow(d).selectedNorms;
  CROSS_CATEGORIES.forEach((x) => { d.dom.checked[x.checkId] = crossOn(norms, x.code); });
  refitPotential(d);
}

const setRegUseCmd = defineCommand<{ on: boolean }>({
  type: 'frame.setRegUse', label: (p) => `${p.on ? 'Use' : 'Stop using'} the regulatory catalogue`,
  run(d, p) {
    d.regUse = p.on; d.dom.checked.regUse = p.on;
    editScope(d, (k) => { if (p.on) applyIndustry(d, k); else clearIndustryNorms(k); });
    finish(d);
  },
});
const setIndustryCmd = defineCommand<{ code: string }>({
  type: 'frame.setIndustry', label: (p) => `Select the industry profile ${p.code}`,
  run(d, p) { d.dom.values.industry = p.code; editScope(d, (k) => applyIndustry(d, k)); finish(d); },
});
const toggleNormCmd = defineCommand<{ code: string; name: string; on: boolean }>({
  type: 'frame.toggleNorm', label: (p) => `${p.on ? 'Add' : 'Remove'} the norm ${p.name}`,
  run(d, p) { editScope(d, (k) => setNorm(k, p.code, p.name, p.on)); finish(d); },
});
const toggleCrossCmd = defineCommand<{ code: string; on: boolean }>({
  type: 'frame.toggleCross', label: (p) => `${p.on ? 'Add' : 'Remove'} the cross-cutting category ${p.code}`,
  run(d, p) { editScope(d, (k) => normsOf(p.code).forEach((n) => setNorm(k, p.code, n.name, p.on))); finish(d); },
});
const setRegIncludeCmd = defineCommand<{ on: boolean }>({
  type: 'frame.setRegInclude', label: (p) => `${p.on ? 'Include' : 'Exclude'} regulatory artefacts in effort and runs`,
  run(d, p) { editScope(d, (k) => { k.regInclude = p.on; }); refitPotential(d); },   // the process only (B9a: no form copy)
});

export const setCustomerName = (name: string): void => appStore().dispatch(setCustomerCmd({ name }));
export const setEngagementCtx = (ctx: string): void => appStore().dispatch(setContextCmd({ ctx }));
export const setCaseDiscountRate = (value: string): void => appStore().dispatch(setDiscountCmd({ value }));
export const setEngageCoef = (ctx: string, field: string, value: number): void => appStore().dispatch(setCoefCmd({ ctx, field, value }));
export const setTrackActual = (q: string, field: keyof TrackActual, value: number | null): void => appStore().dispatch(setTrackCmd({ q, field, value }));
export const setRegUse = (on: boolean): void => appStore().dispatch(setRegUseCmd({ on }));
export const setIndustry = (code: string): void => appStore().dispatch(setIndustryCmd({ code }));
export const toggleNorm = (code: string, name: string, on: boolean): void => appStore().dispatch(toggleNormCmd({ code, name, on }));
export const toggleCross = (code: string, on: boolean): void => appStore().dispatch(toggleCrossCmd({ code, on }));
export const setRegInclude = (on: boolean): void => appStore().dispatch(setRegIncludeCmd({ on }));
