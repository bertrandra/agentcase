/** @calc-zone process-model */
import { el, text, type XDocument, type XElement } from '../xml';
import type { DefKind } from './events';
import { setAc } from './ext';
import { ACTIVITY_RANK, CONTAINER_RANK, DEFINITIONS_RANK, editDoc, fitted, insertChild, insertIn, SUBPROCESS_RANK } from './tree';

/**
 * Writers of the events of the extended profile (spec F-B45, F-B47–F-B50; phase B5b): root definitions referenced by events, boundary events
 * (with the flow to the path they start), cadence and waiting timers, event sub-processes with their frequency, compensation handlers.
 */
const REF: Record<DefKind, string> = { error: 'errorRef', escalation: 'escalationRef', signal: 'signalRef', message: 'messageRef' };
const CODE: Partial<Record<DefKind, string>> = { error: 'errorCode', escalation: 'escalationCode' };

/** A reusable root definition (F-B48): "Defect escaped", "Escalate to Accountable", "Release published", "Hand-off package". */
export function addDefinition(d: XDocument, kind: DefKind, id: string, name: string, code?: string): XDocument {
  const c = CODE[kind];
  return insertIn(d, null, el(`bpmn:${kind}`, { id, name, ...(c && code ? { [c]: code } : {}) }), DEFINITIONS_RANK);
}

export type TriggerInput =
  | { kind: DefKind; ref?: string } | { kind: 'timer'; duration?: string; cycle?: string } | { kind: 'compensate' } | { kind: 'none' };
/** The event definition element of a trigger. */
export function definitionOf(id: string, t: TriggerInput): XElement[] {
  if (t.kind === 'none') return [];
  if (t.kind === 'timer') {
    const v = t.cycle ? el('bpmn:timeCycle', {}, [text(t.cycle)]) : el('bpmn:timeDuration', {}, [text(t.duration ?? '')]);
    return [el('bpmn:timerEventDefinition', { id: `${id}_def` }, [v])];
  }
  if (t.kind === 'compensate') return [el('bpmn:compensateEventDefinition', { id: `${id}_def` })];
  return [el(`bpmn:${t.kind}EventDefinition`, { id: `${id}_def`, [REF[t.kind]]: t.ref ?? null })];
}

export interface BoundaryInput {
  id: string; container: string; attachedTo: string; trigger: TriggerInput; name?: string; interrupting?: boolean;
  /** the element the path leads to (a sequence flow `<id>_flow` is written), and the `ac:` extension of the event (rework, changeFailure) */
  target?: string; ext?: XElement[];
}
/** A boundary event on an activity or a phase, with the sequence flow of its path. */
export function addBoundary(d: XDocument, b: BoundaryInput): XDocument {
  const ev = el('bpmn:boundaryEvent', { id: b.id, name: b.name, attachedToRef: b.attachedTo, cancelActivity: b.interrupting === false ? 'false' : null }, [
    ...(b.ext?.length ? [el('bpmn:extensionElements', {}, b.ext)] : []), ...definitionOf(b.id, b.trigger)]);
  const out = insertIn(d, b.container, ev, CONTAINER_RANK);
  return b.target ? insertIn(out, b.container, el('bpmn:sequenceFlow', { id: `${b.id}_flow`, sourceRef: b.id, targetRef: b.target }), CONTAINER_RANK) : out;
}

/** The delivery cadence (F-B45): a cycle timer (`R/P2W`) on a start event; null removes the timer. */
export function setCadence(d: XDocument, startEvent: string, cycle: string | null): XDocument {
  return editDoc(d, startEvent, (e) => {
    const kept = { ...e, children: e.children.filter((c) => !(c.kind === 'element' && c.local.endsWith('EventDefinition'))) };
    return cycle ? insertChild(kept, fitted(kept, definitionOf(startEvent, { kind: 'timer', cycle })[0] as XElement), () => 9) : kept;
  });
}

/** A waiting time (approval lead time, F-B45): a timer catch event in a container, `duration` in ISO 8601 (`P3D`). */
export const addWait = (d: XDocument, container: string, id: string, duration: string, name?: string): XDocument =>
  insertIn(d, container, el('bpmn:intermediateCatchEvent', { id, name }, definitionOf(id, { kind: 'timer', duration })), CONTAINER_RANK);

export interface EventSubInput {
  id: string; name: string; container: string; trigger: TriggerInput; interrupting?: boolean;
  frequency: { count: number; per: string; source?: string; date?: string };
}
/** An event sub-process (F-B49: incident, audit request, vulnerability, change request) with its start event and frequency; tasks are added after. */
export function addEventSub(d: XDocument, s: EventSubInput): XDocument {
  const start = el('bpmn:startEvent', { id: `${s.id}_start`, isInterrupting: s.interrupting ? null : 'false' }, definitionOf(`${s.id}_start`, s.trigger));
  const sub = el('bpmn:subProcess', { id: s.id, name: s.name, triggeredByEvent: 'true' }, [
    el('bpmn:extensionElements', {}, [el('ac:frequency', s.frequency)]), start]);
  return insertIn(d, s.container, sub, CONTAINER_RANK);
}
/** A task appended inside an event sub-process (or any sub-process), after its flow elements' place. */
export const addInside = (d: XDocument, sub: string, task: XElement): XDocument =>
  editDoc(d, sub, (e) => insertChild(e, fitted(e, task), SUBPROCESS_RANK));

/**
 * A compensation handler (F-B50): a task `isForCompensation` with its change-failure rate (`ac:changeFailure`), the compensation boundary event
 * on the activity it rolls back, and the association between them.
 */
export function addCompensation(d: XDocument, c: { container: string; activity: string; handler: XElement; probability: number }): XDocument {
  const hid = c.handler.attrs.find((a) => a.name === 'id')?.value ?? '', ev = `${c.activity}_compensate`;
  const h = { ...c.handler, attrs: [...c.handler.attrs.filter((a) => a.name !== 'isForCompensation'), { name: 'isForCompensation', ns: '', value: 'true' }] };
  const withRate = setAc(h, 'changeFailure', el('ac:changeFailure', { probability: c.probability }), ACTIVITY_RANK);
  let out = addBoundary(d, { id: ev, container: c.container, attachedTo: c.activity, trigger: { kind: 'compensate' } });
  out = insertIn(out, c.container, withRate, CONTAINER_RANK);
  return insertIn(out, c.container, el('bpmn:association', { id: `${ev}_assoc`, sourceRef: ev, targetRef: hid, associationDirection: 'One' }), CONTAINER_RANK);
}
