/** @calc-zone process-model */
import { appendChild } from '../process/editTree';
import { fitted } from '../process/profile/tree';
import { doc, el, kid, kids, NS, text, withChildren, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';

/**
 * The organisation part of a case's document (docs/SPEC_BPMN.md § 16.3, § 21, phase B10a): `ac:orgUnit` and `ac:team` elements in the
 * `extensionElements` of the `bpmn:collaboration`. Node-level helpers shared by the unit and team commands: an element is appended at the end of
 * that list (the undo patch is the new element), the extension elements are created after any documentation when absent and removed with their
 * white space when the last element leaves.
 */
export const isBlank = (n: XNode | undefined): n is { kind: 'text'; text: string } => n?.kind === 'text' && !n.text.trim();
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });

/** The document's collaboration rebuilt by `fn` (the same document when there is none or nothing changes). */
export function onCollaboration(d: XDocument, fn: (c: XElement) => XElement): XDocument {
  const c = kid(d.root, NS.bpmn, 'collaboration');
  return c ? same(d, withChildren(d.root, d.root.children.map((x) => (x === c ? fn(c) : x)))) : d;
}

/**
 * The collaboration with `child` appended to its extension elements (created after any documentation when absent); with `before`, inserted before
 * the first element it matches instead (a unit goes before the stored teams, which stay at the end: one canonical order, B10a).
 */
export function withExtChild(c: XElement, child: XElement, before?: (e: XElement) => boolean): XElement {
  const ext = kid(c, NS.bpmn, 'extensionElements');
  if (ext) return withChildren(c, c.children.map((x) => (x === ext ? insertChild(ext, fitted(ext, child), before) : x)));
  const fresh = indent(el('bpmn:extensionElements', {}, [child]), '  ', 2);
  const at = c.children.findIndex((x) => x.kind === 'element' && x.local !== 'documentation');
  if (at < 0) return withChildren(c, [...c.children, text('\n    '), fresh, text('\n  ')]);
  return withChildren(c, [...c.children.slice(0, at), fresh, text('\n    '), ...c.children.slice(at)]);
}

/** `child` appended to `ext`, or inserted (with the white space of its siblings) before the first element `before` matches. */
function insertChild(ext: XElement, child: XElement, before?: (e: XElement) => boolean): XElement {
  const at = before ? ext.children.findIndex((x) => x.kind === 'element' && before(x)) : -1;
  if (at < 0) return appendChild(ext, child);
  const pad = isBlank(ext.children[at - 1]) ? ext.children[at - 1] as XNode : text('\n      ');
  return withChildren(ext, [...ext.children.slice(0, at), child, pad, ...ext.children.slice(at)]);
}

/** The collaboration with its extension elements' children rebuilt by `fn`; the extension elements go (with the white space after them) when empty. */
export function onExtChildren(c: XElement, fn: (cs: readonly XNode[]) => readonly XNode[]): XElement {
  const ext = kid(c, NS.bpmn, 'extensionElements');
  if (!ext) return c;
  const rest = fn(ext.children);
  if (rest === ext.children) return c;
  if (rest.some((x) => x.kind === 'element')) return withChildren(c, c.children.map((x) => (x === ext ? withChildren(ext, rest) : x)));
  const j = c.children.indexOf(ext), after = c.children[j + 1];
  return withChildren(c, [...c.children.slice(0, j), ...c.children.slice(isBlank(after) ? j + 2 : j + 1)]);
}

/** Children without the elements `drop` matches, each with the white space before it. The same array when none matches. */
export function withoutChildren(cs: readonly XNode[], drop: (e: XElement) => boolean): readonly XNode[] {
  if (!cs.some((x) => x.kind === 'element' && drop(x))) return cs;
  const out: XNode[] = [];
  for (const x of cs) {
    if (x.kind === 'element' && drop(x)) { if (isBlank(out[out.length - 1])) out.pop(); continue; }
    out.push(x);
  }
  return out;
}

/** The collaboration's extension elements of a document (undefined without them). */
export function orgExtOf(d: XDocument | undefined): XElement | undefined {
  const c = d?.root ? kid(d.root, NS.bpmn, 'collaboration') : undefined;
  return c ? kid(c, NS.bpmn, 'extensionElements') : undefined;
}

/** True for a document that holds no process: the organisation carrier of an object without a process document (a test's or tool's case). */
export const isCarrier = (d: XDocument | undefined): boolean => !!d?.root && !kids(d.root, NS.bpmn, 'process').length;

/** The organisation carrier: definitions with one collaboration, for teams of an object that has no process document. */
export function carrier(): XDocument {
  const ns = { 'xmlns:bpmn': NS.bpmn, 'xmlns:bpmndi': NS.bpmndi, 'xmlns:dc': NS.dc, 'xmlns:di': NS.di, 'xmlns:ac': NS.ac };
  return doc(indent(el('bpmn:definitions', { ...ns, id: 'Organisation', targetNamespace: 'https://agentcase.app/organisation' },
    [el('bpmn:collaboration', { id: 'Collaboration' })])));
}
