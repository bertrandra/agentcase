/** @calc-zone process-model */
import { orgExtOf } from '../org/orgExt';
import { attr, el, kids, NS, withAttrs, type XDocument, type XElement } from '../process/xml';
import { applyElementOp, emptyAudit, type ElementOp } from './ops';
import { elementAuditOf } from './read';
import type { ElementAudit } from './types';
import { auditXml, onCollaboration, withExtChild } from './write';

/**
 * Audit layers kept in the organisation part of the common document, each read over the process document's audit element by element (the
 * layer's value wins); never a model parameter.
 * - A product's own audit (SPEC_FIXES FX-D6 (a)): products that share the common process document each keep their audit in
 *   `ac:productAudits`, an `ac:productAudit product="…"` each, instead of sharing one audit or copying the whole process.
 * - A unit's own audit (audit scope, 2026-11): a shared service or an organisation unit keeps what was observed for it in `ac:unitAudits`, an
 *   `ac:unitAudit unit="…"` each — the same activity seen from the team that does it, across the products it serves.
 * Each part holds one `ac:audit element="…"` per activity or role.
 */
interface Layer { box: string; item: string; key: string }
const PRODUCT: Layer = { box: 'productAudits', item: 'productAudit', key: 'product' };
const UNIT: Layer = { box: 'unitAudits', item: 'unitAudit', key: 'unit' };
const LAYER_ID = /^[A-Za-z0-9_-]{1,64}$/;

const partsOf = (common: XDocument | undefined, k: Layer): XElement[] => {
  const x = orgExtOf(common), box = x ? kids(x, NS.ac, k.box)[0] : undefined;
  return box ? kids(box, NS.ac, k.item) : [];
};

function layerOf(common: XDocument | undefined, k: Layer, layerId: string): Map<string, ElementAudit> {
  const p = partsOf(common, k).find((e) => attr(e, k.key) === layerId), out = new Map<string, ElementAudit>();
  for (const a of p ? kids(p, NS.ac, 'audit') : []) { const id = attr(a, 'element'); if (id) out.set(id, elementAuditOf(id, a)); }
  return out;
}

function editLayer(common: XDocument, k: Layer, layerId: string, id: string, op: ElementOp, base: ElementAudit | undefined,
  roles: ReadonlySet<string>): XDocument {
  if (!LAYER_ID.test(layerId)) return common;
  const own = layerOf(common, k, layerId), next = applyElementOp(own.get(id) ?? base ?? emptyAudit(id), op, roles);
  if (!next) return common;
  own.set(id, next);
  const items = [...own].flatMap(([e, a]) => { const x = auditXml(a); return x ? [withAttrs(x, { element: e })] : []; });
  const mine = items.length ? [el(`ac:${k.item}`, { [k.key]: layerId }, items)] : [];
  const parts = [...partsOf(common, k).filter((e) => attr(e, k.key) !== layerId), ...mine];
  return onCollaboration(common, (c) => withExtChild(c, k.box, parts.length ? el(`ac:${k.box}`, {}, parts) : null));
}

/** The product's audits, by element id. */
export const productAuditOf = (common: XDocument | undefined, productId: string): Map<string, ElementAudit> => layerOf(common, PRODUCT, productId);
/** The unit's audits (a shared service or an organisation unit), by element id. */
export const unitAuditOf = (common: XDocument | undefined, unitId: string): Map<string, ElementAudit> => layerOf(common, UNIT, unitId);
/** The units that hold an audit of their own (document order). */
export const auditedUnits = (common: XDocument | undefined): string[] =>
  partsOf(common, UNIT).flatMap((e) => { const u = attr(e, 'unit'); return u && kids(e, NS.ac, 'audit').length ? [u] : []; });

/** The elements of a process document's audit with a layer's own audits on top. */
export const withProductAudit = (shared: ReadonlyMap<string, ElementAudit>, own: ReadonlyMap<string, ElementAudit>): ReadonlyMap<string, ElementAudit> =>
  (own.size ? new Map([...shared, ...own]) : shared);

/**
 * One operation on a product's audit of an element (`base`: the element's current audit as the product sees it, the shared one when the product has
 * none yet; `roles`: the resource ids a per-role value may name). The same document when refused.
 */
export const editProductAudit = (common: XDocument, productId: string, id: string, op: ElementOp, base: ElementAudit | undefined,
  roles: ReadonlySet<string>): XDocument => editLayer(common, PRODUCT, productId, id, op, base, roles);
/** One operation on a unit's audit of an element (`base`: the element's audit as the unit sees it before it holds its own). */
export const editUnitAudit = (common: XDocument, unitId: string, id: string, op: ElementOp, base: ElementAudit | undefined,
  roles: ReadonlySet<string>): XDocument => editLayer(common, UNIT, unitId, id, op, base, roles);
