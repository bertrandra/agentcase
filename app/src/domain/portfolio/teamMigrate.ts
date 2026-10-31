/** @calc-zone product-resolution */
import { attr, type XDocument, type XElement } from '../process/xml';
import { storedTeams } from '../org/teamDoc';
import { unitElements, withoutOrg, withUnits } from '../org/teamStrip';
import type { TeamRow } from '../types/state';
import { withLinesDoc, withoutProductRows, withProductRows, withTeamDoc } from './teamAccess';
import type { Portfolio, Product, SharedTeamLine } from './types';

/**
 * Schema v5 (docs/SPEC_BPMN.md § 21, phase B10a): the teams of a version 4 portfolio — each product's `teamIn` and the portfolio's `sharedTeam`
 * lines with their pins — written into the organisation part of the common document (one team per product in product order, then one per shared
 * line: the order `derivedTeams` gave them), and the organisation a product's own process document held (units edited in its copy) moved to the
 * common document: a product's process override keeps no copy of the organisation (the override split). Pure; the same portfolio when nothing moves.
 */
export interface LegacyTeams {
  /** product id -> its version 4 `teamIn` rows */
  teams: Readonly<Record<string, readonly TeamRow[]>>;
  /** the version 4 `sharedTeam` lines (absent: none) */
  shared?: readonly SharedTeamLine[];
}

/** The units of the products' own documents that the common document lacks (by id), and the products without them. */
function splitOverrides<T extends Portfolio>(pf: T): T {
  const have = new Set(unitElements(pf.common.BPMN as XDocument | undefined).map((u) => attr(u, 'id'))), moved: XElement[] = [];
  let changed = false;
  const products = pf.products.map((p): Product => {
    const d = p.overrides.BPMN as XDocument | undefined;
    if (!d?.root) return p;
    for (const u of unitElements(d)) { const id = attr(u, 'id'); if (!have.has(id)) { have.add(id); moved.push(u); } }
    const own = withoutOrg(d);
    if (own === d) return p;
    changed = true;
    return { ...p, overrides: { ...p.overrides, BPMN: own } };
  });
  const out = changed ? { ...pf, products } : pf;
  return moved.length ? withTeamDoc(out, (d) => (d ? withUnits(d, moved) : (d as unknown as XDocument))) : out;
}

/** The teams of products the portfolio no longer holds left out, and every shared line when `shared` replaces them (a workbook import). */
function dropStale<T extends Portfolio>(pf: T, replaceShared: boolean): T {
  const ids = new Set(pf.products.map((p) => p.id)), st = storedTeams(pf.common.BPMN as XDocument | undefined);
  let out = pf;
  for (const id of st.own.keys()) if (!ids.has(id)) out = withoutProductRows(out, id);
  return replaceShared && st.shared.length ? withLinesDoc(out, []) : out;
}

/**
 * Write the version 4 teams into the common document; a product the document holds no team for gets `fallback` (the default team). `replace`: the
 * given teams and lines are the whole organisation of the products (a workbook import): teams of other products and other shared lines go.
 */
export function teamsIntoDocument<T extends Portfolio>(pf: T, legacy: LegacyTeams, fallback: readonly TeamRow[] = [], replace = false): T {
  let out = splitOverrides(replace ? dropStale(pf, true) : pf);
  for (const p of out.products) {
    const rows = legacy.teams[p.id];
    if (rows) out = withProductRows(out, p.id, rows, p.name);
    else if (!storedTeams(out.common.BPMN as XDocument | undefined).own.has(p.id)) out = withProductRows(out, p.id, fallback, p.name);
  }
  return legacy.shared?.length ? withLinesDoc(out, legacy.shared) : out;
}

type LegacyProduct = Omit<Product, never> & { teamIn?: readonly TeamRow[] };
/** A portfolio in the version 4 shape (products with `teamIn`, an optional `sharedTeam`) in the store's form (tests, tools, the readers). */
export function fromLegacyTeams<T extends Portfolio>(pf: Omit<T, 'products'> & { products: LegacyProduct[]; sharedTeam?: SharedTeamLine[] }): T {
  const teams: Record<string, readonly TeamRow[]> = {}, products = pf.products.map((p) => {
    const { teamIn, ...rest } = p;
    if (teamIn) teams[p.id] = teamIn;
    return rest as Product;
  });
  const { sharedTeam, ...rest } = pf;
  return teamsIntoDocument({ ...rest, products } as unknown as T, { teams, shared: sharedTeam });
}
