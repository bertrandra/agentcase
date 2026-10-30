/** @calc-zone process-model */
import { typeOfTask } from '../process/profile/acts';
import { CONTAINER_RANK, editDoc, fitted, insertChild } from '../process/profile/tree';
import { indexOf, tasksOf } from '../process/profile/walk';
import { attr, doc, el, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { isDmn, readDmn } from './read';
import type { DmnIssue, DmnModel } from './types';

/**
 * Where the decisions live (F-B62, D-B1 / D-B26: one document, no new case key; phase B7b): one DMN 1.3 `dmn:definitions` in the
 * `extensionElements` of the case's main `bpmn:process`. BPMN reads extension content with `processContents="lax"`; the validation schema imports
 * DMN13.xsd, so the embedded decisions are validated strictly, and they travel with their process (a portfolio file prefixes their ids with the
 * product's). A `businessRuleTask` names the decision it applies with `ac:decisionRef` (the decision's id). The `.dmn` file of an export is that
 * element as a document of its own; an imported `.dmn` file replaces it.
 */
const BLANK = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();
const mainProcess = (defs: XElement): XElement | undefined => kid(defs, NS.bpmn, 'process');

/** The embedded `dmn:definitions` of a document (undefined: the process holds no decisions, like the default process). */
export function decisionsEl(defs: XElement): XElement | undefined {
  const p = mainProcess(defs), x = p ? kid(p, NS.bpmn, 'extensionElements') : undefined;
  return x ? kids(x).find(isDmn) : undefined;
}
/** The typed decisions of a document, or null when it holds none. */
export function decisionsOf(defs: XElement): { model: DmnModel; issues: DmnIssue[] } | null {
  const e = decisionsEl(defs);
  return e ? readDmn(e) : null;
}

/** The document with its decisions replaced by `dmn` (null removes them), indented like the process's extension elements. */
export function withDecisions(d: XDocument, dmn: XElement | null): XDocument {
  const p = mainProcess(d.root), id = p ? attr(p, 'id') : undefined;
  if (!p || id === undefined) return d;
  return editDoc(d, id, (proc) => {
    const x = kid(proc, NS.bpmn, 'extensionElements');
    if (!x) {
      if (!dmn) return proc;
      const ext = { ...el('bpmn:extensionElements', {}, [indent(dmn)]), prefix: d.root.prefix };
      return insertChild(proc, fitted(proc, ext), CONTAINER_RANK);
    }
    const cur = kids(x).find(isDmn), out: XNode[] = [];
    for (const c of x.children) {
      if (c !== cur) { out.push(c); continue; }
      if (dmn) out.push(fitted(x, dmn)); else if (BLANK(out[out.length - 1])) out.pop();
    }
    const next = withChildren(x, cur ? out : x.children);
    const nx = cur || !dmn ? next : insertChild(x, fitted(x, dmn), () => 0);
    return withChildren(proc, proc.children.map((c) => (c === x ? nx : c)));
  });
}

/** The tasks bound to a decision (`ac:decisionRef`), with the container they sit in. */
export interface Binding { task: string; decision: string; container: string; process: string }
const bindMemo = new WeakMap<XElement, Binding[]>();
export function bindingsOf(defs: XElement): Binding[] {
  let b = bindMemo.get(defs);
  if (!b) {
    b = tasksOf(indexOf(defs)).flatMap((t) => {
      const ref = attr(t.e, 'ac:decisionRef');
      return ref ? [{ task: t.id, decision: ref, container: t.container, process: t.process }] : [];
    });
    bindMemo.set(defs, b);
  }
  return b;
}

/** True for a task that can apply a decision: a `businessRuleTask`, or a task typed BusinessRule (F-B53). */
export const isRuleTask = (e: XElement): boolean => e.local === 'businessRuleTask' || typeOfTask(e) === 'BusinessRule';
/** The document with a business-rule task bound to a decision (null unbinds it); any other element is left as it is. */
export const bindDecision = (d: XDocument, task: string, decision: string | null): XDocument =>
  editDoc(d, task, (e) => (isRuleTask(e) ? withAttrs(e, { 'ac:decisionRef': decision }) : e));

/** Every `id` of a subtree. */
function idsIn(e: XElement, skip: XElement | undefined, out: Set<string>): Set<string> {
  if (e === skip) return out;
  const id = attr(e, 'id');
  if (id !== undefined) out.add(id);
  for (const c of e.children) if (c.kind === 'element') idsIn(c, skip, out);
  return out;
}
/** The ids of `dmn` the document already uses outside its current decisions (XML ids are unique across the whole file). */
export function idClashes(defs: XElement, dmn: XElement): string[] {
  const used = idsIn(defs, decisionsEl(defs), new Set());
  return [...idsIn(dmn, undefined, new Set())].filter((i) => used.has(i));
}

/** A `.dmn` file of the decisions: the element as a document of its own, indented from the top. */
export const dmnFile = (dmn: XElement): XDocument => doc(indent(dmn, '  ', 0));
