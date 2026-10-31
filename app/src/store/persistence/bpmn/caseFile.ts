/** @calc-zone exports */
import { withProductTeam, isCarrier } from '@/domain/org';
import { DEFAULT_PRODUCT_NAME, fromLegacyTeams, type Portfolio } from '@/domain/portfolio';
import { BPMN_KEY, scopeOf, serialize, type XDocument } from '@/domain/process';
import { caseInStore, DEFAULT_SCOPE, hasLegacyScope, legacyScopeOf, overridesInStore, withoutLegacyScope } from './caseDoc';

/**
 * The file form of a case, a portfolio and a snapshot library (docs/SPEC_BPMN.md § 6.1): the process document as XML text (serialised from the
 * tree, byte-identical every time), and the way back to the store's form. Every writer (JSON file, HTML snapshot, autosave record, broadcast of a
 * whole document) goes through `*InFile`; every reader through `*InStore` (after the migration and the validators).
 */
type Rec = Record<string, unknown>;
const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): unknown => (rec(v) && v.kind === 'document' ? serialize(v as unknown as XDocument) : v);

/**
 * A case or common values with `BPMN` as text (other keys shared, not copied). Schema v5: a single case's entry team (`teamIn`, the case form's
 * view) is written into its document as the team of "Product 1" and the key left out; a case without a process document keeps it.
 */
export function caseInFile<T extends object>(o: T): T {
  const r = o as unknown as Rec;
  if (r[BPMN_KEY] === undefined) return o;
  const d = r[BPMN_KEY], team = Array.isArray(r.teamIn) && rec(d) && d.kind === 'document' && !isCarrier(d as unknown as XDocument);
  if (!team) return { ...r, [BPMN_KEY]: text(d) } as T;
  const { teamIn, ...rest } = r;
  return { ...rest, [BPMN_KEY]: text(withProductTeam(d as unknown as XDocument, 'p1', teamIn as never, DEFAULT_PRODUCT_NAME)) } as T;
}
/** Product overrides with a `BPMN` override as text. */
const overridesInFile = (o: unknown): unknown => (rec(o) && o[BPMN_KEY] !== undefined ? caseInFile(o) : o);

/** A portfolio with every process document as text: the common one and each product override. */
export function portfolioInFile<T extends object>(pf: T): T {
  const p = pf as unknown as Rec, products = Array.isArray(p.products) ? p.products : undefined;
  return {
    ...p, ...(rec(p.common) ? { common: caseInFile(p.common) } : {}),
    ...(products ? { products: products.map((x) => (rec(x) && rec(x.overrides) ? { ...x, overrides: overridesInFile(x.overrides) } : x)) } : {}),
  } as T;
}

/**
 * A portfolio in the store's form: the common document and each product override as trees, version 2 scope overrides turned into a whole-document
 * override (the product's effective keys over the common ones, F-B20). `onBad` is told about a document that cannot be read (null: the product).
 */
export function portfolioInStore<T extends object>(pf: T, onBad?: (why: string, product: string | null) => void): T {
  const p = pf as unknown as Rec;
  if (!rec(p.common)) return pf;
  const common = caseInStore(p.common, (w) => onBad?.(w, null)), products = Array.isArray(p.products) ? p.products : [];
  // what a version 2 override was laid over: the common keys of the file (or, for a common document, its views)
  const base = hasLegacyScope(p.common) || p.common[BPMN_KEY] === undefined ? { ...DEFAULT_SCOPE, ...legacyScopeOf(p.common) } : scopeOf(common);
  return {
    ...p, common,
    products: products.map((x) => (rec(x) && rec(x.overrides)
      ? { ...x, overrides: overridesInStore(x.overrides, base, (w) => onBad?.(w, typeof x.id === 'string' ? x.id : '?')) } : x)),
  } as T;
}

const rows = (v: unknown): boolean => Array.isArray(v) && v.every(rec);
/**
 * A stored portfolio of the library in the schema v5 form: the version 4 teams (`teamIn` of each product, `sharedTeam`) into the common document,
 * when they are well formed (a damaged capture is left to the reader, which corrects it on activation).
 */
function teamsInStore(p: Rec): Rec {
  const products = Array.isArray(p.products) ? p.products : [], common = rec(p.common) ? p.common : undefined;
  const legacy = products.some((x) => rec(x) && x.teamIn !== undefined) || p.sharedTeam !== undefined;
  const ok = !!common && rec(common[BPMN_KEY]) && products.every((x) => rec(x) && (x.teamIn === undefined || rows(x.teamIn)))
    && (p.sharedTeam === undefined || rows(p.sharedTeam));
  return legacy && ok ? fromLegacyTeams(p as unknown as Portfolio) as unknown as Rec : p;
}

/** A stored case of the snapshot library (`state`, a snapshot object): process document as text, no scope key. */
const stateInFile = (s: unknown): unknown => (rec(s) ? caseInFile(caseInStore(s)) : s);
/** The snapshot library of a version 2 file in the version 3 form (each stored case and stored portfolio). */
export function libraryV3(list: unknown): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((e) => {
    if (!rec(e)) return e;
    const out: Rec = { ...e, state: stateInFile(e.state) };
    if (rec(e.portfolio)) out.portfolio = portfolioInFile(teamsInStore(portfolioInStore(e.portfolio)));
    return out;
  });
}

export { withoutLegacyScope };
