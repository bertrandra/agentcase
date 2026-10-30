/** @calc-zone exports */
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

/** A case or common values with `BPMN` as text (other keys shared, not copied). */
export function caseInFile<T extends object>(o: T): T {
  const r = o as unknown as Rec;
  return r[BPMN_KEY] === undefined ? o : ({ ...r, [BPMN_KEY]: text(r[BPMN_KEY]) } as T);
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

/** A stored case of the snapshot library (`state`, a snapshot object): process document as text, no scope key. */
const stateInFile = (s: unknown): unknown => (rec(s) ? caseInFile(caseInStore(s)) : s);
/** The snapshot library of a version 2 file in the version 3 form (each stored case and stored portfolio). */
export function libraryV3(list: unknown): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((e) => {
    if (!rec(e)) return e;
    const out: Rec = { ...e, state: stateInFile(e.state) };
    if (rec(e.portfolio)) out.portfolio = portfolioInFile(portfolioInStore(e.portfolio));
    return out;
  });
}

export { withoutLegacyScope };
