/** @calc-zone process-model */
import { orgExtOf } from '../org/orgExt';
import { attr, el, kids, NS, withAttrs, type XDocument, type XElement } from '../process/xml';
import { applyElementOp, emptyAudit, type ElementOp } from './ops';
import { elementAuditOf } from './read';
import type { ElementAudit } from './types';
import { auditXml, onCollaboration, withExtChild } from './write';

/**
 * A product's own audit (SPEC_FIXES FX-D6 (a)): products that share the common process document each keep their audit in the organisation part
 * of the common document — `ac:productAudits`, an `ac:productAudit product="…"` each, one `ac:audit element="…"` per activity or role —
 * instead of sharing one audit or copying the whole process. Read over the process document's audit (the product's value wins, element by
 * element); never a model parameter.
 */
const partsOf = (common: XDocument | undefined): XElement[] => {
  const x = orgExtOf(common), box = x ? kids(x, NS.ac, 'productAudits')[0] : undefined;
  return box ? kids(box, NS.ac, 'productAudit') : [];
};
const partOf = (common: XDocument | undefined, productId: string): XElement | undefined => partsOf(common).find((e) => attr(e, 'product') === productId);

/** The product's audits, by element id. */
export function productAuditOf(common: XDocument | undefined, productId: string): Map<string, ElementAudit> {
  const p = partOf(common, productId), out = new Map<string, ElementAudit>();
  for (const a of p ? kids(p, NS.ac, 'audit') : []) { const id = attr(a, 'element'); if (id) out.set(id, elementAuditOf(id, a)); }
  return out;
}

/** The elements of a process document's audit with a product's own audits on top. */
export const withProductAudit = (shared: ReadonlyMap<string, ElementAudit>, own: ReadonlyMap<string, ElementAudit>): ReadonlyMap<string, ElementAudit> =>
  (own.size ? new Map([...shared, ...own]) : shared);

/**
 * One operation on a product's audit of an element (`base`: the element's current audit as the product sees it, the shared one when the product has
 * none yet; `roles`: the resource ids a per-role value may name). The same document when refused.
 */
export function editProductAudit(common: XDocument, productId: string, id: string, op: ElementOp, base: ElementAudit | undefined,
  roles: ReadonlySet<string>): XDocument {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(productId)) return common;
  const own = productAuditOf(common, productId), next = applyElementOp(own.get(id) ?? base ?? emptyAudit(id), op, roles);
  if (!next) return common;
  own.set(id, next);
  const items = [...own].flatMap(([k, a]) => { const x = auditXml(a); return x ? [withAttrs(x, { element: k })] : []; });
  const mine = items.length ? [el('ac:productAudit', { product: productId }, items)] : [];
  const parts = [...partsOf(common).filter((e) => attr(e, 'product') !== productId), ...mine];
  return onCollaboration(common, (c) => withExtChild(c, 'productAudits', parts.length ? el('ac:productAudits', {}, parts) : null));
}
