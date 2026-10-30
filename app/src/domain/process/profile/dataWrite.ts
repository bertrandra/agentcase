/** @calc-zone process-model */
import { attr, el, kid, kids, NS, text, withAttrs, type XDocument, type XElement } from '../xml';
import { replaceKids } from './ext';
import { ACTIVITY_RANK, CONTAINER_RANK, DEFINITIONS_RANK, editDoc, fitted, insertChild, insertIn, type Rank } from './tree';
import type { DeliverableKind, ToolUse } from './data';

/**
 * Writers of the data part of the extended profile (spec F-B40–F-B43; phase B5b): data stores bound to tools, references to deliverables and
 * stores with their state, an activity's inputs (an `ioSpecification` data input fed by a `dataInputAssociation`, as the schema wants) and
 * outputs, item definitions and imports, and the state a gate requires. Each returns a new document; the commands make them undoable.
 */
const ref = (q: string, id: string): XElement => el(q, {}, [text(id)]);

export interface StoreInput { id: string; name: string; tools: ToolUse[] }
/** A data store (a repository or tool: backlog, source repository, wiki, Knowledge Hub) with the catalogue tools it is (`ac:tool`). */
export function addDataStore(d: XDocument, s: StoreInput): XDocument {
  const tools = s.tools.map((t) => el('ac:tool', { ref: t.ref, hosting: t.hosting, integration: t.integration.length ? t.integration.join(' ') : null }));
  return insertIn(d, null, el('bpmn:dataStore', { id: s.id, name: s.name }, tools.length ? [el('bpmn:extensionElements', {}, tools)] : []), DEFINITIONS_RANK);
}

/** A reference to a data object or a data store in a container (phase or process), with an optional state (F-B42). */
export function addDataRef(d: XDocument, container: string, r: { id: string; to: string; store?: boolean; name?: string; state?: string }): XDocument {
  const q = r.store ? 'bpmn:dataStoreReference' : 'bpmn:dataObjectReference', target = r.store ? 'dataStoreRef' : 'dataObjectRef';
  const st = r.state ? [el('bpmn:dataState', { id: `${r.id}_state`, name: r.state })] : [];
  return insertIn(d, container, el(q, { id: r.id, name: r.name, [target]: r.to }, st), CONTAINER_RANK);
}

const STATE_RANK: Rank = (l) => (l === 'dataState' ? 5 : ['documentation', 'extensionElements', 'auditing', 'monitoring', 'categoryValueRef'].indexOf(l));
/** The state of a data reference (`dataState`; null removes it). */
export function setDataState(d: XDocument, refId: string, state: string | null): XDocument {
  return editDoc(d, refId, (e) => replaceKids(e, ['dataState'], state ? el('bpmn:dataState', { id: `${refId}_state`, name: state }) : null, STATE_RANK));
}

/** The activity's `ioSpecification` with one more data input (created with its input and output sets when missing). */
function withInput(task: XElement, input: string, name: string): XElement {
  const io = kid(task, NS.bpmn, 'ioSpecification');
  const inputs = [...(io ? kids(io, NS.bpmn, 'dataInput') : []), el('bpmn:dataInput', { id: input, name })];
  const outputs = io ? kids(io, NS.bpmn, 'dataOutput') : [];
  const sets = [el('bpmn:inputSet', { id: `${attr(task, 'id') ?? ''}_inputs` }, inputs.map((i) => ref('bpmn:dataInputRefs', attr(i, 'id') ?? ''))),
    el('bpmn:outputSet', { id: `${attr(task, 'id') ?? ''}_outputs` }, outputs.map((o) => ref('bpmn:dataOutputRefs', attr(o, 'id') ?? '')))];
  const spec = el('bpmn:ioSpecification', { id: io ? attr(io, 'id') : `${attr(task, 'id') ?? ''}_io` }, [...inputs, ...outputs, ...sets]);
  return replaceKids(task, ['ioSpecification'], spec, ACTIVITY_RANK);
}

/** An activity consumes a deliverable or reads a store (F-B40): a data input of its `ioSpecification`, fed from `source` (an object or reference). */
export function linkInput(d: XDocument, activity: string, source: string, name = source): XDocument {
  const input = `${activity}_in_${source}`;
  const assoc = el('bpmn:dataInputAssociation', { id: `${input}_assoc` }, [ref('bpmn:sourceRef', source), ref('bpmn:targetRef', input)]);
  return editDoc(d, activity, (e) => { const t = withInput(e, input, name); return insertChild(t, fitted(t, assoc), ACTIVITY_RANK); });
}
/** An activity produces a deliverable or writes a store (`dataOutputAssociation`). */
export function linkOutput(d: XDocument, activity: string, target: string): XDocument {
  const assoc = el('bpmn:dataOutputAssociation', { id: `${activity}_out_${target}` }, [ref('bpmn:targetRef', target)]);
  return editDoc(d, activity, (e) => insertChild(e, fitted(e, assoc), ACTIVITY_RANK));
}

/** A deliverable type (F-B43): an item definition named after its kind, optionally a collection, optionally typed by an imported structure. */
export function addItemType(d: XDocument, t: { id: string; kind: DeliverableKind; collection?: boolean; structure?: string }): XDocument {
  const e = el('bpmn:itemDefinition', { id: t.id, structureRef: t.structure ?? `ac:${t.kind}`, isCollection: t.collection ? 'true' : null,
    itemKind: 'Information' });
  return insertIn(d, null, e, DEFINITIONS_RANK);
}
/** An external schema imported for the deliverable types (`bpmn:import`). */
export function addImport(d: XDocument, i: { namespace: string; location: string; importType: string }): XDocument {
  return insertIn(d, null, el('bpmn:import', i), DEFINITIONS_RANK);
}
/** A data object typed (`itemSubjectRef`) and marked as a collection or not (`isCollection`, F-B42). */
export const typeData = (d: XDocument, data: string, item: string | null, collection?: boolean): XDocument =>
  editDoc(d, data, (e) => withAttrs(e, { itemSubjectRef: item, isCollection: collection === undefined ? attr(e,
    'isCollection') : collection ? 'true' : null }));
/** The state a gate or approval requires of its inputs (`ac:requiresState`; null removes it). */
export const setRequiresState = (d: XDocument, id: string, state: string | null): XDocument =>
  editDoc(d, id, (e) => withAttrs(e, { 'ac:requiresState': state }));
