/** @calc-zone knowledge-hub */
import type { CommonCase, KnowledgeSubset } from './types';

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

export type SubsetField = keyof KnowledgeSubset;

/** What a product inherits for a subset field: the common reading (undefined for the fields the common case does not hold: domains, preparation). */
export function commonSubsetValue(common: CommonCase, f: SubsetField): unknown {
  const v = common.dom.values, c = common.dom.checked;
  if (f === 'enabled') return !!c.khEnabled;
  if (f === 'maturityAnswers') return Array.from({ length: 9 }, (_, i) => v['khA' + i]).join(' · ');
  if (f === 'targetCC') return 'CC' + v.khTargetCC;
  if (f === 'curationFTE') return v.khCurationFTE;
  if (f === 'setupBase') return v.khSetupBase;
  if (f === 'ktLeadMonths') return 0;
  return undefined;
}
