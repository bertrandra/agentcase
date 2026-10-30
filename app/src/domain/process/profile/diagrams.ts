/** @calc-zone process-model */
import { attr, el, kid, kids, NS, withAttrs, withChildren, type XAttr, type XDocument, type XElement, type XNode } from '../xml';
import { DEFINITIONS_RANK, fitted, insertChild } from './tree';
import { indexOf, str } from './walk';

/**
 * Several diagrams per file and colours (spec F-B59, F-B60; phase B5b). One `.bpmn` holds the role view (the first diagram, the one AgentCase
 * draws), the organisation view (`domain/org/multiView.ts`) and one view per phase: further `BPMNDiagram`s over the same semantic model, each
 * shape copied from the role view with its id suffixed. Colours are the BPMN-in-Color DI attributes (`color:background-color`,
 * `color:border-color`), also read in bpmn.io's `bioc:fill` / `bioc:stroke`; a legend goes with them as a text annotation.
 */
export const COLOR_NS = 'http://www.omg.org/spec/BPMN/non-normative/color/1.0';
export const BIOC_NS = 'http://bpmn.io/schema/bpmn/biocolor/1.0';
export interface DiagramInfo { id: string; name: string; plane: string; shapes: number; edges: number }

export function diagramsOf(defs: XElement): DiagramInfo[] {
  return kids(defs, NS.bpmndi, 'BPMNDiagram').map((d) => {
    const p = kid(d, NS.bpmndi, 'BPMNPlane');
    return { id: str(attr(d, 'id')), name: str(attr(d, 'name')), plane: str(p ? attr(p, 'bpmnElement') : undefined),
      shapes: p ? kids(p, NS.bpmndi, 'BPMNShape').length : 0, edges: p ? kids(p, NS.bpmndi, 'BPMNEdge').length : 0 };
  });
}

const planeOf = (defs: XElement): XElement | undefined => {
  const d = kids(defs, NS.bpmndi, 'BPMNDiagram')[0];
  return d ? kid(d, NS.bpmndi, 'BPMNPlane') : undefined;
};
/** A DI element copied with its id suffixed (ids are unique across diagrams). */
const copied = (e: XElement, suffix: string): XElement => withAttrs(e, { id: `${str(attr(e, 'id'))}${suffix}` });

/** One diagram per phase (F-B59): the phase's plane holds the shapes and edges of what it contains, copied from the role view. */
export function withPhaseDiagrams(d: XDocument): XDocument {
  const plane = planeOf(d.root), ix = indexOf(d.root);
  if (!plane) return d;
  const phases = [...new Set(ix.nodes.map((n) => n.phase).filter((p): p is string => p !== undefined))];
  return phases.reduce((x, p) => {
    const inside = new Set(ix.nodes.filter((n) => n.phase === p && n.id !== p).map((n) => n.id)), sfx = `_${p}`;
    const items = kids(plane, NS.bpmndi).filter((e) => inside.has(str(attr(e, 'bpmnElement')))).map((e) => copied(e, sfx));
    if (!items.length) return x;
    const dia = el('bpmndi:BPMNDiagram', { id: `Diagram${sfx}`, name: `Phase ${p}` }, [el('bpmndi:BPMNPlane', { id: `Plane${sfx}`, bpmnElement: p }, items)]);
    return { ...x, root: insertChild(x.root, fitted(x.root, dia), DEFINITIONS_RANK) };
  }, d);
}

export interface Colour { fill?: string; stroke?: string }
/** Colours of the shapes of the first diagram by element id, from BPMN-in-Color or bpmn.io attributes. */
export function coloursOf(defs: XElement): Map<string, Colour> {
  const out = new Map<string, Colour>(), plane = planeOf(defs);
  for (const s of plane ? kids(plane, NS.bpmndi, 'BPMNShape') : []) {
    const v = (ns: string, l: string): string | undefined => s.attrs.find((a) => a.ns === ns && a.name.endsWith(`:${l}`))?.value;
    const c: Colour = {}, fill = v(COLOR_NS, 'background-color') ?? v(BIOC_NS, 'fill'), stroke = v(COLOR_NS, 'border-color') ?? v(BIOC_NS, 'stroke');
    if (fill) c.fill = fill;
    if (stroke) c.stroke = stroke;
    if (fill || stroke) out.set(str(attr(s, 'bpmnElement')), c);
  }
  return out;
}

const colourAttrs = (c: Colour): XAttr[] => [
  ...(c.fill ? [{ name: 'color:background-color', ns: COLOR_NS, value: c.fill }] : []), ...(c.stroke ? [{ name: 'color:border-color', ns: COLOR_NS,
    value: c.stroke }] : [])];
/**
 * The first diagram's shapes coloured by `colourOf` (element id → colour, undefined leaves a shape as is), the `color` namespace declared on
 * the definitions, and a legend (`legend`: label → colour) as a text annotation of the main process.
 */
export function withColours(d: XDocument, colourOf: (id: string) => Colour | undefined): XDocument {
  const plane = planeOf(d.root);
  if (!plane) return d;
  const paint = (s: XNode): XNode => {
    if (s.kind !== 'element' || s.local !== 'BPMNShape') return s;
    const c = colourOf(str(attr(s, 'bpmnElement')));
    return c ? { ...s, attrs: [...s.attrs.filter((a) => a.ns !== COLOR_NS), ...colourAttrs(c)] } : s;
  };
  const p2 = withChildren(plane, plane.children.map(paint));
  const swap = (e: XElement): XElement => (e === plane ? p2 : withChildren(e,
    e.children.map((c) => (c.kind === 'element' && c.ns === NS.bpmndi ? swap(c) : c))));
  const root = withChildren(d.root, d.root.children.map((c) => (c.kind === 'element' && c.local === 'BPMNDiagram' ? swap(c) : c)));
  const decl = root.attrs.some((a) => a.name === 'xmlns:color') ? root : { ...root, attrs: [...root.attrs, { name: 'xmlns:color', ns: NS.xmlns,
    value: COLOR_NS }] };
  return { ...d, root: decl };
}
