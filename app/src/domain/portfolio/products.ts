/** @calc-zone product-resolution */
import type { TeamRow } from '../types/state';
import { dropProductShares } from './sharedTeam';
import { productOwner, productTeam, withProductOwner, withProductRows, withoutProductRows } from './teamAccess';
import type { KnowledgeSubset, Portfolio, Product } from './types';

/** Spec F1: a portfolio holds 1 to 50 products. */
export const MAX_PRODUCTS = 50;

/** An object without its undefined properties (a cleared optional field leaves no key, so documents compare and serialise alike). */
export const clean = <O extends object>(o: O): O => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as O;

const mapProduct = <T extends Portfolio>(pf: T, id: string, f: (p: Product) => Product): T =>
  pf.products.some((p) => p.id === id) ? { ...pf, products: pf.products.map((p) => (p.id === id ? clean(f(p)) : p)) } : pf;

const whole = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

/** Insert `id` into a wave's list (after `after` when given), removing it from any other wave first (one wave per product, D-M1). */
function place<T extends Portfolio>(pf: T, id: string, waveId: string | null, after?: string): T {
  const waves = pf.waves.map((w) => {
    const rest = w.productIds.filter((x) => x !== id);
    if (w.id !== waveId) return rest.length === w.productIds.length ? w : { ...w, productIds: rest };
    const at = after === undefined ? -1 : rest.indexOf(after);
    return { ...w, productIds: at < 0 ? [...rest, id] : [...rest.slice(0, at + 1), id, ...rest.slice(at + 1)] };
  });
  const known = waveId !== null && pf.waves.some((w) => w.id === waveId);
  return { ...pf, waves, products: pf.products.map((p) => (p.id === id ? { ...p, waveId: known ? waveId : null } : p)) };
}

/**
 * A new product inherits the common values (no overrides, no knowledge subset) and has its own entry team (a team appended to the organisation part
 * of the common document, schema v5). Refused beyond 50 products or on a duplicate id.
 */
export function addProduct<T extends Portfolio>(pf: T, o: { id: string; name: string; teamIn: TeamRow[]; waveId?: string | null }): T {
  if (pf.products.length >= MAX_PRODUCTS || pf.products.some((p) => p.id === o.id)) return pf;
  const prod: Product = { id: o.id, name: o.name, knowledge: {}, overrides: {}, waveId: null, offsetMonths: 0 };
  return place(withProductRows({ ...pf, products: [...pf.products, prod] }, o.id, o.teamIn, o.name), o.id, o.waveId ?? null);
}

/** Rename a product (its team's name follows: "‹name› delivery team"). */
export function renameProduct<T extends Portfolio>(pf: T, id: string, name: string): T {
  const n = name.trim(), out = n ? mapProduct(pf, id, (p) => ({ ...p, name: n })) : pf;
  return out === pf ? pf : withProductRows(out, id, productTeam(out, id), n);
}
export const setProductNote = <T extends Portfolio>(pf: T, id: string, note: string): T => mapProduct(pf, id, (p) => ({ ...p, note: note || undefined }));
export const archiveProduct = <T extends Portfolio>(pf: T, id: string, archived: boolean): T => mapProduct(pf, id,
  (p) => ({ ...p, archived: archived || undefined }));
export const setProductOffset = <T extends Portfolio>(pf: T, id: string, months: number): T => mapProduct(pf, id,
  (p) => ({ ...p, offsetMonths: whole(months) }));

/** F3: the copy takes the team (and owning unit), the overrides and the knowledge subset, and joins the source's wave right after it. */
export function duplicateProduct<T extends Portfolio>(pf: T, id: string, copyId: string, name?: string): T {
  const src = pf.products.find((p) => p.id === id);
  if (!src || pf.products.length >= MAX_PRODUCTS || pf.products.some((p) => p.id === copyId)) return pf;
  const copy: Product = clean({ ...structuredClone(src), id: copyId, name: name?.trim() || `${src.name} (copy)`, archived: undefined, waveId: null });
  const i = pf.products.indexOf(src), owner = productOwner(pf, id);
  let out = withProductRows({ ...pf, products: [...pf.products.slice(0, i + 1), copy, ...pf.products.slice(i + 1)] }, copyId,
    structuredClone(productTeam(pf, id)), copy.name);
  if (owner) out = withProductOwner(out, copyId, owner);
  return place(out, copyId, src.waveId, id);
}

/**
 * Removing a product also leaves its wave, drops its shares of the shared team lines and its team (one undoable step); the active product moves to a
 * neighbour. The last product cannot be removed.
 */
export function removeProduct<T extends Portfolio>(pf: T, id: string): T {
  const i = pf.products.findIndex((p) => p.id === id);
  if (i < 0 || pf.products.length < 2) return pf;
  const products = pf.products.filter((p) => p.id !== id);
  const active = pf.activeProductId === id ? (products[Math.min(i, products.length - 1)] as Product).id : pf.activeProductId;
  return withoutProductRows(dropProductShares({ ...pf, products, activeProductId: active,
    waves: pf.waves.map((w) => (w.productIds.includes(id) ? { ...w, productIds: w.productIds.filter((x) => x !== id) } : w)) }, id), id);
}

/** Set (or, for `clear`ed fields, drop) fields of the product's knowledge subset; an absent field is inherited from the common hub. */
export function setKnowledge<T extends Portfolio>(pf: T, id: string, patch: KnowledgeSubset, clear: (keyof KnowledgeSubset)[] = []): T {
  return mapProduct(pf, id, (p) => {
    const k: KnowledgeSubset = { ...p.knowledge, ...patch };
    for (const f of clear) delete k[f];
    return { ...p, knowledge: k };
  });
}

export const setActive = <T extends Portfolio>(pf: T, id: string): T => (pf.products.some((p) => p.id === id) ? { ...pf, activeProductId: id } : pf);
export { place as placeProduct };
