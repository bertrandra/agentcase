/** @calc-zone process-model */
import { without } from '../partial';
import { attr, el, kid, kids, NS, text, textOf, withChildren, type XDocument, type XElement } from '../xml';
import { editDoc, fitted, insertChild, type Rank } from './tree';
import { indexOf, local, refOf, str, tasksOf } from './walk';

/**
 * Formal assignment (spec F-B54, with § 16; phase B5b): resources declare `resourceParameter`s (team, grade, location, sourcing, product) and an
 * activity's performer binds them (`resourceParameterBinding`), or gives a `resourceAssignmentExpression`. "Role Dev of the team serving this
 * product, grade B, Portugal" is then plain BPMN; `ac:raci` stays a convenience copy. Lanes bind to their role, team or unit through
 * `partitionElementRef` (read here; written by the organisation view, `domain/org/formalLanes.ts`).
 */
export const ASSIGN_PARAMS = ['team', 'grade', 'location', 'sourcing', 'product'] as const;
const PERFORMERS: readonly string[] = ['resourceRole', 'performer', 'humanPerformer', 'potentialOwner'];
export interface Assignment { activity: string; kind: string; resource?: string; bindings: Record<string, string>; expression?: string }
export interface LaneView { id: string; name: string; partition?: string; refs: string[]; parent?: string; container: string }
export interface AssignCheck { activity: string; resource: string; parameter: string }

const exprText = (e: XElement | undefined): string | undefined => {
  const x = e ? kids(e, NS.bpmn).find((c) => c.local === 'formalExpression' || c.local === 'expression') : undefined;
  return x ? textOf(x).trim() : undefined;
};
/** The parameters each resource declares, by resource id: parameter id → name. */
export function resourceParams(defs: XElement): Map<string, Map<string, string>> {
  return new Map(kids(defs, NS.bpmn, 'resource').map((r) => [str(attr(r, 'id')),
    new Map(kids(r, NS.bpmn, 'resourceParameter').map((p) => [str(attr(p, 'id')), str(attr(p, 'name'))]))]));
}

/** Every performer of every task with its parameter bindings (by parameter name) or its assignment expression. */
export function assignmentsOf(defs: XElement): Assignment[] {
  const params = resourceParams(defs);
  return tasksOf(indexOf(defs)).flatMap((t) => kids(t.e, NS.bpmn).filter((c) => PERFORMERS.includes(c.local)).map((p) => {
    const resource = refOf(p, 'resourceRef'), names = params.get(resource ?? ''), a: Assignment = { activity: t.id, kind: p.local, bindings: {} };
    if (resource) a.resource = resource;
    for (const b of kids(p, NS.bpmn, 'resourceParameterBinding')) {
      const id = local(attr(b, 'parameterRef')) ?? '';
      a.bindings[names?.get(id) ?? id] = exprText(b) ?? '';
    }
    const ex = exprText(kid(p, NS.bpmn, 'resourceAssignmentExpression'));
    if (ex !== undefined) a.expression = ex;
    return a;
  }));
}
/** Bindings to a parameter the resource does not declare. */
export function assignmentChecks(defs: XElement): AssignCheck[] {
  const params = resourceParams(defs);
  return tasksOf(indexOf(defs)).flatMap((t) => kids(t.e, NS.bpmn).filter((c) => PERFORMERS.includes(c.local)).flatMap((p) => {
    const resource = refOf(p, 'resourceRef') ?? '';
    return kids(p, NS.bpmn, 'resourceParameterBinding').map((b) => local(attr(b, 'parameterRef')) ?? '')
      .filter((id) => !params.get(resource)?.has(id)).map((parameter) => ({ activity: t.id, resource, parameter }));
  }));
}

/** Every lane of every lane set (processes and sub-processes, nested lanes included), with its partition element. */
export function lanesOf(defs: XElement): LaneView[] {
  const out: LaneView[] = [];
  const walk = (set: XElement, container: string, parent?: string): void => {
    for (const lane of kids(set, NS.bpmn, 'lane')) {
      const v: LaneView = { id: str(attr(lane, 'id')), name: str(attr(lane, 'name')), refs: kids(lane, NS.bpmn, 'flowNodeRef').map((r) => textOf(r).trim()),
        container };
      const p = local(attr(lane, 'partitionElementRef'));
      if (p) v.partition = p;
      if (parent) v.parent = parent;
      out.push(v);
      for (const c of kids(lane, NS.bpmn, 'childLaneSet')) walk(c, container, v.id);
    }
  };
  for (const p of kids(defs, NS.bpmn, 'process')) for (const s of kids(p, NS.bpmn, 'laneSet')) walk(s, str(attr(p, 'id')));
  for (const n of indexOf(defs).nodes) for (const s of kids(n.e, NS.bpmn, 'laneSet')) walk(s, n.id);
  return out;
}

const RESOURCE_RANK: Rank = (l) => ['documentation', 'extensionElements', 'resourceParameter'].indexOf(l);
/** A resource declaring the assignment parameters it lacks (ids `<resource>-<name>`). */
export function declareParams(d: XDocument, resource: string, names: readonly string[] = ASSIGN_PARAMS): XDocument {
  return editDoc(d, resource, (r) => {
    const have = new Set(kids(r, NS.bpmn, 'resourceParameter').map((p) => attr(p, 'name')));
    return names.filter((n) => !have.has(n)).reduce((x, n) => insertChild(x, fitted(x, el('bpmn:resourceParameter', { id: `${resource}-${n}`, name: n,
      isRequired: 'false' })), RESOURCE_RANK), r);
  });
}

/** The activity's performer of `resource` with these parameter bindings (replacing its bindings); the parameters are declared on the resource. */
export function bindAssignment(d: XDocument, activity: string, resource: string, bindings: Record<string, string>): XDocument {
  const out = declareParams(d, resource, Object.keys(bindings)), params = resourceParams(out.root).get(resource) ?? new Map<string, string>();
  const idOf = new Map([...params].map(([id, n]) => [n, id]));
  return editDoc(out, activity, (t) => withChildren(t, t.children.map((c) => {
    if (c.kind !== 'element' || !PERFORMERS.includes(c.local) || refOf(c, 'resourceRef') !== resource) return c;
    const base = withChildren(c, without(c.children, (x) => x.local === 'resourceParameterBinding'));
    return Object.entries(bindings).reduce((p, [n, v]) => insertChild(p, fitted(p, el('bpmn:resourceParameterBinding', { parameterRef: idOf.get(n) ?? n },
      [el('bpmn:formalExpression', {}, [text(v)])])), () => 0), base);
  })));
}
