import type { KnowledgeSubset } from './types';

export interface DomPatch { values: Record<string, string>; checked: Record<string, boolean> }

/** Knowledge subset -> the existing case keys the engine already reads (khEnabled, khA0..khA8, khTargetCC, khCurationFTE, khSetupBase). */
export function subsetKeys(k: KnowledgeSubset): DomPatch {
  const values: Record<string, string> = {}, checked: Record<string, boolean> = {};
  if (k.enabled !== undefined) checked.khEnabled = k.enabled;
  k.maturityAnswers?.forEach((n, i) => { if (i < 9) values['khA' + i] = String(n); });
  if (k.targetCC !== undefined) values.khTargetCC = String(k.targetCC);
  if (k.curationFTE !== undefined) values.khCurationFTE = String(k.curationFTE);
  if (k.setupBase !== undefined) values.khSetupBase = String(k.setupBase);
  return { values, checked };
}

/** Months the KT setup is prepared before the product's month 0 (0 when unset or invalid). */
export const ktLead = (k: KnowledgeSubset): number => (Number.isFinite(k.ktLeadMonths) ? Math.max(0, Math.floor(k.ktLeadMonths as number)) : 0);
