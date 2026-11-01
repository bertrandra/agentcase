/** @calc-zone process-model */
import type { XElement } from './xml';

/**
 * Order and tree helpers of the process documents, with no catalogue behind them (SPEC_FIXES FX-02: the reader of a document must not load the
 * catalogue, which is itself read from the shipped document).
 */

/** Rebuilds an element bottom-up with `fn`; unchanged subtrees keep their identity (so memoised views and undo patches stay small). */
export function mapElements(e: XElement, fn: (e: XElement) => XElement): XElement {
  let changed = false;
  const children = e.children.map((c) => {
    if (c.kind !== 'element') return c;
    const n = mapElements(c, fn);
    if (n !== c) changed = true;
    return n;
  });
  return fn(changed ? { ...e, children } : e);
}

/** Orders items by an optional rank: unchanged when no item has one, else a stable sort by rank (items without one last). */
export function byRank<T>(items: T[], rank: (t: T) => number | undefined): T[] {
  if (!items.some((t) => rank(t) !== undefined)) return items;
  const r = (t: T) => rank(t) ?? Number.MAX_SAFE_INTEGER;
  return items.map((t, i) => ({ t, i })).sort((a, b) => r(a.t) - r(b.t) || a.i - b.i).map((x) => x.t);
}

/**
 * How a case's ordered id list sits on the document: `ranks` (id → 1-based position) is null when the list is the natural order of its members
 * followed by its extras; `extras` are the entries no element can carry (unknown ids, repeats), kept with their position so the list comes back exactly.
 */
export interface Placed { ranks: Map<string, number> | null; extras: { rank: number; value: string }[] }
export function placeList(list: readonly string[], natural: readonly string[]): Placed {
  const known = new Set(natural), ranks = new Map<string, number>(), extras: Placed['extras'] = [];
  list.forEach((id, i) => { if (known.has(id) && !ranks.has(id)) ranks.set(id, i + 1); else extras.push({ rank: i + 1, value: id }); });
  const nat = natural.filter((id) => ranks.has(id));
  // no rank when the known entries open the list in their natural order (the extras, if any, all come after them)
  return { ranks: nat.every((id, i) => id === list[i]) ? null : ranks, extras };
}
export const ranksOf = (list: readonly string[], natural: readonly string[]): Map<string, number> | null => placeList(list, natural).ranks;
