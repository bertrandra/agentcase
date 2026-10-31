/** @calc-zone product-resolution */
import type { Patch } from 'immer';
import { OVERRIDABLE_KEYS, deepEqual } from '@/domain/portfolio';
import type { Doc, PortfolioDoc } from '../types';
import { writeDomDiff } from './dom';
import { documentPatches, type ProcessChange } from './programme';
import { add, productPath, remove, type AddressCtx, type AddressScope } from './types';

const TOP = new Set<string>(OVERRIDABLE_KEYS);
const asBag = (o: unknown): Record<string, unknown> => o as Record<string, unknown>;

/** A change inside (or of) a whitelisted key: the product's override when it already has one or the scope is 'product', else the common value. */
function overridable(c: AddressCtx, p: Patch, key: string, rest: Patch['path']): void {
  if (c.scope === 'common') { c.out.push({ ...p, path: ['common', key, ...rest] }); return; }
  const own = asBag(c.prod.overrides)[key] !== undefined || c.made.has(key), whole = rest.length === 0 && p.op !== 'remove';
  const same = whole && deepEqual(asBag(c.pf.common)[key], p.value);
  const toProduct = own || (c.scope === 'product' && !same && !(p.op === 'remove' && rest.length === 0));
  if (!toProduct) { c.out.push({ ...p, path: ['common', key, ...rest] }); return; }
  if (p.op === 'remove' && rest.length === 0) { if (own) remove(c, productPath(c, 'overrides', key)); return; }
  if (!own) {
    const start = whole ? p.value : asBag(c.base)[key];
    add(c, productPath(c, 'overrides', key), start);
    c.made.add(key);
    if (whole) return;
  }
  c.out.push({ ...p, path: productPath(c, 'overrides', key, ...rest) });
}

/**
 * THE ADDRESS LAYER (spec 6.1). A case command ran on the active product's effective case and produced `patches` (relative to that case);
 * this maps each of them to the portfolio, so the caller applies them in ONE produce and history/undo/coalescing/remote behave as before:
 *  - `teamIn` -> the active product's team in the organisation part of the common document (schema v5; never another product's; the
 *    contributions of shared lines are left out) and `BPMN` -> the product's own process document or the common one (`documentPatches`);
 *  - a whitelisted key (spec 4.3) -> the product's override if it already has one or the scope is 'product', else the common value
 *    (scope 'common', "All products" in a Portfolio / Wave view: the command ran on the common case and always writes the common value);
 *  - a form field of `dom` -> knowledge subset / override / common by the same rules (`address/dom.ts`);
 *  - any other key (RATE, MODEL, COEF, PERSONAS, nav, snapshots, customerName, ...) -> the common values.
 */
export function addressPatches(pf: PortfolioDoc, base: Doc, next: Doc, patches: Patch[], scope: AddressScope): Patch[] {
  const ai = pf.products.findIndex((x) => x.id === pf.activeProductId);
  if (ai < 0) throw new Error(`address: unknown active product ${pf.activeProductId}`);
  const c: AddressCtx = { pf, base, next, ai, prod: pf.products[ai] as AddressCtx['prod'], scope, out: [], made: new Set() };
  let domDone = false, team = false, whole = false, process: ProcessChange = 'none';
  for (const p of patches) {
    const [key, ...rest] = p.path as [string, ...(string | number)[]];
    if (key === 'dom') { if (!domDone) { domDone = true; writeDomDiff(c); } continue; }
    if (key === 'teamIn') { team = true; continue; }
    if (key === 'BPMN') { whole ||= rest.length === 0; process = rest.length === 0 && p.op === 'remove' ? 'remove' : 'edit'; continue; }
    if (rest.length === 0 && p.op === 'replace' && deepEqual(asBag(base)[key], p.value)) continue;
    if (TOP.has(key)) overridable(c, p, key, rest); else c.out.push({ ...p, path: ['common', key, ...rest] });
  }
  documentPatches(c, process, whole, team && !deepEqual(base.teamIn, next.teamIn));
  return c.out;
}
