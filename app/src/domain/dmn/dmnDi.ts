/** @calc-zone process-model */
import { attr, attrsOf, kids, withChildren, type AttrInput, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { DMN_NS } from './types';

/**
 * The diagram of a DMN file (SPEC_FIXES FX-26, DMN 1.3 DMNDI): every decision a box on a first row, every input data a box on a second row, one
 * edge per information requirement — so a DMN tool (Camunda Modeler, bpmn.io's dmn-js) draws the decision requirements graph instead of an empty
 * canvas. Written into the exported `.dmn` only; the case keeps its decisions without it.
 */
export const DMNDI_NS = 'https://www.omg.org/spec/DMN/20191111/DMNDI/';
export const DMN_DC_NS = 'http://www.omg.org/spec/DMN/20180521/DC/';
export const DMN_DI_NS = 'http://www.omg.org/spec/DMN/20180521/DI/';
const W = 180, H = 80, GAP = 40, ROW2 = 220;
/** An element of the DMN DI namespaces (their prefixes are not the BPMN ones the shared `el` knows). */
const NSOF: Record<string, string> = { dmndi: DMNDI_NS, dc: DMN_DC_NS, di: DMN_DI_NS };
const el = (qname: string, a: AttrInput = {}, children: readonly XNode[] = []): XElement => {
  const [prefix, local] = qname.split(':') as [string, string];
  return { kind: 'element', ns: NSOF[prefix]!, local, prefix, attrs: attrsOf(a), children: [...children] };
};

export function withDmnDi(dmn: XElement): XElement {
  if (kids(dmn, DMNDI_NS, 'DMNDI').length) return dmn;
  const decisions = kids(dmn, DMN_NS, 'decision'), inputs = kids(dmn, DMN_NS, 'inputData'), at = new Map<string, { x: number; y: number }>();
  const shape = (e: XElement, i: number, y: number): XElement => {
    const id = attr(e, 'id') ?? '', x = 40 + i * (W + GAP);
    at.set(id, { x, y });
    return el('dmndi:DMNShape', { id: `DMNShape_${id}`, dmnElementRef: id }, [el('dc:Bounds', { x, y, width: W, height: H })]);
  };
  const shapes = [...decisions.map((d, i) => shape(d, i, 40)), ...inputs.map((d, i) => shape(d, i, ROW2))];
  const edges = decisions.flatMap((d) => kids(d, DMN_NS, 'informationRequirement').flatMap((r) => {
    const ref = kids(r).map((c) => (attr(c, 'href') ?? '').replace(/^#/, '')).find(Boolean);
    const to = at.get(attr(d, 'id') ?? ''), from = ref ? at.get(ref) : undefined;
    if (!ref || !to || !from) return [];
    const rid = attr(r, 'id') ?? `${ref}-${attr(d, 'id')}`;
    return [el('dmndi:DMNEdge', { id: `DMNEdge_${rid}`, dmnElementRef: rid }, [el('di:waypoint', { x: from.x + W / 2, y: from.y }),
      el('di:waypoint', { x: to.x + W / 2, y: to.y + H })])];
  }));
  const di = el('dmndi:DMNDI', {}, [el('dmndi:DMNDiagram', { id: 'DMNDiagram_1' }, [...shapes, ...edges])]);
  const out = withChildren(dmn, [...dmn.children, indent(di, '  ', 1)]);
  return { ...out, attrs: [...out.attrs, { name: 'xmlns:dmndi', ns: 'http://www.w3.org/2000/xmlns/', value: DMNDI_NS },
    { name: 'xmlns:dc', ns: 'http://www.w3.org/2000/xmlns/', value: DMN_DC_NS },
    { name: 'xmlns:di', ns: 'http://www.w3.org/2000/xmlns/', value: DMN_DI_NS }] };
}
