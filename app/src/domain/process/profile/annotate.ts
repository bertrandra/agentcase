/** @calc-zone process-model */
import { attr, el, kids, NS, text, textOf, type XDocument, type XElement } from '../xml';
import { CONTAINER_RANK, insertIn } from './tree';
import { indexOf, local, str } from './walk';

/**
 * Annotations (spec F-B58; phase B5b): `textAnnotation` + `association` carry audit notes and pain points (§ 15) on the diagram, visible in any
 * BPMN tool. Read from any container; written next to the element they annotate. The export writes them only when it includes audit data
 * (F-B33): `withNotes` is what that export calls with the audit's notes.
 */
export interface Note { id: string; text: string; targets: string[]; container: string }

/** Every text annotation with the elements its associations link it to. */
export function annotationsOf(defs: XElement): Note[] {
  const ix = indexOf(defs), assoc = ix.nodes.filter((n) => n.e.local === 'association')
    .map((n) => [local(attr(n.e, 'sourceRef')) ?? '', local(attr(n.e, 'targetRef')) ?? ''] as const);
  return ix.nodes.filter((n) => n.e.local === 'textAnnotation').map((n) => ({
    id: n.id, container: n.container, text: kids(n.e, NS.bpmn, 'text').map(textOf).join('\n').trim(),
    targets: assoc.flatMap(([s, t]) => (s === n.id ? [t] : t === n.id ? [s] : [])),
  }));
}
/** The notes on each element (annotation texts by annotated element id). */
export function notesByElement(defs: XElement): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const n of annotationsOf(defs)) for (const t of n.targets) out.set(t, [...(out.get(t) ?? []), n.text]);
  return out;
}

/** A note on an element: the annotation and its association, written in the container of the element (the process for a root element). */
export function annotate(d: XDocument, n: { id: string; target: string; text: string }): XDocument {
  const ix = indexOf(d.root), container = ix.byId.get(n.target)?.container ?? ix.main ?? '';
  const out = insertIn(d, container, el('bpmn:textAnnotation', { id: n.id }, [el('bpmn:text', {}, [text(n.text)])]), CONTAINER_RANK);
  return insertIn(out, container, el('bpmn:association', { id: `${n.id}_link`, sourceRef: n.id, targetRef: n.target }), CONTAINER_RANK);
}
/** The document with audit notes added as annotations (ids `Note_<target>_<n>`); unknown targets are skipped. */
export function withNotes(d: XDocument, notes: { target: string; text: string }[]): XDocument {
  const seen = new Map<string, number>();
  return notes.reduce((x, n) => {
    if (!indexOf(x.root).byId.has(n.target)) return x;
    const k = (seen.get(n.target) ?? 0) + 1;
    seen.set(n.target, k);
    return annotate(x, { id: `Note_${n.target}_${k}`, target: n.target, text: n.text });
  }, d);
}
export const noteCount = (defs: XElement): number => annotationsOf(defs).length;
export const noteText = (defs: XElement, id: string): string => str(annotationsOf(defs).find((n) => n.id === id)?.text);
