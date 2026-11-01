/** @calc-zone process-model */
import type { IncomingTask, IncomingUnit } from './importTypes';
import { attr, kid, kids, NS, textOf, type XElement } from './xml';

/**
 * A file written outside AgentCase, read for the import (F-B8): every task of every process, with its unit (top-level sub-process, else its
 * lane, else its process) and its role names (lane, `humanPerformer` / `potentialOwner` / `performer` resources or expression), and a count of
 * what is not mapped (events, gateways, flows, data, other pools, vendor extensions), by kind.
 */
const TASKS: readonly string[] = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask', 'receiveTask'];
const SUBS: readonly string[] = ['subProcess', 'adHocSubProcess', 'transaction'];
const PERFORMERS: readonly string[] = ['humanPerformer', 'potentialOwner', 'performer'];
/** Structure the import reads (not reported as ignored). */
const READ: readonly string[] = ['process', 'laneSet', 'lane', 'childLaneSet', 'flowNodeRef', 'incoming', 'outgoing', 'documentation', 'resource',
  'collaboration', ...TASKS, ...SUBS, ...PERFORMERS, 'resourceRef', 'resourceAssignmentExpression', 'formalExpression'];

export interface ForeignRead { tasks: IncomingTask[]; units: IncomingUnit[]; ignored: Record<string, number> }

/** An organisation lane set (F-B39 / FX-23: "By organisation", unit → team → role): its lanes name roles, not units of the process. */
const isOrgSet = (set: XElement): boolean => /^LaneSet-organisation/.test(attr(set, 'id') ?? '') || attr(set, 'name') === 'By organisation';

/** FX-23: the role each flow node of an organisation lane set takes — the resource its role lane names (`partitionElementRef`), else the lane name. */
export function orgLaneRoles(container: XElement, resources: ReadonlyMap<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (set: XElement): void => {
    for (const lane of kids(set, NS.bpmn, 'lane')) {
      const ref = attr(lane, 'partitionElementRef'), role = (ref && resources.get(ref)) || attr(lane, 'name') || attr(lane, 'id') || '';
      for (const r of kids(lane, NS.bpmn, 'flowNodeRef')) out.set(textOf(r).trim(), role);
      for (const child of kids(lane, NS.bpmn, 'childLaneSet')) walk(child);
    }
  };
  for (const set of kids(container, NS.bpmn, 'laneSet').filter(isOrgSet)) walk(set);
  return out;
}

/** Lane name of each flow node (the innermost lane that lists it); organisation lane sets are left out (they name roles, FX-23). */
export function lanesOf(proc: XElement): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (set: XElement): void => {
    for (const lane of kids(set, NS.bpmn, 'lane')) {
      for (const r of kids(lane, NS.bpmn, 'flowNodeRef')) out.set(textOf(r).trim(), attr(lane, 'name') ?? attr(lane, 'id') ?? '');
      for (const child of kids(lane, NS.bpmn, 'childLaneSet')) walk(child);
    }
  };
  for (const set of kids(proc, NS.bpmn, 'laneSet').filter((x) => !isOrgSet(x))) walk(set);
  return out;
}

/** Role names a task's performers give: the resource's name (or id), else the assignment expression's text. */
function performersOf(task: XElement, resources: Map<string, string>): string[] {
  const out: string[] = [];
  for (const p of kids(task, NS.bpmn).filter((e) => PERFORMERS.includes(e.local))) {
    const ref = kid(p, NS.bpmn, 'resourceRef'), expr = kid(p, NS.bpmn, 'resourceAssignmentExpression');
    const f = expr ? kid(expr, NS.bpmn, 'formalExpression') : undefined;
    const name = ref ? resources.get(textOf(ref).trim()) ?? textOf(ref).trim() : f ? textOf(f).trim() : '';
    if (name) out.push(name);
  }
  return out;
}

function count(e: XElement, ignored: Record<string, number>): void {
  for (const c of kids(e)) {
    if (c.ns === NS.bpmndi || c.ns === NS.dc || c.ns === NS.di) continue;   // the diagram: the case keeps its own layout
    if (c.ns === NS.bpmn && c.local === 'extensionElements') {
      if (kids(c).some((x) => x.ns !== NS.ac)) ignored['vendor extensions'] = (ignored['vendor extensions'] ?? 0) + 1;
      continue;
    }
    const kind = c.ns === NS.bpmn ? c.local : `${c.prefix || 'other'}:${c.local}`;
    const read = c.ns === NS.bpmn && (READ.includes(c.local) || (c.local === 'participant' && !!attr(c, 'processRef')));
    const key = c.ns === NS.bpmn && c.local === 'participant' ? 'other pools' : kind;
    if (read) count(c, ignored); else ignored[key] = (ignored[key] ?? 0) + 1;   // an element not mapped is counted once, its content with it
  }
}

export function readForeign(defs: XElement): ForeignRead {
  const resources = new Map(kids(defs, NS.bpmn, 'resource').map((r) => [attr(r, 'id') ?? '', attr(r, 'name') ?? attr(r, 'id') ?? '']));
  const pools = new Map(kids(defs, NS.bpmn, 'collaboration').flatMap((c) => kids(c, NS.bpmn, 'participant'))
    .map((p) => [attr(p, 'processRef') ?? '', attr(p, 'name') ?? '']));
  const tasks: IncomingTask[] = [], units = new Map<string, IncomingUnit>(), ignored: Record<string, number> = {};
  const unit = (key: string, name: string, kind: IncomingUnit['kind']): string => {
    if (!units.has(key)) units.set(key, { key, name, kind, phase: null });
    return key;
  };
  const taskOf = (e: XElement, u: string, lane: string | undefined, org?: string): void => {
    const roles = [...new Set([...performersOf(e, resources), ...(lane ? [lane] : []), ...(org ? [org] : [])])];
    tasks.push({ id: attr(e, 'id') ?? '', name: (attr(e, 'name') ?? '').trim() || (attr(e, 'id') ?? ''), element: e.local, unit: u, roles,
      inScope: attr(e, 'ac:inScope') !== 'false' });
  };
  const inside = (sub: XElement, u: string, lane: string | undefined): void => {
    const org = orgLaneRoles(sub, resources);
    for (const c of kids(sub, NS.bpmn)) {
      if (TASKS.includes(c.local)) taskOf(c, u, lane, org.get(attr(c, 'id') ?? ''));
      else if (SUBS.includes(c.local)) inside(c, u, lane);
    }
  };
  for (const proc of kids(defs, NS.bpmn, 'process')) {
    const lanes = lanesOf(proc), org = orgLaneRoles(proc, resources), pid = attr(proc, 'id') ?? '', pname = attr(proc, 'name') || pools.get(pid) || pid;
    for (const c of kids(proc, NS.bpmn)) {
      const id = attr(c, 'id') ?? '', lane = lanes.get(id);
      const u = (): string => (lane ? unit(`lane:${lane}`, lane, 'lane') : unit(`process:${pid}`, pname, 'process'));
      if (TASKS.includes(c.local)) taskOf(c, u(), lane, org.get(id));
      else if (SUBS.includes(c.local)) inside(c, unit(`sub:${id}`, attr(c, 'name') ?? id, 'subProcess'), lane);
    }
  }
  count(defs, ignored);
  return { tasks, units: [...units.values()], ignored };
}
