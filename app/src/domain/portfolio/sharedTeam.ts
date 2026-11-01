/** @calc-zone product-resolution */
import type { TeamRow } from '../types/state';
import { memoChain } from './memo';
import { lineShares, serviceDeliveries } from './serviceShares';
import { productTeam, sharedLines, withLinesDoc } from './teamAccess';
import type { Portfolio, Product, SharedTeamLine } from './types';

/** The FTE a shared line gives one product: FTE x share (percent); 0 when the product has no share. */
export const shareOf = (line: SharedTeamLine, productId: string): number => {
  const pct = line.allocations[productId];
  return typeof pct === 'number' && pct > 0 ? ((+line.etp || 0) * pct) / 100 : 0;
};

/** The total share of a line handed out to products, in percent (<= 100 when the line is not over-allocated). */
export const allocatedPct = (line: Pick<SharedTeamLine, 'allocations'>): number => Object.values(line.allocations).reduce((a, x) => a + (+x || 0), 0);

/** Is this row a contribution of a shared line (as opposed to a row of the product's own team)? */
export const isSharedRow = (r: TeamRow): boolean => typeof r.shared === 'string';
/** The product's own rows of an effective team (the same array when nothing is shared). */
export const ownRows = (rows: TeamRow[]): TeamRow[] => (rows.some(isSharedRow) ? rows.filter((r) => !isSharedRow(r)) : rows);
/** FTE the shared lines contribute to an effective team. */
export const sharedEtp = (rows: TeamRow[]): number => rows.reduce((a, r) => a + (isSharedRow(r) ? +r.etp || 0 : 0), 0);

const roots = new WeakMap<object, unknown>();
/**
 * The entry team a product's effective case runs on: its own rows, then one row per shared line that gives it a share (FTE x share, marked
 * `shared`, carrying the line's pins). The share is the line's as the figures read it (`lineShares`: its fixed shares, or the effort split of its
 * service, B10c). Without a share it is the product's own team itself (same identity: absent sharing = today's behaviour exactly). Memoised on the
 * rows, the lines and the shares' values.
 */
export function effectiveTeam(pf: Pick<Portfolio, 'common' | 'products' | 'hub'>, prod: Pick<Product, 'id'>): TeamRow[] {
  const lines = sharedLines(pf), own = productTeam(pf, prod.id);
  if (!lines.length) return own;
  const fte = lines.map((l) => { const x = lineShares(pf, l)[prod.id]; return typeof x === 'number' && x > 0 ? ((+l.etp || 0) * x) / 100 : 0; });
  if (!fte.some((x) => x > 0)) return own;
  const routed = routedPins(pf, prod.id), key = lines.map((l) => (routed.get(l.id) ?? []).join(' ')).join('|');
  return memoChain(roots, [own, lines], `${prod.id}|${fte.join(',')}|${key}`, () => [...own, ...lines.flatMap((l, i): TeamRow[] => (fte[i]! > 0
    ? [{ skill: l.skill, grade: l.grade, loc: l.loc, etp: fte[i]!, pins: [...(l.pins ?? []), ...(routed.get(l.id) ?? [])], shared: l.id }] : []))]);
}

/**
 * SPEC_FIXES FX-D3 (decided (a)): the activities a shared service performs for a product by **type** or **role** (not only its pins) are routed
 * to the service's lines inside the product's engine, as pins of the line: each to the service line of the activity's team skill, else to the
 * service's first line. Explicit pins keep their row (first wins), so an own team line pinning an activity keeps it. Line id → routed ids.
 */
function routedPins(pf: Pick<Portfolio, 'common' | 'products' | 'hub'>, productId: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of serviceDeliveries(pf)) {
    const first = d.def.lines[0], mine = d.products.find((x) => x.productId === productId);
    if (!first || !mine) continue;
    for (const a of mine.activities) {
      if (!a.via.some((v) => v === 'type' || v === 'role')) continue;
      const line = d.def.lines.find((l) => l.skill === a.skill) ?? first;
      out.set(line.id, [...(out.get(line.id) ?? []), a.id]);
    }
  }
  return out;
}

/** The portfolio with these shared lines written into the common document (node patches: a line edited, appended or removed). */
export const withLines = <T extends Portfolio>(pf: T, lines: SharedTeamLine[]): T => withLinesDoc(pf, lines);
export const mapLine = <T extends Portfolio>(pf: T, id: string, f: (l: SharedTeamLine) => SharedTeamLine): T => {
  const all = sharedLines(pf);
  return all.some((l) => l.id === id) ? withLines(pf, all.map((l) => (l.id === id ? f(l) : l))) : pf;
};

/** Add a shared line (refused on a duplicate id). */
export function addSharedLine<T extends Portfolio>(pf: T, line: SharedTeamLine): T {
  const all = sharedLines(pf);
  if (all.some((l) => l.id === line.id)) return pf;
  return withLines(pf, [...all, line]);
}
export type SharedLineField = 'skill' | 'grade' | 'loc' | 'etp';
/** Change one field of a shared line; a label must not be blank, the FTE must be a number >= 0. */
export function editSharedLine<T extends Portfolio>(pf: T, id: string, field: SharedLineField, value: string | number): T {
  if (field !== 'etp') return String(value).trim() ? mapLine(pf, id, (l) => ({ ...l, [field]: String(value) })) : pf;
  const v = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(v) && v >= 0 ? mapLine(pf, id, (l) => ({ ...l, etp: v })) : pf;
}
export const removeSharedLine = <T extends Portfolio>(pf: T, id: string): T => {
  const all = sharedLines(pf);
  return all.some((l) => l.id === id) ? withLines(pf, all.filter((l) => l.id !== id)) : pf;
};
/**
 * Set a product's share of a line, in percent 0..100; 0 removes the share (also the share of a deleted product). Refused for a share out of range
 * or a share > 0 for an unknown product.
 */
export function setSharedAllocation<T extends Portfolio>(pf: T, id: string, productId: string, pct: number): T {
  if (!(Number.isFinite(pct) && pct >= 0 && pct <= 100) || (pct > 0 && !pf.products.some((p) => p.id === productId))) return pf;
  return mapLine(pf, id, (l) => {
    const allocations = { ...l.allocations };
    if (pct > 0) allocations[productId] = pct; else delete allocations[productId];
    return { ...l, allocations };
  });
}
/** A deleted product leaves every shared line (its share is no longer handed out). */
export function dropProductShares<T extends Portfolio>(pf: T, productId: string): T {
  const all = sharedLines(pf);
  if (!all.some((l) => Object.hasOwn(l.allocations, productId))) return pf;
  return withLines(pf, all.map((l) => {
    if (!Object.hasOwn(l.allocations, productId)) return l;
    const allocations = { ...l.allocations };
    delete allocations[productId];
    return { ...l, allocations };
  }));
}
