/** @calc-zone process-model */
import { attr, kid, kids, NS, textOf, type XElement } from '../xml';

/**
 * Every BPMN element of a document's processes, with where it sits (spec § 17, phase B5b): its container (process or sub-process), its process
 * and, in the main process, its phase (the top-level sub-process holding it). The extended-profile readers work on this index, so they read
 * AgentCase files (tasks inside phase sub-processes) and foreign files (tasks directly in a process) alike. Memoised on the definitions.
 */
export interface Placed { e: XElement; id: string; container: string; process: string; phase?: string }
export interface DocIndex {
  defs: XElement;
  /** every element of every process (flow elements, artifacts, lanes excluded), in document order, depth first */
  nodes: Placed[];
  byId: ReadonlyMap<string, Placed>;
  /** root elements of the definitions by id (error, message, dataStore, itemDefinition, resource, global tasks and processes…) */
  roots: ReadonlyMap<string, XElement>;
  /** the first process (AgentCase's delivery process) */
  main?: string;
}
export const CONTAINERS: readonly string[] = ['subProcess', 'adHocSubProcess', 'transaction'];
export const TASK_KINDS: readonly string[] = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask',
  'receiveTask', 'callActivity'];
const SKIP: readonly string[] = ['laneSet', 'extensionElements', 'documentation', 'ioSpecification', 'property'];
export const str = (v: string | undefined): string => v ?? '';
/** The text of a reference child (`<bpmn:sourceRef>A001</bpmn:sourceRef>`), trimmed. */
export const refOf = (e: XElement, local: string): string | undefined => { const r = kid(e, NS.bpmn, local); return r ? textOf(r).trim() : undefined; };
export const refsOf = (e: XElement, local: string): string[] => kids(e, NS.bpmn, local).map((r) => textOf(r).trim());
/** A QName reference with its prefix dropped (`tns:err-1` → `err-1`). */
export const local = (q: string | undefined): string | undefined => (q === undefined ? undefined : q.slice(q.indexOf(':') + 1));
/** True for an event sub-process (`subProcess triggeredByEvent="true"`, F-B49). */
export const isEventSub = (e: XElement): boolean => attr(e, 'triggeredByEvent') === 'true';

const memo = new WeakMap<XElement, DocIndex>();
export function indexOf(defs: XElement): DocIndex {
  const hit = memo.get(defs);
  if (hit) return hit;
  const nodes: Placed[] = [], procs = kids(defs, NS.bpmn, 'process'), main = procs[0] ? attr(procs[0], 'id') : undefined;
  const walk = (c: XElement, process: string, phase: string | undefined): void => {
    const cid = str(attr(c, 'id'));
    for (const e of kids(c, NS.bpmn)) {
      if (SKIP.includes(e.local)) continue;
      const id = str(attr(e, 'id')), top = c.local === 'process' && process === main && CONTAINERS.includes(e.local) && !isEventSub(e);
      const p: Placed = { e, id, container: cid, process };
      const ph = top ? id : phase;
      if (ph !== undefined) p.phase = ph;
      nodes.push(p);
      if (CONTAINERS.includes(e.local)) walk(e, process, ph);
    }
  };
  for (const p of procs) walk(p, str(attr(p, 'id')), undefined);
  const out: DocIndex = { defs, nodes, byId: new Map(nodes.filter((n) => n.id).map((n) => [n.id, n])),
    roots: new Map(kids(defs, NS.bpmn).filter((e) => attr(e, 'id')).map((e) => [str(attr(e, 'id')), e])) };
  if (main !== undefined) out.main = main;
  memo.set(defs, out);
  return out;
}
/** The placed elements of these local names. */
export const nodesOf = (ix: DocIndex, ...locals: string[]): Placed[] => ix.nodes.filter((n) => locals.includes(n.e.local));
/** The tasks of a document (every task kind and call activities), wherever they sit. */
export const tasksOf = (ix: DocIndex): Placed[] => ix.nodes.filter((n) => TASK_KINDS.includes(n.e.local));
/** The `ac:<local>` element of an element's extension elements. */
export function acOf(e: XElement, name: string): XElement | undefined {
  const x = kid(e, NS.bpmn, 'extensionElements');
  return x ? kid(x, NS.ac, name) : undefined;
}
export const numAttr = (e: XElement | undefined, name: string): number | undefined => {
  const v = e ? attr(e, name) : undefined;
  return v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v);
};
