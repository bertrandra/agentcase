/** @calc-zone process-model */
import { extOf } from './readTypes';
import { attr, kid, kids, NS, el, text, withChildren, type XDocument, type XElement } from './xml';
import { serializeElement } from './xmlWrite';

/**
 * The pass-through container of an import (SPEC_FIXES FX-24): foreign content the import cannot place in one phase (its references cross
 * phases, or its lane / sub-process maps to no phase) is no longer dropped: each element is kept, as written (its XML, UTF-8, base64 so no
 * reader takes it for markup), in an `ac:passThrough` entry of the case's process (`extensionElements`), with the unit it came from and its
 * kind. The text is opaque to the model: nothing reads it, no figure moves, and it travels with the case's BPMN (save, open, export).
 */
export interface PassItem { e: XElement; unit: string }
const b64 = (s: string): string => { let bin = ''; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };
/** The XML of an entry (for a reader that wants it back). */
export const passText = (base64: string): string => new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

export function withPassThrough(d: XDocument, items: readonly PassItem[]): XDocument {
  if (!items.length) return d;
  const proc = kids(d.root, NS.bpmn, 'process').find((p) => extOf(p, 'process')), x = proc && kid(proc, NS.bpmn, 'extensionElements');
  if (!proc || !x) return d;
  const entries = items.map((i) => el('ac:passThrough', { unit: i.unit.slice(0, 4000), kind: i.e.local }, [text(b64(serializeElement(i.e)))]));
  const p2 = withChildren(proc, proc.children.map((c) => (c === x ? withChildren(x, [...x.children, ...entries]) : c)));
  return { ...d, root: withChildren(d.root, d.root.children.map((c) => (c === proc ? p2 : c))) };
}

/** The entries an earlier import kept (kind, unit, base64 text), for the report and the checks. */
export function passThroughOf(d: XDocument): { kind: string; unit: string; text: string }[] {
  const proc = kids(d.root, NS.bpmn, 'process').find((p) => extOf(p, 'process')), x = proc && kid(proc, NS.bpmn, 'extensionElements');
  return x ? kids(x, NS.ac, 'passThrough').map((e) => ({ kind: attr(e, 'kind') ?? '', unit: attr(e, 'unit') ?? '',
    text: e.children.map((c) => (c.kind === 'text' ? c.text : '')).join('').trim() })) : [];
}
