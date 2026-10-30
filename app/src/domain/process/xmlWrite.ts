/** @calc-zone process-model */
import { qnameOf, type XDocument, type XElement, type XNode } from './xml';

/** Text content escaping: the three markup characters, and CR so that a reader's line-end normalisation keeps it. */
export const escText = (s: string): string => (/[&<>\r]/.test(s)
  ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;') : s);
/** Attribute value escaping (double-quoted): also the quote, and the white space a reader would normalise to a space. */
export const escAttr = (s: string): string => (/[&<>\r"\t\n]/.test(s)
  ? escText(s).replace(/"/g, '&quot;').replace(/\t/g, '&#9;').replace(/\n/g, '&#10;') : s);

function write(n: XNode, out: string[]): void {
  if (n.kind === 'text') { out.push(escText(n.text)); return; }
  if (n.kind === 'comment') { out.push(`<!--${n.text}-->`); return; }
  const q = qnameOf(n);
  out.push(`<${q}`);
  for (const a of n.attrs) out.push(` ${a.name}="${escAttr(a.value)}"`);
  if (!n.children.length) { out.push('/>'); return; }
  out.push('>');
  for (const c of n.children) write(c, out);
  out.push(`</${q}>`);
}

/** The XML text of an element: a faithful writer of the tree (no reformatting: white space is whatever text nodes the tree holds). */
export function serializeElement(e: XElement): string {
  const out: string[] = [];
  write(e, out);
  return out.join('');
}
/** The XML text of a document; serialising the same tree always gives the same bytes. */
export const serialize = (d: XDocument): string => `${d.decl ?? ''}${d.before}${serializeElement(d.root)}${d.after}`;

const blank = (n: XNode): boolean => n.kind === 'text' && !n.text.trim();
/**
 * A pretty-printed copy: white-space text nodes inserted between the children of every element that holds no text of its own (one `unit` per
 * level). Elements with text content (documentation, expressions) are kept inline and untouched. Used by the default-process generator.
 */
export function indent(e: XElement, unit = '  ', depth = 0): XElement {
  if (e.children.some((c) => c.kind === 'text' && c.text.trim())) return e;
  const kept = e.children.filter((c) => !blank(c));
  if (!kept.length) return kept.length === e.children.length ? e : { ...e, children: [] };
  const pad = `\n${unit.repeat(depth + 1)}`, children: XNode[] = [];
  for (const c of kept) children.push({ kind: 'text', text: pad }, c.kind === 'element' ? indent(c, unit, depth + 1) : c);
  children.push({ kind: 'text', text: `\n${unit.repeat(depth)}` });
  return { ...e, children };
}
