/** @calc-zone exports */
import { BPMN_KEY, caseProcess, NS, SCOPE_KEYS, scopeKeysOf, type LegacyScope, type XDocument } from '@/domain/process';
import defaultDoc from '../../defaults/defaultDoc.json';
import { parseBpmn } from './read';

/**
 * The case's process document between its two forms (docs/SPEC_BPMN.md § 6.1, D-B1): XML text in a file, a node tree in the store. A version 2
 * case (or a value no reader accepts) gets the document of its scope keys (`caseProcess`, the migration 2 → 3); the keys are then removed: the
 * document is their only source.
 */
type Rec = Record<string, unknown>;
const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';

/** The scope keys present on an object (a version 2 case, common values or product overrides). */
export function legacyScopeOf(o: Rec): LegacyScope {
  const out: Rec = {};
  for (const k of SCOPE_KEYS) if (o[k] !== undefined) out[k] = o[k];
  return out as LegacyScope;
}
export const hasLegacyScope = (o: Rec): boolean => SCOPE_KEYS.some((k) => o[k] !== undefined);
/** A copy without the scope keys. */
export function withoutLegacyScope<T extends Rec>(o: T): T {
  const out: Rec = { ...o };
  for (const k of SCOPE_KEYS) delete out[k];
  return out as T;
}
/** The scope keys of the default case (what a version 2 reader filled a missing key with). */
export const DEFAULT_SCOPE: LegacyScope = legacyScopeOf(defaultDoc as unknown as Rec);
/**
 * Trees this module built or read (immutable): passed through as they are by the readers (`sanitize` would copy 30,000 nodes and lose the identity
 * the views are memoised on), and not walked again by `isProcessTree`.
 */
const trusted = new WeakSet<object>();
const trust = (d: XDocument): XDocument => { trusted.add(d); return d; };
export const isTrustedTree = (v: unknown): boolean => !!v && typeof v === 'object' && trusted.has(v);
/** The process document of version 2 scope keys: the case's own keys over `base` (the default case, or a portfolio's common values). */
export const legacyProcess = (o: Rec, base: LegacyScope = DEFAULT_SCOPE): XDocument => trust(caseProcess(scopeKeysOf({ ...base, ...legacyScopeOf(o) })));

const node = (n: unknown, depth: number): boolean => {
  if (!rec(n)) return false;
  if (n.kind === 'text' || n.kind === 'comment') return str(n.text);
  return n.kind === 'element' && depth < 200 && str(n.ns) && str(n.local) && str(n.prefix) && Array.isArray(n.attrs) && Array.isArray(n.children)
    && n.attrs.every((a) => rec(a) && str(a.name) && str(a.ns) && str(a.value)) && n.children.every((c) => node(c, depth + 1));
};
/** A node tree of a BPMN document (every node checked: a hand-made object must not reach the views). */
export function isProcessTree(v: unknown): v is XDocument {
  if (isTrustedTree(v)) return true;
  if (!rec(v) || v.kind !== 'document' || !(v.decl === null || str(v.decl)) || !str(v.before) || !str(v.after) || !node(v.root, 0)) return false;
  const r = v.root as Rec;
  return r.ns === NS.bpmn && r.local === 'definitions';
}

/** The tree of a stored value: the parsed text (the reader's security checks first), the tree itself, or the reason it cannot be used. */
export function processOf(v: unknown): XDocument | string {
  if (str(v)) {
    const r = parseBpmn(v);
    return r.doc ? trust(r.doc) : r.errors.map((e) => e.message).join('; ');
  }
  return isProcessTree(v) ? trust(v) : 'not a BPMN document';
}

/**
 * A case (or common values) in the store's form: `BPMN` as a node tree, no scope key. Text is parsed; a version 2 case gets the document of its
 * keys; a value that cannot be read is replaced by the document of the keys (else the default case's) and `onBad` is told why.
 */
export function caseInStore<T extends object>(c: T, onBad?: (why: string) => void, base: LegacyScope = DEFAULT_SCOPE): T {
  const o = c as unknown as Rec, v = o[BPMN_KEY];
  let doc: XDocument | null = null;
  if (v !== undefined) {
    const p = processOf(v);
    if (typeof p === 'string') onBad?.(p); else doc = p;
  }
  return { ...withoutLegacyScope(o), [BPMN_KEY]: doc ?? legacyProcess(o, base) } as unknown as T;
}

/** Product overrides in the store's form: a `BPMN` override kept (parsed), version 2 scope overrides turned into a whole-document override. */
export function overridesInStore(o: Rec, common: LegacyScope, onBad?: (why: string) => void): Rec {
  if (o[BPMN_KEY] === undefined && !hasLegacyScope(o)) return o;
  let bad = false;
  const own = caseInStore(o, (why) => { bad = true; onBad?.(why); }, common) as Rec;
  if (bad && !hasLegacyScope(o)) delete own[BPMN_KEY];   // an unreadable override: the product inherits the common document
  return own;
}
