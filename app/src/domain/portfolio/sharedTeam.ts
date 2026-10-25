/** @calc-zone product-resolution */
import type { TeamRow } from '../types/state';
import { memoChain } from './memo';
import type { Portfolio, Product, SharedTeamLine } from './types';

/** The FTE a shared line gives one product: FTE x share (percent); 0 when the product has no share. */
export const shareOf = (line: SharedTeamLine, productId: string): number => {
  const pct = line.allocations[productId];
  return typeof pct === 'number' && pct > 0 ? ((+line.etp || 0) * pct) / 100 : 0;
};

/** The total share of a line handed out to products, in percent (<= 100 when the line is not over-allocated). */
export const allocatedPct = (line: SharedTeamLine): number => Object.values(line.allocations).reduce((a, x) => a + (+x || 0), 0);

/** Is this row a contribution of a shared line (as opposed to a row of the product's own team)? */
export const isSharedRow = (r: TeamRow): boolean => typeof r.shared === 'string';
/** The product's own rows of an effective team (the same array when nothing is shared). */
export const ownRows = (rows: TeamRow[]): TeamRow[] => (rows.some(isSharedRow) ? rows.filter((r) => !isSharedRow(r)) : rows);
/** FTE the shared lines contribute to an effective team. */
export const sharedEtp = (rows: TeamRow[]): number => rows.reduce((a, r) => a + (isSharedRow(r) ? +r.etp || 0 : 0), 0);

const roots = new WeakMap<object, unknown>();
/**
 * The entry team a product's effective case runs on: its own rows, then one row per shared line that gives it a share (FTE x share, marked
 * `shared`). Without a share it is the product's own `teamIn` itself (same identity: absent sharing = today's behaviour exactly). Memoised.
 */
export function effectiveTeam(pf: Portfolio, prod: Product): TeamRow[] {
  const lines = pf.sharedTeam;
  if (!lines?.length || !lines.some((l) => shareOf(l, prod.id) > 0)) return prod.teamIn;
  return memoChain(roots, [prod.teamIn, lines], prod.id, () => [...prod.teamIn, ...lines.filter((l) => shareOf(l, prod.id) > 0)
    .map((l): TeamRow => ({ skill: l.skill, grade: l.grade, loc: l.loc, etp: shareOf(l, prod.id), pins: [], shared: l.id }))]);
}

const withLines = <T extends Portfolio>(pf: T, lines: SharedTeamLine[]): T => {
  const out: T = { ...pf, sharedTeam: lines };
  if (!lines.length) delete out.sharedTeam;   // no shared line left: the field disappears (absent = today's file)
  return out;
};
const mapLine = <T extends Portfolio>(pf: T, id: string, f: (l: SharedTeamLine) => SharedTeamLine): T =>
  pf.sharedTeam?.some((l) => l.id === id) ? withLines(pf, pf.sharedTeam.map((l) => (l.id === id ? f(l) : l))) : pf;

/** Add a shared line (refused on a duplicate id). */
export function addSharedLine<T extends Portfolio>(pf: T, line: SharedTeamLine): T {
  if (pf.sharedTeam?.some((l) => l.id === line.id)) return pf;
  return withLines(pf, [...(pf.sharedTeam ?? []), line]);
}
export type SharedLineField = 'skill' | 'grade' | 'loc' | 'etp';
/** Change one field of a shared line; a label must not be blank, the FTE must be a number >= 0. */
export function editSharedLine<T extends Portfolio>(pf: T, id: string, field: SharedLineField, value: string | number): T {
  if (field !== 'etp') return String(value).trim() ? mapLine(pf, id, (l) => ({ ...l, [field]: String(value) })) : pf;
  const v = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(v) && v >= 0 ? mapLine(pf, id, (l) => ({ ...l, etp: v })) : pf;
}
export const removeSharedLine = <T extends Portfolio>(pf: T, id: string): T =>
  (pf.sharedTeam?.some((l) => l.id === id) ? withLines(pf, pf.sharedTeam.filter((l) => l.id !== id)) : pf);
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
  if (!pf.sharedTeam?.some((l) => Object.hasOwn(l.allocations, productId))) return pf;
  return withLines(pf, pf.sharedTeam.map((l) => {
    if (!Object.hasOwn(l.allocations, productId)) return l;
    const allocations = { ...l.allocations };
    delete allocations[productId];
    return { ...l, allocations };
  }));
}
