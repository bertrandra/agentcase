/** @calc-zone process-model */
import { el, kid, kids, NS, text, withChildren, type AttrInput, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import type { AuditHeader, CatalogTool, ElementAudit, ToolUse } from './types';

/**
 * The audit as `ac:` elements (the extension XSD, § 15): built from the typed views and written into the tree in place (an existing element is
 * replaced, a new one appended at the end of its extension elements), so a command's undo patch is the attributes that changed.
 */
const join = (xs: readonly string[] | undefined): string | undefined => (xs && xs.length ? xs.join(' ') : undefined);
const blank = (n: XNode | undefined): n is { kind: 'text'; text: string } => n?.kind === 'text' && !n.text.trim();

export const toolUseXml = (t: ToolUse): XElement => el('ac:tool', { ref: t.ref, version: t.version, edition: t.edition, licenceCount: t.licenceCount,
  hosting: t.hosting, integration: join(t.integration), aiFeatures: t.aiFeatures, dataResidency: t.dataResidency, ownerTeam: t.ownerTeam,
  source: t.source, date: t.date, confidence: t.confidence });

/** The `ac:audit` of an element; null when it holds nothing (the element then carries no audit). */
export function auditXml(a: ElementAudit): XElement | null {
  const children: XElement[] = [
    ...a.tools.map(toolUseXml),
    ...a.observations.map((o) => el('ac:observation', { name: o.name, value: o.value, unit: o.unit, per: o.per, role: o.role, source: o.source,
      date: o.date, confidence: o.confidence })),
    ...a.painPoints.map((p) => el('ac:painPoint', { severity: p.severity, aiCandidate: p.aiCandidate }, [text(p.text)])),
    ...a.evidence.map((v) => el('ac:evidence', { name: v.name, link: v.link, interview: v.interview, confidence: v.confidence })),
  ];
  if (!children.length && !a.status && !a.asOf) return null;
  return el('ac:audit', { status: a.status, asOf: a.asOf }, children);
}

export function headerXml(h: AuditHeader): XElement {
  return el('ac:auditHeader', { code: h.code, client: h.client, scope: h.scope, status: h.status, asOf: h.asOf }, [
    ...h.auditors.map((a) => el('ac:auditor', { name: a.name, organisation: a.organisation })),
    ...h.interviews.map((i) => el('ac:interview', { code: i.code, role: i.role, who: i.who, date: i.date })),
    ...h.calibrations.map((c) => el('ac:calibration', { code: c.code, date: c.date, source: c.source }, c.changes.map((x) =>
      el('ac:change', { element: x.element, param: x.param, from: x.from, to: x.to, formula: x.formula })))),
  ]);
}

export const catalogToolXml = (t: CatalogTool): XElement => el('ac:tool', {
  code: t.code, name: t.name, vendor: t.vendor, category: t.category, licence: join(t.licence), capabilities: join(t.capabilities) ?? 'Planning',
  aiFeatures: join(t.aiFeatures), integration: join(t.integration), hosting: join(t.hosting), asOf: t.asOf,
  clientSpecific: t.clientSpecific ? true : undefined, retired: t.retired ? true : undefined } as AttrInput);
export const catalogXml = (tools: readonly CatalogTool[], asOf: string): XElement => el('ac:toolCatalog', { asOf }, tools.map(catalogToolXml));

/** Nesting depth of an element, read from the white space that closes it (2 spaces per level); 0 when written on one line. */
const depthOf = (e: XElement): number => { const t = e.children[e.children.length - 1]; return blank(t) ? Math.max(0, (t.text.length - 1) / 2) : 0; };

/** The extension elements with their `ac:<local>` child replaced by `child`, appended, or removed (null, with the white space before it). */
function setIn(ext: XElement, local: string, child: XElement | null): XElement {
  const cs = ext.children, i = cs.findIndex((c) => c.kind === 'element' && c.ns === NS.ac && c.local === local), depth = depthOf(ext) + 1;
  const pretty = child && blank(cs[cs.length - 1]) ? indent(child, '  ', depth) : child;
  if (i >= 0) {
    if (pretty) return withChildren(ext, cs.map((c, j) => (j === i ? pretty : c)));
    const from = blank(cs[i - 1]) ? i - 1 : i;
    return withChildren(ext, [...cs.slice(0, from), ...cs.slice(i + 1)]);
  }
  if (!pretty) return ext;
  const tail = cs[cs.length - 1];
  return blank(tail) ? withChildren(ext, [...cs.slice(0, -1), text(`\n${'  '.repeat(depth)}`), pretty, tail]) : withChildren(ext, [...cs, pretty]);
}

/**
 * An element (task, resource, collaboration) with `ac:<local>` set in its extension elements. Without extension elements they are created first
 * (after any documentation, as the BPMN schema orders them); extension elements left empty by a removal go too.
 */
export function withExtChild(e: XElement, local: string, child: XElement | null): XElement {
  const ext = kid(e, NS.bpmn, 'extensionElements');
  if (ext) {
    const next = setIn(ext, local, child);
    if (next === ext) return e;
    if (kids(next).length) return withChildren(e, e.children.map((c) => (c === ext ? next : c)));
    const j = e.children.indexOf(ext), from = blank(e.children[j - 1]) ? j - 1 : j;
    return withChildren(e, [...e.children.slice(0, from), ...e.children.slice(j + 1)]);
  }
  if (!child) return e;
  const depth = depthOf(e), multi = blank(e.children[e.children.length - 1]);
  const fresh = multi ? indent(el('bpmn:extensionElements', {}, [child]), '  ', depth + 1) : el('bpmn:extensionElements', {}, [child]);
  const at = e.children.findIndex((c) => c.kind === 'element' && c.local !== 'documentation');
  const pad = text(`\n${'  '.repeat(depth + 1)}`);
  if (at < 0) return withChildren(e, multi ? [...e.children.slice(0, -1), pad, fresh, ...e.children.slice(-1)] : [...e.children, fresh]);
  return withChildren(e, [...e.children.slice(0, at), fresh, ...(multi ? [pad] : []), ...e.children.slice(at)]);
}

/** The document with the collaboration rebuilt by `fn` (the same document when it has no collaboration or nothing changes). */
export function onCollaboration(d: XDocument, fn: (c: XElement) => XElement): XDocument {
  const c = kid(d.root, NS.bpmn, 'collaboration'), next = c ? fn(c) : c;
  if (!c || next === c) return d;
  return { ...d, root: withChildren(d.root, d.root.children.map((x) => (x === c ? next! : x))) };
}

