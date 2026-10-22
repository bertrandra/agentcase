/** @calc-zone knowledge-hub */
import type { CaseState } from '../types/state';
import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, type CommonCase, type Product } from './types';
import { subsetKeys, type DomPatch } from './subset';

const DEFAULT_INFRA = 2500;

/** The common hub infrastructure (khInfraMonthly) as the knowledge module reads it: 2500 when absent or not a number. */
export function commonInfra(common: CommonCase): number {
  const v = parseFloat(common.dom?.values?.khInfraMonthly ?? '');
  return Number.isNaN(v) ? DEFAULT_INFRA : v;
}

const without = <T>(src: Record<string, T> | undefined): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const id of Object.keys(src ?? {})) if (!FORBIDDEN_DOM_IDS.includes(id)) out[id] = (src as Record<string, T>)[id] as T;
  return out;
};

/**
 * Layers, last wins: common < hub (activation, infrastructure share) < whitelisted overrides < the product's knowledge subset < its team.
 * Shallow at the key; `dom` is merged field by field. A layer that equals the common reading is not written, so a product that
 * overrides nothing keeps the common `dom` object itself (and a single-product round trip is lossless).
 */
export function mergeCase(common: CommonCase, product: Product, hubEnabled: boolean, infraMonthly: number): CaseState {
  const o = product.overrides, k = subsetKeys(product.knowledge);
  const patch: DomPatch = { values: {}, checked: {} };
  if (hubEnabled !== !!common.dom?.checked?.khEnabled) patch.checked.khEnabled = hubEnabled;
  if (infraMonthly !== commonInfra(common)) patch.values.khInfraMonthly = String(infraMonthly);
  Object.assign(patch.values, without(o.dom?.values), k.values);
  Object.assign(patch.checked, without(o.dom?.checked), k.checked);
  const top: Partial<CommonCase> = {};
  for (const key of OVERRIDABLE_KEYS) if (o[key] !== undefined) Object.assign(top, { [key]: o[key] });
  const touched = Object.keys(patch.values).length + Object.keys(patch.checked).length > 0;
  const dom = touched ? { values: { ...common.dom.values, ...patch.values }, checked: { ...common.dom.checked, ...patch.checked } } : common.dom;
  return { ...common, ...top, dom, teamIn: product.teamIn };
}
