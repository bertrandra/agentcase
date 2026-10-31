/** @calc-zone exports */
import { emptiedStoredValues, storedElement, withProgrammeValues, type XDocument } from '@/domain/process';
import { isProgrammeKey, programmeKeyOrder } from '@/domain/programme/storedKeys';
import defaultDoc from '../../defaults/defaultDoc.json';

/**
 * The programme's values between the form values and the document (docs/SPEC_BPMN.md § 6.1 schema v4, § 19.5 B9c). A case (or the common values
 * of a portfolio) in the store's form holds them in its `BPMN` document only: a form value of a programme key (a version 3 file, a legacy workbook,
 * a product exported as a case) is moved into the document, over its stored value. A document without the values
 * element (a version 3 file) gets the default case's values for the keys the file does not hold, as the version 3 reader filled a missing key.
 */
type Rec = Record<string, unknown>;
const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const isTree = (v: unknown): v is XDocument => rec(v) && v.kind === 'document';

/** The default case's programme values (what a version 3 reader filled a missing key with). */
export const DEFAULT_PROGRAMME: Readonly<Record<string, string>> = Object.fromEntries(Object.entries((defaultDoc as { dom: { values: Record<string, string> } })
  .dom.values).filter(([k]) => isProgrammeKey(k)));

/** Form values without the programme keys (the same object when there is none). */
function formOnly(values: Rec): Rec {
  if (!Object.keys(values).some(isProgrammeKey)) return values;
  return Object.fromEntries(Object.entries(values).filter(([k]) => !isProgrammeKey(k)));
}

const docs = new WeakMap<XDocument, Map<string, XDocument>>();
/** The document with these values, memoised on the document and the values (the default case is opened many times: one tree, as in schema v3). */
function storedDoc(d: XDocument, patch: Record<string, string>): XDocument {
  const id = JSON.stringify(patch);
  let m = docs.get(d);
  if (!m) { m = new Map(); docs.set(d, m); }
  let out = m.get(id);
  if (!out) { out = withProgrammeValues(d, patch); if (m.size > 16) m.clear(); m.set(id, out); }
  return out;
}

/** A case or common values (BPMN already a tree) in the schema v4 form: programme values in the document, none in the form values. */
export function programmeInStore<T extends object>(c: T): T {
  const o = c as unknown as Rec, dom = o.dom, d = o.BPMN;
  if (!rec(dom) || !rec(dom.values) || !isTree(d)) return c;
  const values = dom.values, own = Object.keys(values).filter(isProgrammeKey), fresh = !storedElement(d);
  if (!fresh && own.length === 0) return c;
  const keys = programmeKeyOrder(new Set([...(fresh ? Object.keys(DEFAULT_PROGRAMME) : []), ...own]));
  const patch = Object.fromEntries(keys.map((k) => [k, String(k in values ? values[k] : DEFAULT_PROGRAMME[k])]));
  return { ...o, BPMN: storedDoc(d, patch), dom: { ...dom, values: formOnly(values) } } as unknown as T;
}

/**
 * Product overrides in the schema v4 form: the per-field programme overrides stay the product's own part (`dom.values`, its sparse override) and
 * a whole-document override keeps no copy of the stored values (`emptiedStoredValues`).
 */
export function overridesProgramme(o: Rec): Rec {
  if (!isTree(o.BPMN)) return o;
  const e = emptiedStoredValues(o.BPMN);
  return e === o.BPMN ? o : { ...o, BPMN: e };
}
