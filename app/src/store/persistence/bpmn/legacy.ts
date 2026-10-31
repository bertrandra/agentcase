/** @calc-zone exports */
import { BPMN_KEY, editableKeys, SCOPE_KEYS, scopeOf, withScope, type ScopeKeys, type XDocument } from '@/domain/process';

/**
 * The legacy (version 2) shape of a case for the readers and writers that still speak it (docs/SPEC_BPMN.md § 6.2, F-B22): the parameters
 * workbook's legacy sheets, the portfolio Overrides sheet, the excel-compat comparison. The scope keys are DERIVED from the process document
 * here (`scopeOf`); they are never written back into a case: a legacy value coming in is applied to the document (`splitScope` + `editScope`).
 */
type Rec = Record<string, unknown>;

/** The case with its scope keys laid over it (copies the caller may mutate); the process document stays (shared). */
export function legacyView<T extends object>(doc: T): T & ScopeKeys {
  const k = editableKeys(scopeOf(doc as unknown as { BPMN: XDocument })), dom = (doc as unknown as { dom?: { checked?: object } }).dom;
  // the legacy form state of the "Include regulatory artefacts" box: derived from the process (B9a, DEV-REGINCLUDE-DERIVED), never stored
  const withBox = dom ? { dom: { ...dom, checked: { ...dom.checked, regInclude: k.regInclude } } } : {};
  return { ...doc, ...k, ...withBox };
}
/** The legacy shape without the process document (what a version 2 file held). */
export function legacyCase<T extends object>(doc: T): Rec {
  const out = { ...legacyView(doc) } as unknown as Rec;
  delete out[BPMN_KEY];
  return out;
}
/** The scope keys of a patch of legacy keys, and the rest. */
export function splitScope(patch: Rec): { scope: Partial<ScopeKeys>; rest: Rec } {
  const scope: Rec = {}, rest: Rec = {};
  for (const [k, v] of Object.entries(patch)) {
    if ((SCOPE_KEYS as readonly string[]).includes(k)) scope[k] = v; else if (k !== BPMN_KEY) rest[k] = v;
  }
  return { scope: scope as Partial<ScopeKeys>, rest };
}
/** Legacy scope values laid over the keys of a document (in place, on a copy the command owns). */
export function assignScope(k: ScopeKeys, scope: Partial<ScopeKeys>): void {
  for (const [key, v] of Object.entries(scope)) if (v !== undefined) (k as unknown as Rec)[key] = structuredClone(v);
}

/** The document of `doc` with legacy scope values applied (a pure edit: `withScope`, attribute updates, shared unchanged nodes). */
export function scopedProcess(doc: XDocument, scope: Partial<ScopeKeys>): XDocument {
  if (!Object.keys(scope).length) return doc;
  const k = editableKeys(scopeOf({ BPMN: doc }));
  assignScope(k, scope);
  return withScope(doc, k);
}
/** A case with a patch of legacy keys applied: the scope keys edit its process document, the other keys replace their value. */
export function withLegacyPatch<T extends object>(doc: T, patch: Rec): T {
  const { scope, rest } = splitScope(patch), d = doc as unknown as Rec;
  return { ...d, ...structuredClone(rest), [BPMN_KEY]: scopedProcess(d[BPMN_KEY] as XDocument, scope) } as unknown as T;
}
