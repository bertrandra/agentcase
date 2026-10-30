/** @calc-zone process-model */
import type { CaseState } from '../types/state';
import { COLLABORATION_ID, PARTICIPANT_ID } from './buildDi';
import { mapElements } from './defaultProcess';
import { bpsimParams, productDocument, withBpsim, type ExportOptions } from './exportCase';
import { PROCESS_ID } from './ids';
import { attr, el, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement, type XNode } from './xml';
import { indent, serialize } from './xmlWrite';
import { withHeader } from './profile/header';
import { APP_VERSION } from '../version';

/** One product of a portfolio export: its code (`P1`, `P2`…: the id prefix in a collaboration file), its name and its effective case. */
export interface ProductInput { code: string; name: string; case: CaseState }

/** The attributes that reference an id (BPMN, BPMN DI, BPSim, `ac:agent`, `ac:decisionRef`), and the BPMN elements whose text is an id. */
const REF_ATTRS = new Set(['sourceRef', 'targetRef', 'processRef', 'bpmnElement', 'default', 'attachedToRef', 'calledElement', 'elementRef', 'ac:agent',
  'partitionElementRef', 'errorRef', 'escalationRef', 'signalRef', 'messageRef', 'dataObjectRef', 'dataStoreRef', 'itemSubjectRef', 'parameterRef',
  'ac:decisionRef']);
/** A DMN reference (`href="#dec_x"`, B7b) to an id of the tree. */
const isHref = (a: { name: string; value: string }): boolean => a.name === 'href' && a.value.startsWith('#');
const isRefText = (e: XElement): boolean => e.ns === NS.bpmn && (/Refs?$/.test(e.local) || e.local === 'source' || e.local === 'target');
const POOL_GAP = 40;

/** Every id of the tree and every reference to one, prefixed (`P1_A017`): the products of one file keep unique ids (xsd:ID). */
export function prefixIds(root: XElement, pre: string): XElement {
  const ids = new Set<string>();
  mapElements(root, (e) => { const id = attr(e, 'id'); if (id !== undefined) ids.add(id); return e; });
  const fix = (v: string): string => v.split(' ').map((t) => (ids.has(t) ? pre + t : t)).join(' ');
  return mapElements(root, (e) => {
    const attrs = e.attrs.map((a) => (a.name === 'id' || (a.ns !== NS.xmlns && REF_ATTRS.has(a.name)) ? { ...a, value: fix(a.value) }
      : isHref(a) ? { ...a, value: `#${fix(a.value.slice(1))}` } : a));
    const ref = isRefText(e);
    const children: XNode[] = e.children.map((c) => (ref && c.kind === 'text' && ids.has(c.text) ? { kind: 'text', text: pre + c.text } : c));
    return { ...e, attrs, children };
  });
}

/** Moves the diagram of a product down by `dy` (bounds and waypoints). */
const shifted = (e: XElement, dy: number): XElement => (dy ? mapElements(e, (x) =>
  ((x.ns === NS.dc && x.local === 'Bounds') || (x.ns === NS.di && x.local === 'waypoint') ? withAttrs(x, { y: Number(attr(x, 'y') ?? 0) + dy }) : x)) : e);

const kidsOf = (root: XElement, ns: string, local: string): XElement[] => kids(root, ns, local);
const planeItems = (root: XElement): XElement[] => kidsOf(root, NS.bpmndi, 'BPMNDiagram').slice(0, 1).flatMap((d) => kids(d, NS.bpmndi, 'BPMNPlane'))
  .flatMap((p) => kids(p));

/**
 * One file for a portfolio (F-B5, decision D-B8 b): one `bpmn:process` per product inside one collaboration (one pool per product, named after
 * the product), the products' categories and resources, one diagram with the pools stacked, and one BPSim scenario for every product.
 * Ids are prefixed by the product code so that they stay unique; each process carries `ac:product code name`.
 */
export function collaborationDocument(products: ProductInput[], opts: ExportOptions = {}): XDocument {
  let base: XDocument | undefined, dy = 0;
  const heads: XElement[] = [], participants: XElement[] = [], processes: XElement[] = [], shapes: XElement[] = [], params: XElement[] = [];
  for (const p of products) {
    const d = productDocument(p.case, { ...opts, product: { code: p.code, name: p.name } }), pre = `${p.code}_`, root = prefixIds(d.root, pre);
    base ??= d;
    heads.push(...kidsOf(root, NS.bpmn, 'category'), ...kidsOf(root, NS.bpmn, 'resource'));
    participants.push(el('bpmn:participant', { id: pre + PARTICIPANT_ID, name: p.name, processRef: pre + PROCESS_ID }));
    processes.push(...kidsOf(root, NS.bpmn, 'process'));
    const items = planeItems(root), pool = items.find((s) => attr(s, 'bpmnElement') === pre + PARTICIPANT_ID);
    const b = pool ? kid(pool, NS.dc, 'Bounds') : undefined;
    shapes.push(...items.map((s) => shifted(s, dy)));
    dy += Number((b && attr(b, 'height')) ?? 0) + POOL_GAP;
    if (opts.bpsim !== false) params.push(...bpsimParams(d, p.case).map((x) => withAttrs(x, { elementRef: pre + (attr(x, 'elementRef') ?? '') })));
  }
  if (!base) throw new Error('process export: a portfolio file needs at least one product');
  const diagram = el('bpmndi:BPMNDiagram', { id: 'Diagram' }, [el('bpmndi:BPMNPlane', { id: 'Plane', bpmnElement: COLLABORATION_ID }, shapes)]);
  let root = withChildren(base.root, [...heads, el('bpmn:collaboration', { id: COLLABORATION_ID }, participants), ...processes, diagram]);
  if (opts.bpsim !== false) root = withBpsim(root, params);
  return withHeader({ ...base, root: indent(root) }, APP_VERSION);
}
export const collaborationText = (products: ProductInput[], opts: ExportOptions = {}): string => serialize(collaborationDocument(products, opts));
