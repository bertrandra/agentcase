/** @calc-zone process-model */
import { appendChild, editById } from '../editTree';
import { attr, kids, NS, type XDocument, type XElement, type XNode } from '../xml';
import { indent } from '../xmlWrite';

/**
 * Tree helpers of the extended profile (docs/SPEC_BPMN.md § 17, phase B5b): a child inserted at the place the OMG schema gives it (BPMN 2.0.2
 * content models are sequences: a task's `ioSpecification` comes before its data associations and performers, a process's artifacts after its
 * flow elements, the definitions' root elements before the diagrams), indented like its siblings.
 */
export type Rank = (local: string, ns: string) => number;
const ranked = (order: readonly (string | readonly string[])[], other: number): Rank => (local, ns) => {
  if (ns !== NS.bpmn && ns !== NS.bpmndi) return other;
  const i = order.findIndex((o) => (typeof o === 'string' ? o === local : o.includes(local)));
  return i < 0 ? other : i;
};
const PERFORMERS = ['resourceRole', 'performer', 'humanPerformer', 'potentialOwner'] as const;
const LOOPS = ['standardLoopCharacteristics', 'multiInstanceLoopCharacteristics'] as const;
/** tActivity: base element, flow element, flow node, then the activity's own sequence. */
export const ACTIVITY_RANK = ranked(['documentation', 'extensionElements', 'auditing', 'monitoring', 'categoryValueRef', 'incoming', 'outgoing',
  'ioSpecification', 'property', 'dataInputAssociation', 'dataOutputAssociation', PERFORMERS, LOOPS], 1);
/** tSubProcess: the activity's sequence, then its lane sets, flow elements and artifacts (anything else). */
export const SUBPROCESS_RANK: Rank = (local, ns) => { const r = ACTIVITY_RANK(local, ns); return r === 1 && local !== 'extensionElements' ? 13 : r; };
const ARTIFACTS = ['textAnnotation', 'association', 'group'] as const;
/** tProcess / tSubProcess: lane sets, then flow elements (any order), then artifacts, then the process's resource roles. */
export const CONTAINER_RANK = ranked(['documentation', 'extensionElements', ['auditing', 'monitoring', 'property'], 'laneSet', '#flow', ARTIFACTS,
  PERFORMERS, 'correlationSubscription', 'supports'], 4);
/** tDefinitions: imports, extensions, root elements, diagrams, relationships. */
export const DEFINITIONS_RANK = ranked(['import', 'extension', '#root', 'BPMNDiagram', 'relationship'], 2);
/** tCollaboration. */
export const COLLABORATION_RANK = ranked(['documentation', 'extensionElements', 'participant', 'messageFlow', ARTIFACTS,
  ['conversation', 'subConversation', 'callConversation'], 'conversationAssociation', 'participantAssociation', 'messageFlowAssociation',
  'correlationKey', 'choreographyRef', 'conversationLink'], 0);

const isBlank = (n: XNode | undefined): n is { kind: 'text'; text: string } => n?.kind === 'text' && !n.text.trim();

/** The element's depth-based indentation unit, guessed from the white space before its first element child (two spaces otherwise). */
function padBefore(cs: readonly XNode[], i: number): XNode | undefined {
  return isBlank(cs[i - 1]) ? cs[i - 1] : undefined;
}

/**
 * The parent with `child` inserted after the last child of the same or a lower rank (before every child of a higher rank), indented like
 * the element it follows. A parent without element children gets it appended (`appendChild`).
 */
export function insertChild(parent: XElement, child: XElement, rank: Rank): XElement {
  const cs = parent.children, r = rank(child.local, child.ns);
  let at = -1, first = -1;
  cs.forEach((c, i) => {
    if (c.kind !== 'element') return;
    if (first < 0) first = i;
    if (rank(c.local, c.ns) <= r) at = i;
  });
  if (first < 0) return appendChild(parent, child);
  if (at < 0) {
    const pad = padBefore(cs, first);
    return { ...parent, children: [...cs.slice(0, first), child, ...(pad ? [pad] : []), ...cs.slice(first)] };
  }
  const pad = padBefore(cs, at);
  return { ...parent, children: [...cs.slice(0, at + 1), ...(pad ? [pad] : []), child, ...cs.slice(at + 1)] };
}

/** The depth (in indentation units of two spaces) of the white space before an element's first child, for `indent`. */
export function depthOf(parent: XElement): number {
  const t = parent.children.find((c) => isBlank(c)) as { text: string } | undefined;
  return t ? Math.max(0, Math.round((t.text.length - t.text.lastIndexOf('\n') - 1) / 2)) : 1;
}

/** An element built for `parent`, indented at its children's depth. */
export const fitted = (parent: XElement, e: XElement): XElement => indent(e, '  ', depthOf(parent));

/** The document with the element of this id rebuilt by `fn` (unchanged when absent). */
export function editDoc(d: XDocument, id: string, fn: (e: XElement) => XElement | null): XDocument {
  const root = editById(d.root, id, fn);
  return root === d.root ? d : { ...d, root };
}
/** The document with `child` inserted in the element of this id (or in the definitions when `id` is null), at its schema position. */
export function insertIn(d: XDocument, id: string | null, child: XElement, rank: Rank): XDocument {
  if (id === null) return { ...d, root: insertChild(d.root, fitted(d.root, child), rank) };
  return editDoc(d, id, (p) => insertChild(p, fitted(p, child), rank));
}
/** The first child element of the definitions of this local name with this id. */
export const rootById = (defs: XElement, local: string, id: string): XElement | undefined =>
  kids(defs, NS.bpmn, local).find((e) => attr(e, 'id') === id);
