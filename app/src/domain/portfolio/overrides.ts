/** @calc-zone product-resolution */
import { parseRef, type ParsedRef } from './keys';
import type { CommonCase, Overrides, Portfolio, Product } from './types';

type Bag = Record<string, unknown>;

function ref(r: string): ParsedRef {
  const p = parseRef(r);
  if (!p) throw new Error(`override: "${r}" is not an overridable key`);
  return p;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => k in b && deepEqual((a as Bag)[k], (b as Bag)[k]));
}

/** The common value at an address (undefined when the common case does not store that field). */
export function commonValue(common: CommonCase, r: string): unknown {
  const p = ref(r);
  return p.kind === 'top' ? common[p.key] : (common.dom[p.kind] as Bag | undefined)?.[p.id];
}

/** The product's own value at an address, undefined when it inherits. */
export function overrideValue(o: Overrides, r: string): unknown {
  const p = ref(r);
  return p.kind === 'top' ? o[p.key] : (o.dom?.[p.kind] as Bag | undefined)?.[p.id];
}

export const isOverridden = (prod: Product, r: string): boolean => overrideValue(prod.overrides, r) !== undefined;

/** Pure write of one override (`undefined` clears it); empty containers are dropped, untouched branches are shared. */
function writeOverride(o: Overrides, r: string, value: unknown): Overrides {
  const p = ref(r), out: Bag = { ...o };
  if (p.kind === 'top') {
    if (value === undefined) delete out[p.key]; else out[p.key] = value;
    return out as Overrides;
  }
  const dom: Bag = { ...o.dom }, bag: Bag = { ...(o.dom?.[p.kind] as Bag | undefined) };
  if (value === undefined) delete bag[p.id]; else bag[p.id] = value;
  if (Object.keys(bag).length) dom[p.kind] = bag; else delete dom[p.kind];
  if (Object.keys(dom).length) out.dom = dom; else delete out.dom;
  return out as Overrides;
}

function writeCommon(c: CommonCase, r: string, value: unknown): CommonCase {
  const p = ref(r);
  if (p.kind === 'top') return { ...c, [p.key]: value };
  return { ...c, dom: { ...c.dom, [p.kind]: { ...c.dom[p.kind], [p.id]: value } } };
}

const mapProduct = (pf: Portfolio, id: string, f: (p: Product) => Product): Portfolio => {
  if (!pf.products.some((x) => x.id === id)) throw new Error(`unknown product ${id}`);
  return { ...pf, products: pf.products.map((x) => (x.id === id ? f(x) : x)) };
};

/** The product takes its own value for a key. */
export const setOverride = (pf: Portfolio, productId: string, r: string, value: unknown): Portfolio =>
  mapProduct(pf, productId, (x) => ({ ...x, overrides: writeOverride(x.overrides, r, value) }));

/** "Back to common": the product inherits the key again. */
export const clearOverride = (pf: Portfolio, productId: string, r: string): Portfolio =>
  mapProduct(pf, productId, (x) => (isOverridden(x, r) ? { ...x, overrides: writeOverride(x.overrides, r, undefined) } : x));

/** Edit a common value: the products that inherit follow, those that override do not move. */
export const setCommon = (pf: Portfolio, r: string, value: unknown): Portfolio => ({ ...pf, common: writeCommon(pf.common, r, value) });

/** "Apply to all products": the product's value becomes the common one, and every override now identical to it is dropped. */
export function applyToCommon(pf: Portfolio, productId: string, r: string): Portfolio {
  const prod = pf.products.find((x) => x.id === productId);
  const value = prod ? overrideValue(prod.overrides, r) : undefined;
  if (value === undefined) throw new Error(`applyToCommon: product ${productId} does not override ${r}`);
  const products = pf.products.map((x) => (deepEqual(overrideValue(x.overrides, r), value) ? { ...x,
    overrides: writeOverride(x.overrides, r, undefined) } : x));
  return { ...pf, common: writeCommon(pf.common, r, value), products };
}
