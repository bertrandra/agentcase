/** @calc-zone product-resolution */
import { khEnabled } from '../knowledge';
import type { CaseState } from '../types/state';
import { allocateCents, teamEtp } from './alloc';
import { mergeCase } from './layers';
import { ctxOf, memoChain } from './memo';
import type { Portfolio, Product } from './types';

const roots = new WeakMap<object, unknown>();

/** Merge memoised on the identities of common, overrides, team and knowledge (plus the two hub numbers): editing one product never rebuilds another. */
function resolveWith(p: Portfolio, prod: Product, infra: number): CaseState {
  return memoChain(roots, [p.common, prod.overrides, prod.teamIn, prod.knowledge], `${p.hub.enabled}|${infra}`, () => mergeCase(p.common, prod, p.hub.enabled, infra));
}

/** A product takes part in the hub allocation when it is planned, kept, and its resolved case really runs the hub (engagement context allowing). */
const usesHub = (p: Portfolio, prod: Product): boolean => !prod.archived && prod.waveId !== null && khEnabled(ctxOf(resolveWith(p, prod, p.hub.infraMonthly)));

/**
 * Monthly hub infrastructure carried by each product, aligned with `p.products`. `perProduct`: the full cost each (as in a single case).
 * `byBaseEtp`: shared in proportion to the entry headcount of the products that use the hub, the shares adding up to the cost to the cent;
 * a product that does not use the hub (unplanned, archived, hub off) is shown with the full cost, which its case ignores or only reads standalone.
 */
export function infraShares(p: Portfolio): number[] {
  const full = p.hub.infraMonthly;
  if (p.hub.infraAllocation !== 'byBaseEtp') return p.products.map(() => full);
  const users = p.products.filter((x) => usesHub(p, x));
  const shares = allocateCents(full, users.map((x) => teamEtp(x.teamIn)));
  return p.products.map((x) => { const i = users.indexOf(x); return i < 0 ? full : (shares[i] as number); });
}

/** The effective case of a product: a plain `CaseState`, so the whole existing domain works on it unchanged. Pure; memoised. */
export function resolveProduct(p: Portfolio, productId: string): CaseState {
  const i = p.products.findIndex((x) => x.id === productId);
  if (i < 0) throw new Error(`resolveProduct: unknown product ${productId}`);
  const prod = p.products[i] as Product;
  return resolveWith(p, prod, p.hub.infraAllocation === 'byBaseEtp' ? (infraShares(p)[i] as number) : p.hub.infraMonthly);
}

const commons = new WeakMap<object, unknown>();
const NO_LAYER = { overrides: {}, knowledge: {} };
/**
 * The case every product inherits (what "Edit: All products" shows in a Portfolio / Wave view): the common values with the hub layer (activation,
 * full infrastructure) and no override nor knowledge subset. A case needs an entry team, never common: `teamIn` is the given product's. Memoised.
 */
export function resolveCommon(p: Portfolio, teamIn: Product['teamIn']): CaseState {
  return memoChain(commons, [p.common, teamIn], `${p.hub.enabled}|${p.hub.infraMonthly}`,
    () => mergeCase(p.common, { id: '', name: '', waveId: null, offsetMonths: 0, teamIn, ...NO_LAYER }, p.hub.enabled, p.hub.infraMonthly));
}
