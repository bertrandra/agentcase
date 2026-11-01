/** @calc-zone product-resolution */
import { khEnabled } from '../knowledge';
import { caseValues } from '../process/storedValues';
import { CASE_LEVEL_OPT_KEYS } from '../programme/optIn';
import type { CaseState } from '../types/state';
import { allocateCents, teamEtp } from './alloc';
import { mergeCase } from './layers';
import { effectiveTeam } from './sharedTeam';
import { ctxOf, memoChain } from './memo';
import { processCommon } from './teamAccess';
import type { Portfolio, Product } from './types';

const roots = new WeakMap<object, unknown>();

/**
 * Merge memoised on the identities of the common values (`processCommon`: unchanged by a team edit), overrides, team and knowledge (plus the two hub
 * numbers): editing one product, its team included, never rebuilds another.
 */
function resolveWith(p: Portfolio, prod: Product, infra: number): CaseState {
  const team = effectiveTeam(p, prod), common = processCommon(p.common), carrier = carrierOf(p) === prod.id;   // own team + shared lines' shares
  return memoChain(roots, [common, prod.overrides, team, prod.knowledge], `${p.hub.enabled}|${infra}|${carrier}`,
    () => { const s = mergeCase(common, prod, team, p.hub.enabled, infra); return carrier ? s : withoutCommonCaseLevel(s, prod); });
}

/**
 * SPEC_FIXES FX-01: the product that carries the case-level opt-in activities switched on in the common values (engagement stages, value tracking,
 * AI Act obligations, audit interviews, licence procurement): the first planned product of the earliest wave (wave start, then offset, then the
 * portfolio order), so the portfolio — the sum of its products — counts each of them once. null without a planned product.
 */
export function carrierOf(p: Portfolio): string | null {
  const start = new Map(p.waves.map((w) => [w.id, w.startMonth]));
  const planned = p.products.map((x, i) => ({ x, i })).filter(({ x }) => !x.archived && x.waveId !== null && start.has(x.waveId));
  planned.sort((a, b) => (start.get(a.x.waveId!)! - start.get(b.x.waveId!)!) || (a.x.offsetMonths - b.x.offsetMonths) || (a.i - b.i));
  return planned[0]?.x.id ?? null;
}
/** Another product counts a case-level opt-in only when it switches it on itself (its own override); the common switch reads off for it. */
function withoutCommonCaseLevel(s: CaseState, prod: Product): CaseState {
  const own = prod.overrides.dom?.values ?? {}, v = caseValues(s);
  const off = CASE_LEVEL_OPT_KEYS.filter((k) => v[k] === 'on' && !Object.hasOwn(own, k));
  return off.length ? { ...s, dom: { ...s.dom, values: { ...s.dom.values, ...Object.fromEntries(off.map((k) => [k, 'off'])) } } } : s;
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
  const shares = allocateCents(full, users.map((x) => teamEtp(effectiveTeam(p, x))));
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
export function resolveCommon(p: Portfolio, teamIn: CaseState['teamIn']): CaseState {
  const common = processCommon(p.common);
  return memoChain(commons, [common, teamIn], `${p.hub.enabled}|${p.hub.infraMonthly}`,
    () => mergeCase(common, NO_LAYER, teamIn, p.hub.enabled, p.hub.infraMonthly));
}
