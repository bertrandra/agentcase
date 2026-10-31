/** @calc-zone product-resolution */
import { activeArtefacts } from '../scope';
import type { WArtefact as Artefact } from '../artefacts';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import { mapLine, withLines } from './sharedTeam';
import { lineShares } from './serviceShares';
import { sharedLines } from './teamAccess';
import type { Portfolio, SharedTeamLine } from './types';

/**
 * Pins of a shared team line (the same pins as a team row of the Input team): the pinned artefacts leave the auto pool of every product that has a
 * share of the line and go to its share row. One shared line per artefact (pinning it on a line unpins it from the other shared lines); a product's
 * own row pinned to the same artefact comes first in that product (first pin wins, as in a single team).
 */

const setPins = (l: SharedTeamLine, pins: string[]): SharedTeamLine => {
  const out: SharedTeamLine = { ...l, pins };
  if (!pins.length) delete out.pins;   // no pin left: the field disappears (absent = no pins)
  return out;
};

/** Pin (`on`) or unpin artefacts on a shared line; pinning moves them off the other shared lines. Unknown line: unchanged. */
export function pinSharedLine<T extends Portfolio>(pf: T, id: string, artIds: string[], on: boolean): T {
  const all = sharedLines(pf);
  if (!all.some((l) => l.id === id) || !artIds.length) return pf;
  const drop = new Set(artIds);
  return withLines(pf, all.map((l) => {
    const kept = (l.pins ?? []).filter((x) => !drop.has(x));
    if (l.id === id) return setPins(l, on ? [...kept, ...artIds.filter((x, i) => artIds.indexOf(x) === i)] : kept);
    return kept.length === (l.pins ?? []).length ? l : setPins(l, kept);
  }));
}
/** Remove every pin of a shared line. */
export const clearSharedPins = <T extends Portfolio>(pf: T, id: string): T => mapLine(pf, id, (l) => (l.pins ? setPins(l, []) : l));

/**
 * The artefacts a shared line can be pinned to: the union of the active artefacts of the products holding a share of it, fixed or by effort (all
 * the products when none does yet), in first-seen order.
 */
export function sharedLineArtefacts(pf: Portfolio, line: SharedTeamLine): Artefact[] {
  const shares = lineShares(pf, line), holders = pf.products.filter((p) => (shares[p.id] ?? 0) > 0), from = holders.length ? holders : pf.products;
  const out = new Map<string, Artefact>();
  for (const p of from) {
    const c = ctxOf(resolveProduct(pf, p.id));
    for (const a of activeArtefacts(c.a, c.s)) if (!out.has(a.id)) out.set(a.id, a);
  }
  return [...out.values()];
}
