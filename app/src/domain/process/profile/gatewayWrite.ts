/** @calc-zone process-model */
import { without } from '../partial';
import { el, kid, NS, text, withAttrs, withChildren, type XDocument, type XElement } from '../xml';
import { CONTAINER_RANK, editDoc, fitted, insertChild, insertIn } from './tree';

/**
 * Writers of conditional scope (spec F-B51; phase B5b): exclusive / inclusive gateways, sequence flows with a FEEL `conditionExpression`
 * (`xsi:type="tFormalExpression"`, the FEEL language URI, so DMN-aware tools read it as FEEL), and a gateway's default flow.
 */
export const FEEL_URI = 'https://www.omg.org/spec/DMN/20191111/FEEL/';

/** The definitions with `xmlns:xsi` declared (a condition is written with `xsi:type`). */
function withXsi(d: XDocument): XDocument {
  if (d.root.attrs.some((a) => a.ns === NS.xmlns && a.value === NS.xsi)) return d;
  return { ...d, root: { ...d.root, attrs: [...d.root.attrs, { name: 'xmlns:xsi', ns: NS.xmlns, value: NS.xsi }] } };
}
const xsiPrefix = (d: XDocument): string => d.root.attrs.find((a) => a.ns === NS.xmlns && a.value === NS.xsi)?.name.slice(6) ?? 'xsi';

function conditionEl(d: XDocument, expr: string): XElement {
  const p = d.root.prefix ? `${d.root.prefix}:` : '';
  return { ...el('bpmn:conditionExpression', { language: FEEL_URI }, [text(expr)]), prefix: d.root.prefix,
    attrs: [{ name: `${xsiPrefix(d)}:type`, ns: NS.xsi, value: `${p}tFormalExpression` }, { name: 'language', ns: '', value: FEEL_URI }] };
}

/** An exclusive or inclusive gateway in a container (phase or process). */
export const addGateway = (d: XDocument, container: string, id: string, kind: 'exclusive' | 'inclusive', name?: string): XDocument =>
  insertIn(d, container, el(`bpmn:${kind}Gateway`, { id, name, gatewayDirection: 'Diverging' }), CONTAINER_RANK);

/** A sequence flow in a container, with an optional FEEL condition. */
export function addFlow(d: XDocument, container: string, f: { id: string; source: string; target: string; condition?: string; name?: string }): XDocument {
  const x = f.condition === undefined ? d : withXsi(d);
  const flow = el('bpmn:sequenceFlow', { id: f.id, name: f.name, sourceRef: f.source, targetRef: f.target }, f.condition === undefined ? [] : [conditionEl(x,
    f.condition)]);
  return insertIn(x, container, flow, CONTAINER_RANK);
}

/** The FEEL condition of a flow (null removes it). */
export function setCondition(d: XDocument, flow: string, expr: string | null): XDocument {
  const x = expr === null ? d : withXsi(d);
  return editDoc(x, flow, (f) => {
    const kept = withChildren(f, without(f.children, (c) => c.ns === NS.bpmn && c.local === 'conditionExpression'));
    if (expr === null) return kept;
    const ext = kid(kept, NS.bpmn, 'extensionElements');
    return insertChild(kept, fitted(kept, conditionEl(x, expr)),
      (l) => (l === 'conditionExpression' ? 2 : l === 'extensionElements' || l === 'documentation' ? (ext ? 1 : 0) : 3));
  });
}

/** The default flow of a gateway (null: none). */
export const setDefaultFlow = (d: XDocument, gateway: string, flow: string | null): XDocument => editDoc(d, gateway, (g) => withAttrs(g, { default: flow }));
