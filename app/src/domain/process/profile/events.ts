/** @calc-zone process-model */
import { attr, kid, kids, NS, textOf, type XElement } from '../xml';
import { cycleOf, durationDays } from './duration';
import { acOf, indexOf, isEventSub, local, numAttr, str, TASK_KINDS, type DocIndex, type Placed } from './walk';

/**
 * Events of a process (spec F-B45, F-B47–F-B50; phase B5b): reusable root definitions (`error`, `escalation`, `signal`, `message`), boundary
 * events (error, timer, escalation, compensation, message, signal; interrupting or not), timers (cadence on start events, waiting time on
 * intermediate events, service levels on boundary events) and event sub-processes with their frequency (`ac:frequency`). Read only: nothing here
 * is executed (§ 18); the values become parameters, checks and views.
 */
export const DEF_KINDS = ['error', 'escalation', 'signal', 'message'] as const;
export type DefKind = (typeof DEF_KINDS)[number];
export type EventKind = DefKind | 'timer' | 'compensate' | 'conditional' | 'none';
export interface Definition { id: string; kind: DefKind; name: string; code?: string }
export interface Trigger { kind: EventKind; ref?: string; days?: number; iso?: string }
export interface BoundaryView extends Trigger { id: string; name?: string; attachedTo: string; interrupting: boolean; container: string; target?: string }
export interface TimerView { id: string; element: string; container: string; phase?: string; iso: string; days?: number; cycle: boolean; repeat?: number }
export interface EventSubView extends Trigger {
  id: string; name: string; container: string; phase?: string; interrupting: boolean; activities: string[];
  frequency?: { count: number; per: string };
}
export interface EventsView {
  definitions: Definition[]; boundary: BoundaryView[]; timers: TimerView[]; eventSubs: EventSubView[];
  /** event definitions naming a root definition the document does not hold (F-B48) */
  unresolved: { element: string; ref: string }[];
  /** root definitions no event, task or message flow references */
  unused: string[];
}

const DEF_LOCAL: Record<string, EventKind> = { errorEventDefinition: 'error', escalationEventDefinition: 'escalation', timerEventDefinition: 'timer',
  signalEventDefinition: 'signal', messageEventDefinition: 'message', compensateEventDefinition: 'compensate', conditionalEventDefinition: 'conditional' };
const REF_ATTR: Partial<Record<EventKind, string>> = { error: 'errorRef', escalation: 'escalationRef', signal: 'signalRef', message: 'messageRef' };
const exprOf = (e: XElement, l: string): string | undefined => { const x = kid(e, NS.bpmn, l); return x ? textOf(x).trim() : undefined; };

/** The trigger of an event: its first event definition (kind, referenced definition, timer value in days). */
export function triggerOf(ev: XElement): Trigger {
  const d = kids(ev, NS.bpmn).find((c) => c.local in DEF_LOCAL);
  if (!d) return { kind: 'none' };
  const kind = DEF_LOCAL[d.local] as EventKind, t: Trigger = { kind }, ra = REF_ATTR[kind], ref = ra ? local(attr(d, ra)) : undefined;
  if (ref) t.ref = ref;
  if (kind === 'timer') {
    const iso = exprOf(d, 'timeCycle') ?? exprOf(d, 'timeDuration') ?? exprOf(d, 'timeDate');
    if (iso !== undefined) { t.iso = iso; const days = cycleOf(iso)?.days ?? durationDays(iso); if (days !== undefined) t.days = days; }
  }
  return t;
}

function timersOf(ix: DocIndex): TimerView[] {
  return ix.nodes.filter((n) => /Event$/.test(n.e.local)).flatMap((n) => {
    const d = kid(n.e, NS.bpmn, 'timerEventDefinition'), cyc = d ? exprOf(d, 'timeCycle') : undefined, iso = cyc ?? (d ? exprOf(d, 'timeDuration') : undefined);
    if (!d || iso === undefined) return [];
    const c = cyc !== undefined ? cycleOf(cyc) : undefined, days = c?.days ?? durationDays(iso);
    const t: TimerView = { id: n.id, element: n.e.local, container: n.container, iso, cycle: cyc !== undefined };
    if (n.phase !== undefined) t.phase = n.phase;
    if (days !== undefined) t.days = days;
    if (c?.repeat !== undefined) t.repeat = c.repeat;
    return [t];
  });
}

function eventSubsOf(ix: DocIndex): EventSubView[] {
  return ix.nodes.filter((n) => isEventSub(n.e)).map((n) => {
    const start = kids(n.e, NS.bpmn, 'startEvent')[0], f = acOf(n.e, 'frequency') ?? (start ? acOf(start, 'frequency') : undefined);
    const v: EventSubView = { id: n.id, name: str(attr(n.e, 'name')), container: n.container, ...(start ? triggerOf(start) : { kind: 'none' as const }),
      interrupting: !start || attr(start, 'isInterrupting') !== 'false',
      activities: ix.nodes.filter((x) => x.container === n.id && TASK_KINDS.includes(x.e.local)).map((x) => x.id) };
    if (n.phase !== undefined) v.phase = n.phase;
    const count = numAttr(f, 'count');
    if (f && count !== undefined) v.frequency = { count, per: str(attr(f, 'per')) };
    return v;
  });
}

function boundaryOf(ix: DocIndex, n: Placed): BoundaryView {
  const b: BoundaryView = { id: n.id, attachedTo: local(attr(n.e, 'attachedToRef')) ?? '', interrupting: attr(n.e, 'cancelActivity') !== 'false',
    container: n.container, ...triggerOf(n.e) };
  const name = attr(n.e, 'name'), flow = ix.nodes.find((x) => x.e.local === 'sequenceFlow' && attr(x.e, 'sourceRef') === n.id);
  if (name !== undefined) b.name = name;
  if (flow) b.target = str(attr(flow.e, 'targetRef'));
  return b;
}

const memo = new WeakMap<XElement, EventsView>();
export function readEvents(defs: XElement): EventsView {
  const hit = memo.get(defs);
  if (hit) return hit;
  const ix = indexOf(defs), definitions: Definition[] = [];
  for (const k of DEF_KINDS) {
    for (const e of kids(defs, NS.bpmn, k)) {
      const d: Definition = { id: str(attr(e, 'id')), kind: k, name: str(attr(e, 'name')) }, code = attr(e, `${k}Code`);
      if (code !== undefined) d.code = code;
      definitions.push(d);
    }
  }
  const ids = new Set(definitions.map((d) => d.id)), used = new Set<string>(), unresolved: EventsView['unresolved'] = [];
  const all = (e: XElement): XElement[] => [e, ...kids(e).flatMap(all)];
  for (const e of all(defs)) {
    for (const a of ['errorRef', 'escalationRef', 'signalRef', 'messageRef']) {
      const r = local(attr(e, a));
      if (r === undefined || e.ns !== NS.bpmn) continue;
      used.add(r);
      if (!ids.has(r)) unresolved.push({ element: str(attr(e, 'id')), ref: r });
    }
  }
  const out: EventsView = { definitions, boundary: ix.nodes.filter((n) => n.e.local === 'boundaryEvent').map((n) => boundaryOf(ix, n)),
    timers: timersOf(ix), eventSubs: eventSubsOf(ix), unresolved, unused: definitions.filter((d) => !used.has(d.id)).map((d) => d.id) };
  memo.set(defs, out);
  return out;
}
