/** @calc-zone process-model */
import type { SharedTeamLine } from '../portfolio/types';
import type { TeamRow } from '../types/state';
import { attr, kids, NS, type XDocument, type XElement } from '../process/xml';
import { orgExtOf } from './orgExt';

/**
 * The teams STORED in a case's document (docs/SPEC_BPMN.md § 16.3, § 21, schema v5, phase B10a): the organisation part of the common document
 * holds, in the collaboration's extension elements,
 * - one `ac:team product="‹id›"` per product: its entry team (the legacy `teamIn`), its lines `ac:line skill grade location fte pins`, and the
 *   product's owning unit (`owner`, D-B39: one unit at any level of the tree, absent = unassigned);
 * - one `ac:team line="‹id›"` per shared team line (the legacy portfolio `sharedTeam`): its one line and the products' shares `ac:share product pct`.
 * An `ac:team` with neither attribute is a team of an imported document (shown, not in the figures). Views memoised on the elements.
 */
export const isStoredTeam = (e: XElement): boolean =>
  e.ns === NS.ac && e.local === 'team' && (attr(e, 'product') !== undefined || attr(e, 'line') !== undefined);

const num = (v: string | undefined): number => (v === undefined ? 0 : Number(v));
const pinsOf = (v: string | undefined): string[] => (v ?? '').split(' ').filter(Boolean);
/** The entry team row of an `ac:line` element (keys in the order of the default case's rows, so a saved row reads back the same). */
export const lineRow = (l: XElement): TeamRow => ({ pins: pinsOf(attr(l, 'pins')), skill: attr(l, 'skill') ?? '', grade: attr(l, 'grade') ?? '',
  loc: attr(l, 'location') ?? '', etp: num(attr(l, 'fte')) });

const rows = new WeakMap<XElement, TeamRow[]>();
/** The rows of a product's team element (memoised: the same array while the element is the same). */
export function teamRowsIn(e: XElement): TeamRow[] {
  let r = rows.get(e);
  if (!r) { r = kids(e, NS.ac, 'line').map(lineRow); rows.set(e, r); }
  return r;
}

const lines = new WeakMap<XElement, SharedTeamLine>();
/** The shared team line of a shared team element (memoised). */
export function sharedLineIn(e: XElement): SharedTeamLine {
  let l = lines.get(e);
  if (!l) {
    const x = kid0(e), allocations: Record<string, number> = {};
    for (const s of kids(e, NS.ac, 'share')) allocations[attr(s, 'product') ?? ''] = num(attr(s, 'pct'));
    const r = x ? lineRow(x) : { skill: '', grade: '', loc: '', etp: 0, pins: [] };
    l = { id: attr(e, 'line') ?? '', skill: r.skill, grade: r.grade, loc: r.loc, etp: r.etp, allocations };
    if (x && attr(x, 'pins') !== undefined) l.pins = r.pins as string[];
    lines.set(e, l);
  }
  return l;
}
const kid0 = (e: XElement): XElement | undefined => kids(e, NS.ac, 'line')[0];

export interface StoredTeams {
  /** product id -> its team element */
  own: ReadonlyMap<string, XElement>;
  /** the shared team elements, in document order */
  shared: readonly XElement[];
}
const EMPTY: StoredTeams = { own: new Map(), shared: [] };
const memo = new WeakMap<XElement, StoredTeams>();
/** The stored team elements of a document (memoised on its extension elements). */
export function storedTeams(d: XDocument | undefined): StoredTeams {
  const x = orgExtOf(d);
  if (!x) return EMPTY;
  let t = memo.get(x);
  if (!t) {
    const own = new Map<string, XElement>(), shared: XElement[] = [];
    for (const e of kids(x, NS.ac, 'team')) {
      const p = attr(e, 'product'), l = attr(e, 'line');
      if (p !== undefined) { if (!own.has(p)) own.set(p, e); } else if (l !== undefined) shared.push(e);
    }
    t = { own, shared };
    memo.set(x, t);
  }
  return t;
}

const NO_ROWS: TeamRow[] = [];
/** A product's own entry team rows as the document holds them (an empty list when it holds no team for the product). */
export const productRowsIn = (d: XDocument | undefined, productId: string): TeamRow[] => {
  const e = storedTeams(d).own.get(productId);
  return e ? teamRowsIn(e) : NO_ROWS;
};
/** The owning unit of a product (D-B39), undefined when unassigned. */
export const ownerIn = (d: XDocument | undefined, productId: string): string | undefined => {
  const e = storedTeams(d).own.get(productId);
  return e ? attr(e, 'owner') : undefined;
};
/** The first product team of a document (a single case's file: its entry team), or undefined. */
export function caseTeamIn(d: XDocument | undefined): { productId: string; rows: TeamRow[] } | undefined {
  const first = storedTeams(d).own.entries().next();
  return first.done ? undefined : { productId: first.value[0], rows: teamRowsIn(first.value[1]) };
}
