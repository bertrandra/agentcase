/** @calc-zone knowledge-hub */
import { caseValues, programmeValuesOf, withProgrammeValues } from '../process/storedValues';
import { isCarrier } from '../org/orgExt';
import { isProgrammeKey } from '../programme/storedKeys';
import type { CaseState } from '../types/state';
import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, type CommonCase, type Product } from './types';
import { subsetKeys, type DomPatch } from './subset';

const DEFAULT_INFRA = 2500;

/** The common hub infrastructure (khInfraMonthly) as the knowledge module reads it: 2500 when absent or not a number. */
export function commonInfra(common: CommonCase): number {
  const v = parseFloat(caseValues(common).khInfraMonthly ?? '');
  return Number.isNaN(v) ? DEFAULT_INFRA : v;
}

const without = <T>(src: Record<string, T> | undefined): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const id of Object.keys(src ?? {})) if (!FORBIDDEN_DOM_IDS.includes(id)) out[id] = (src as Record<string, T>)[id] as T;
  return out;
};

/**
 * Layers, last wins: common < hub (activation, infrastructure share) < whitelisted overrides < the product's knowledge subset < its team
 * (`team`: its effective entry team, read from the common document's organisation part; `common`: the common values the case runs on,
 * `processCommon` — its document without the stored teams).
 * Shallow at the key; `dom` is merged field by field. A layer that equals the common reading is not written, so a product that
 * overrides nothing keeps the common `dom` object itself (and a single-product round trip is lossless).
 */
export function mergeCase(common: CommonCase, product: Pick<Product, 'overrides' | 'knowledge'>, team: CaseState['teamIn'], hubEnabled: boolean,
  infraMonthly: number): CaseState {
  const o = product.overrides, k = subsetKeys(product.knowledge);
  const patch: DomPatch = { values: {}, checked: {} };
  if (hubEnabled !== !!common.dom?.checked?.khEnabled) patch.checked.khEnabled = hubEnabled;
  if (infraMonthly !== commonInfra(common)) patch.values.khInfraMonthly = String(infraMonthly);
  Object.assign(patch.values, without(o.dom?.values), k.values);
  Object.assign(patch.checked, without(o.dom?.checked), k.checked);
  const top: Partial<CommonCase> = {};
  for (const key of OVERRIDABLE_KEYS) if (o[key] !== undefined) Object.assign(top, { [key]: o[key] });
  // schema v4: a product with its own process document reads the COMMON document's programme values (its own document keeps none)
  const stored = o.BPMN !== undefined ? programmeValuesOf(common.BPMN) : {};
  const touched = Object.keys(patch.values).length + Object.keys(patch.checked).length + Object.keys(stored).length > 0;
  const dom = touched ? { values: { ...stored, ...common.dom.values, ...patch.values }, checked: { ...common.dom.checked, ...patch.checked } } : common.dom;
  return { ...common, ...top, dom, teamIn: team };
}

/**
 * The common values with these form values written (schema v4, BPMN B9c): a programme value goes into the common document (`ac:programmeValues`),
 * any other into `dom.values`. Unchanged parts keep their identity.
 */
export function withCommonValues<T extends CommonCase>(common: T, values: Readonly<Record<string, string | undefined>>): T {
  const prog: Record<string, string | null> = {}, form: Record<string, string> = { ...common.dom.values };
  let formChanged = false;
  for (const [k, v] of Object.entries(values)) {
    // a test object without a process document keeps form values
    if (isProgrammeKey(k) && common.BPMN?.root && !isCarrier(common.BPMN)) { prog[k] = v ?? null; continue; }
    formChanged = true;
    if (v === undefined) delete form[k]; else form[k] = v;
  }
  const BPMN = Object.keys(prog).length ? withProgrammeValues(common.BPMN, prog) : common.BPMN;
  if (!formChanged && BPMN === common.BPMN) return common;
  return { ...common, BPMN, ...(formChanged ? { dom: { ...common.dom, values: form } } : {}) };
}
