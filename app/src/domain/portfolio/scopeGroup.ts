/** @calc-zone portfolio-consolidation */
import { productsOfUnit, UNASSIGNED } from '../org/ownership';
import { readStoredOrg } from '../org/readUnits';
import { DEFAULT_UNIT_ID, defaultUnit } from '../org/teams';
import type { OrgUnit } from '../org/types';
import type { XDocument } from '../process/xml';
import { sourceOf, type Consolidated } from './consolidate';
import type { Summary } from './headline';
import type { Series } from './series';
import { productOwner } from './teamAccess';
import { scheduledProducts, unscheduledIds } from './timeline';
import type { Portfolio } from './types';
import { aggregate, type ProductView } from './waves';

/**
 * THE OWNER of "a set of products" behind a display scope other than one product (docs/SPEC_BPMN.md § 21 F-B81, phase B10b): the whole
 * Portfolio, one Wave, or one Unit of the organisation tree — any node (BU, department, sub-department…; D-B39) with the products it owns directly
 * or through its sub-units, or "Unassigned" (`UNASSIGNED_UNIT`). Every aggregate view (headline, selection, the "verify" roll-ups, the Plan views,
 * the reports) reads its products, series and summary here, so a Unit aggregates exactly as a Wave does and a unit owning every product gives the
 * Portfolio's very figures (same products, same order, same sums). Waves and units are independent groupings (a wave can span units).
 */
export type GroupScope = { kind: 'portfolio' } | { kind: 'wave'; id: string } | { kind: 'unit'; id: string };

/** The id of the "Unassigned" node of the unit scope: the products without an owning unit, or with an owner the tree does not hold. */
export const UNASSIGNED_UNIT = '';

/** "portfolio", "wave:<id>" or "unit:<id>": the key every memo of a selection uses. */
export const scopeKey = (s: { kind: string; id?: string }): string => (s.kind === 'wave' || s.kind === 'unit' ? `${s.kind}:${s.id ?? ''}` : s.kind);

const unitMemo = new WeakMap<object, OrgUnit[]>();
/**
 * The units of the portfolio's organisation (the common document's, any depth), with the default delivery unit while the document does not hold it
 * (as the Organisation screen lists them). The same array while the common document is the same.
 */
export function portfolioUnits(pf: Pick<Portfolio, 'common'>): OrgUnit[] {
  const d = pf.common.BPMN as XDocument | undefined, key = d ?? pf.common;
  let hit = unitMemo.get(key);
  if (!hit) {
    const units = d ? readStoredOrg(d).units : [];
    const customer = String((pf.common as { customerName?: unknown }).customerName ?? '');
    hit = units.some((u) => u.id === DEFAULT_UNIT_ID) ? units : [defaultUnit(customer), ...units];
    unitMemo.set(key, hit);
  }
  return hit;
}

/** The name of a unit scope ("Unassigned" for `UNASSIGNED_UNIT`); null for a unit the tree does not hold. */
export function unitLabel(pf: Pick<Portfolio, 'common'>, id: string): string | null {
  return id === UNASSIGNED_UNIT ? UNASSIGNED : portfolioUnits(pf).find((u) => u.id === id)?.name ?? null;
}

/** The products of a selection: its label, the planned ones (the figures' scope, portfolio order) and those it leaves out (archived, no wave). */
export interface ScopeMembers { label: string; planned: string[]; excluded: string[] }

const membersMemo = new WeakMap<Portfolio, Map<string, ScopeMembers | null>>();

function membersOf(pf: Portfolio, s: GroupScope): ScopeMembers | null {
  const planned = scheduledProducts(pf);
  if (s.kind === 'portfolio') return { label: 'Portfolio', planned: planned.map((x) => x.product.id), excluded: unscheduledIds(pf) };
  if (s.kind === 'wave') {
    const w = pf.waves.find((x) => x.id === s.id);
    if (!w) return null;
    const ids = planned.filter((x) => x.wave.id === w.id).map((x) => x.product.id);
    return { label: w.name, planned: ids, excluded: w.productIds.filter((id) => !ids.includes(id)) };
  }
  const label = unitLabel(pf, s.id);
  if (label === null) return null;
  const refs = pf.products.map((p) => ({ id: p.id, name: p.name, owner: productOwner(pf, p.id) }));
  const mine = new Set(productsOfUnit(portfolioUnits(pf), refs, s.id === UNASSIGNED_UNIT ? null : s.id).map((p) => p.id));
  const ids = planned.filter((x) => mine.has(x.product.id)).map((x) => x.product.id);
  return { label, planned: ids, excluded: pf.products.filter((p) => mine.has(p.id) && !ids.includes(p.id)).map((p) => p.id) };
}

/** The members of a Portfolio / Wave / Unit selection; null for a wave or a unit that does not exist. Memoised on the portfolio (its figures' core). */
export function scopeMembers(pf: Portfolio, s: GroupScope): ScopeMembers | null {
  let m = membersMemo.get(pf);
  if (!m) { m = new Map(); membersMemo.set(pf, m); }
  const key = scopeKey(s);
  if (!m.has(key)) m.set(key, membersOf(pf, s));
  return m.get(key) ?? null;
}

/** True when a display scope still points at something: always for the product and the portfolio, while it exists for a wave or a unit. */
export const scopeExists = (pf: Portfolio, s: { kind: 'product' } | GroupScope): boolean =>
  s.kind === 'product' || s.kind === 'portfolio' || (s.kind === 'wave' ? pf.waves.some((w) => w.id === s.id) : unitLabel(pf, s.id) !== null);

/** A selection on the consolidation: its planned products (the consolidation's own views, portfolio order), their summed series and summary. */
export interface Group {
  scope: GroupScope;
  label: string;
  items: ProductView[];
  series: Series;
  summary: Summary;
  /** products of the selection left out of the figures (archived, or without a known wave), portfolio order */
  excludedIds: string[];
}

const groupMemo = new WeakMap<Consolidated, Map<string, Group | null>>();

function build(c: Consolidated, s: GroupScope): Group | null {
  const pf = sourceOf(c), m = pf ? scopeMembers(pf, s) : null;
  if (!m) return null;
  if (s.kind === 'portfolio') return { scope: s, label: m.label, items: c.products, series: c.series, summary: c.summary, excludedIds: m.excluded };
  const ids = new Set(m.planned), items = c.products.filter((v) => ids.has(v.id)), w = s.kind === 'wave' ? c.waves.find((x) => x.id === s.id) : undefined;
  // a wave reads its aggregate from the consolidation (`waveViews`); a unit sums its products the same way (`aggregate`, same order)
  const sum = w ? { series: w.series, summary: w.summary } : aggregate(items, c.horizon, c.rate);
  return { scope: s, label: m.label, items, ...sum, excludedIds: m.excluded };
}

/** The group of a Portfolio / Wave / Unit selection on a consolidation; null for an unknown wave or unit. Memoised on the consolidation. */
export function groupOf(c: Consolidated, s: GroupScope): Group | null {
  let m = groupMemo.get(c);
  if (!m) { m = new Map(); groupMemo.set(c, m); }
  const key = scopeKey(s);
  if (!m.has(key)) m.set(key, build(c, s));
  return m.get(key) ?? null;
}
