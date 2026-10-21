import { REG_ARTEFACTS } from '@/domain';
import { CROSS_CATEGORIES, CROSS_CODES, crossOn, normArtefacts, normKey, normsOf, type TrackActual } from '@/domain/frame';
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
    let x = parseFloat(p.value); if (isNaN(x)) x = 0.08;
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

// ---- Industry / regulatory profile ---------------------------------------------------------------------------------------
const off = (d: Doc) => new Set(d.phaseOff ?? []);
const add = (arr: string[], v: string) => { if (!arr.includes(v)) arr.push(v); };
const del = (arr: string[], v: string) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

/** Tick/untick a norm and its artefacts (artefacts of a switched-off phase are not added). */
function setNorm(d: Doc, code: string, name: string, on: boolean): void {
  const gated = off(d);
  if (on) add(d.selectedNorms, normKey(code, name)); else del(d.selectedNorms, normKey(code, name));
  for (const a of normArtefacts(code, name)) { if (on) { if (!gated.has(a.phase)) add(d.selectedRegArtefacts, a.id); } else del(d.selectedRegArtefacts, a.id); }
}
/** Industry norms are cleared when the industry changes; cross-cutting selections survive. */
function clearIndustryNorms(d: Doc): void {
  d.selectedNorms = d.selectedNorms.filter((k) => CROSS_CODES.includes(k.split(':')[0] as string));
  const keep = new Set(d.selectedRegArtefacts);
  d.selectedRegArtefacts = REG_ARTEFACTS.filter((a) => keep.has(a.id) && CROSS_CODES.includes(a.industry as string)).map((a) => a.id);
}
/** The industry is a shortcut: with the catalogue on, picking it pre-checks all its norms. */
function applyIndustry(d: Doc): void {
  clearIndustryNorms(d);
  const code = d.dom.values.industry ?? '';
  if (d.regUse && code && code !== 'NONE' && !CROSS_CODES.includes(code)) normsOf(code).forEach((n) => setNorm(d, code, n.name, true));
}
/** Keep the category checkboxes in step with the ticked norms. The legacy does NOT re-fit the potential here (only scope edits do), so neither do we. */
function finish(d: Doc): void {
  CROSS_CATEGORIES.forEach((x) => { d.dom.checked[x.checkId] = crossOn(d.selectedNorms, x.code); });
}

const setRegUseCmd = defineCommand<{ on: boolean }>({
  type: 'frame.setRegUse', label: (p) => `${p.on ? 'Use' : 'Stop using'} the regulatory catalogue`,
  run(d, p) { d.regUse = p.on; d.dom.checked.regUse = p.on; if (p.on) applyIndustry(d); else clearIndustryNorms(d); finish(d); },
});
const setIndustryCmd = defineCommand<{ code: string }>({
  type: 'frame.setIndustry', label: (p) => `Select the industry profile ${p.code}`,
  run(d, p) { d.dom.values.industry = p.code; applyIndustry(d); finish(d); },
});
const toggleNormCmd = defineCommand<{ code: string; name: string; on: boolean }>({
  type: 'frame.toggleNorm', label: (p) => `${p.on ? 'Add' : 'Remove'} the norm ${p.name}`,
  run(d, p) { setNorm(d, p.code, p.name, p.on); finish(d); },
});
const toggleCrossCmd = defineCommand<{ code: string; on: boolean }>({
  type: 'frame.toggleCross', label: (p) => `${p.on ? 'Add' : 'Remove'} the cross-cutting category ${p.code}`,
  run(d, p) { normsOf(p.code).forEach((n) => setNorm(d, p.code, n.name, p.on)); finish(d); },
});
const setRegIncludeCmd = defineCommand<{ on: boolean }>({
  type: 'frame.setRegInclude', label: (p) => `${p.on ? 'Include' : 'Exclude'} regulatory artefacts in effort and runs`,
  run(d, p) { d.regInclude = p.on; d.dom.checked.regInclude = p.on; },
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
