/** @calc-zone process-model */
import { attr, el, kid, kids, NS, text, type XElement, type XNode } from './xml';

/**
 * BPSim 2.0 (WfMC BPSim 2.0, namespace `http://www.bpsim.org/schemas/2.0`, schema docs/bpmn/omg/BPSim-2.0.xsd; spec § 5.4, decision D-B5):
 * a second, derived encoding of the simulation parameters so that simulation tools read them. AgentCase stays the owner of the values (`ac:`).
 * Written on export as one scenario in the `extensionElements` of a `bpmn:relationship type="BPSimData"` (the BPSim placement):
 * processing time = the activity's effort (AgentCase's relative effort, written in the scenario's base unit `day`), probability on each rework
 * flow, resource quantity = the FTE of the role's team skill. Read on import only where the `ac:` value is absent (`readBpsim`).
 */
export const BPSIM_NS = 'http://www.bpsim.org/schemas/2.0';
export const BPSIM_SCENARIO_ID = 'bpsim-agentcase';
export const BPSIM_RELATIONSHIP_ID = 'BPSimData';
export const BPSIM_DECL = { 'xmlns:bpsim': BPSIM_NS } as const;

/** An element of the BPSim namespace, written with the `bpsim` prefix (declared on the relationship). */
const bp = (local: string, attrs: Record<string, string> = {}, children: XNode[] = []): XElement => ({
  kind: 'element', ns: BPSIM_NS, local, prefix: 'bpsim', attrs: Object.entries(attrs).map(([name, value]) => ({ name, ns: '', value })), children,
});
const value = (n: number): XElement => bp(Number.isInteger(n) ? 'NumericParameter' : 'FloatingParameter', { value: String(n) });
const param = (group: string, name: string, n: number): XElement => bp(group, {}, [bp(name, {}, [value(n)])]);

/** The values written for one element: `time` (processing time), `probability` (flows), `quantity` (resources). */
export interface BpsimValues { time?: number; probability?: number; quantity?: number }
/** One `bpsim:ElementParameters` (time, control, resource groups in the order of the BPSim schema). */
export function elementParameters(ref: string, v: BpsimValues): XElement {
  const groups: XElement[] = [];
  if (v.time !== undefined) groups.push(param('TimeParameters', 'ProcessingTime', v.time));
  if (v.probability !== undefined) groups.push(param('ControlParameters', 'Probability', v.probability));
  if (v.quantity !== undefined) groups.push(param('ResourceParameters', 'Quantity', v.quantity));
  return bp('ElementParameters', { elementRef: ref }, groups);
}

/** The `bpmn:relationship` that carries the AgentCase scenario; `processes` are its source and target (the described processes). The `bpsim`
 *  prefix is declared on the definitions (`BPSIM_DECL`). */
export function bpsimRelationship(params: XElement[], processes: string[]): XElement {
  const scenario = bp('Scenario', { id: BPSIM_SCENARIO_ID, name: 'AgentCase parameters', vendor: 'AgentCase',
    description: 'Derived from the ac: values: processing time = relative effort, probability of each rework flow, quantity = team FTE' }, [
    bp('ScenarioParameters', { baseTimeUnit: 'day' }), ...params,
  ]);
  const ref = (q: string, id: string) => el(q, {}, [text(id)]);
  return el('bpmn:relationship', { id: BPSIM_RELATIONSHIP_ID, type: 'BPSimData' }, [
    el('bpmn:extensionElements', {}, [bp('BPSimData', {}, [scenario])]), ...processes.map((p) => ref('bpmn:source', p)),
    ...processes.map((p) => ref('bpmn:target', p)),
  ]);
}

/** True for the relationship AgentCase writes (replaced on each export; other BPSim scenarios are pass-through). */
export const isOwnBpsim = (e: XElement): boolean => e.ns === NS.bpmn && e.local === 'relationship' && attr(e, 'id') === BPSIM_RELATIONSHIP_ID;

const numOf = (e: XElement | undefined): number | undefined => {
  const p = e ? kids(e, BPSIM_NS).find((c) => /Parameter$/.test(c.local)) : undefined, v = p ? attr(p, 'value') : undefined;
  return v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v);
};
const at = (e: XElement, group: string, name: string): number | undefined => {
  const g = kid(e, BPSIM_NS, group);
  return numOf(g ? kid(g, BPSIM_NS, name) : undefined);
};

/**
 * The BPSim values of a document, by element id: every `bpsim:BPSimData` found in the `extensionElements` of a relationship or of the
 * definitions' root elements, first scenario wins. Constant parameters only (a distribution is not a value AgentCase can take).
 */
const NO_BPSIM: ReadonlyMap<string, BpsimValues> = new Map();
const bpsimMemo = new WeakMap<XElement, Map<string, BpsimValues>>();
/**
 * The BPSim values of the document, by element id. FX-42: a document without BPSim data reads one shared empty map, and one with a single
 * `BPSimData` element is read once per that element, so an edit elsewhere keeps the same map (the per-phase memo of `activitiesOf` keys on it).
 */
export function readBpsim(defs: XElement): Map<string, BpsimValues> {
  const holders = kids(defs).filter((e) => e.ns === NS.bpmn).flatMap((e) => kids(e, NS.bpmn, 'extensionElements'));
  const data = holders.flatMap((x) => kids(x, BPSIM_NS, 'BPSimData'));
  if (!data.length) return NO_BPSIM as Map<string, BpsimValues>;
  const one = data.length === 1 ? data[0]! : undefined, hit = one && bpsimMemo.get(one);
  if (hit) return hit;
  const out = new Map<string, BpsimValues>();
  if (one) bpsimMemo.set(one, out);
  for (const s of data.flatMap((d) => kids(d, BPSIM_NS, 'Scenario'))) {
    for (const p of kids(s, BPSIM_NS, 'ElementParameters')) {
      const ref = attr(p, 'elementRef'), v: BpsimValues = {};
      if (!ref || out.has(ref)) continue;
      const time = at(p, 'TimeParameters', 'ProcessingTime'), pr = at(p, 'ControlParameters', 'Probability'), q = at(p, 'ResourceParameters', 'Quantity');
      if (time !== undefined) v.time = time;
      if (pr !== undefined) v.probability = pr;
      if (q !== undefined) v.quantity = q;
      out.set(ref, v);
    }
  }
  return out;
}
