/** @calc-zone process-model */
import { mapElements } from '../process/defaultProcess';
import { without } from '../process/partial';
import { attr, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement } from '../process/xml';
import { caseCopy, shippedTool, SHIPPED_AS_OF } from './catalog';
import { collabExtChild, readAudit } from './read';
import { catalogXml, onCollaboration, withExtChild } from './write';

/**
 * The audit in BPMN exports (F-B33, F-B35, D-B14): opt-in. Without the option every audit element leaves the file (the observations, the audit
 * header with its calibration log, the case's tool catalogue) and the file is the process only; a document without audit is returned as it is
 * (same object, so the export stays byte-identical). With the option the file says so (`ac:process containsAudit="true"`, and "audit" in the
 * file name) and its `ac:toolCatalog` also carries the shipped entries the observations use, so the file is complete on its own.
 */
const isAc = (e: XElement, ...locals: string[]): boolean => e.ns === NS.ac && locals.includes(e.local);
const isExt = (e: XElement): boolean => e.ns === NS.bpmn && e.local === 'extensionElements';
const AUDIT_DOC = ['auditHeader', 'toolCatalog'];

/** The element without its audit children; extension elements left empty by that go too. */
function stripped(e: XElement, gone: (x: XElement) => boolean): XElement {
  const ext = kids(e).find(isExt);
  if (!ext || !kids(ext).some(gone)) return e;
  const next = withChildren(ext, without(ext.children, gone));
  if (kids(next).length) return withChildren(e, e.children.map((c) => (c === ext ? next : c)));
  return withChildren(e, without(e.children, (c) => c === ext));
}

/** The document without any audit data (F-B33 default). */
export function withoutAudit(d: XDocument): XDocument {
  const root = mapElements(d.root, (e) => {
    const x = stripped(e, (c) => isAc(c, 'audit') || (e.ns === NS.bpmn && e.local === 'collaboration' && isAc(c, ...AUDIT_DOC)));
    return isAc(x, 'process') && attr(x, 'containsAudit') !== undefined ? withAttrs(x, { containsAudit: null }) : x;
  });
  return root === d.root ? d : { ...d, root };
}

/** The document as an export with audit data: marked, and its catalogue completed with the shipped entries in use. */
export function withAuditMarked(d: XDocument): XDocument {
  const a = readAudit(d), own = new Set(a.caseTools.map((t) => t.code));
  const used = [...new Set([...a.elements.values()].flatMap((x) => x.tools.map((t) => t.ref)))].filter((c) => !own.has(c));
  const extra = used.map(shippedTool).filter((t) => t !== undefined).map(caseCopy);
  const cat = catalogXml([...a.caseTools, ...extra], a.catalogAsOf ?? SHIPPED_AS_OF);
  let doc = extra.length ? onCollaboration(d, (c) => withExtChild(c, 'toolCatalog', cat)) : d;
  const root = mapElements(doc.root, (e) => (isAc(e, 'process') ? withAttrs(e, { containsAudit: 'true' }) : e));
  doc = root === doc.root ? doc : { ...doc, root };
  return doc;
}

/** The case's document as the export writes it: with or without its audit (D-B14: without by default). */
export const exportAuditDoc = (d: XDocument, includeAudit: boolean): XDocument => (includeAudit ? withAuditMarked(d) : withoutAudit(d));

/**
 * A collaboration file (one pool per product) with the audit of its products: each process keeps the observations of its tasks (the per-role
 * split renamed with the product's id prefix, like every id of the file), and the collaboration carries the audit header and the catalogue of
 * the first product that has them (the common document in a portfolio without process overrides). The products' documents are already
 * marked (`exportAuditDoc`) when the file is built.
 */
export function collaborationAudit(file: XDocument, products: readonly { code: string; doc: XDocument }[]): XDocument {
  const fix = (pre: string) => (e: XElement): XElement => (isAc(e, 'observation') && attr(e, 'role') ? withAttrs(e, { role: pre + attr(e, 'role') }) : e);
  const root = withChildren(file.root, file.root.children.map((c) => {
    if (c.kind !== 'element' || c.ns !== NS.bpmn || c.local !== 'process') return c;
    const ext = kid(c, NS.bpmn, 'extensionElements'), p = ext ? kid(ext, NS.ac, 'product') : undefined, code = p ? attr(p, 'code') : undefined;
    return code ? mapElements(c, fix(`${code}_`)) : c;
  }));
  let doc: XDocument = { ...file, root };
  const src = products.find((p) => readAudit(p.doc).header || readAudit(p.doc).caseTools.length);
  if (src) {
    const marked = withAuditMarked(src.doc), a = readAudit(marked), h = collabExtChild(marked, 'auditHeader');
    if (h) doc = onCollaboration(doc, (c) => withExtChild(c, 'auditHeader', h));
    if (a.caseTools.length) doc = onCollaboration(doc, (c) => withExtChild(c, 'toolCatalog', catalogXml(a.caseTools, a.catalogAsOf ?? SHIPPED_AS_OF)));
  }
  return doc;
}
