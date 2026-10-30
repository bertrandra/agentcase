/** @calc-zone process-model */
import { attr, kids, NS, type XElement } from '../xml';
import { activityFacts } from './acts';
import { readEvents, type BoundaryView } from './events';
import { acOf, indexOf, local, numAttr, refOf, str } from './walk';

/**
 * What the events feed (spec F-B45, F-B47, F-B50; phase B5b): the delivery cadence (a cycle timer on a start event: `R/P2W` = a two-week sprint),
 * waiting time per phase (timer catch events: approval lead time), service levels (timer boundary events), the escalation check (an escalation
 * boundary event hands over to the activity's Accountable, F-B47 with § 16: none is a finding) and compensation (rollback handlers, F-B50:
 * expected cost = handler effort × change-failure rate, `ac:changeFailure probability`).
 */
export interface Cadence { event: string; iso: string; days: number; repeat?: number }
/** The delivery cadence: the first cycle timer on a start event of the main process (else of any process). */
export function cadenceOf(defs: XElement): Cadence | undefined {
  const ix = indexOf(defs), ts = readEvents(defs).timers.filter((t) => t.element === 'startEvent' && t.cycle && t.days !== undefined);
  const t = ts.find((x) => ix.byId.get(x.id)?.process === ix.main) ?? ts[0];
  if (!t) return undefined;
  const c: Cadence = { event: t.id, iso: t.iso, days: t.days as number };
  if (t.repeat !== undefined) c.repeat = t.repeat;
  return c;
}

/** Waiting time in days per container (phase or process): the timer catch events of each. */
export function waitsOf(defs: XElement): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of readEvents(defs).timers.filter((x) => x.element === 'intermediateCatchEvent' && x.days !== undefined)) {
    const k = t.phase ?? t.container;
    out.set(k, (out.get(k) ?? 0) + (t.days as number));
  }
  return out;
}

/** The service levels: timer boundary events, with their limit in days and the escalation path they start. */
export const serviceLevels = (defs: XElement): BoundaryView[] => readEvents(defs).boundary.filter((b) => b.kind === 'timer');

/** The Accountable role of a task (`resourceRole name="Accountable"`, else `ac:raci accountable`). */
function accountableOf(task: XElement): string | undefined {
  const rr = kids(task, NS.bpmn, 'resourceRole').find((r) => attr(r, 'name') === 'Accountable');
  return (rr ? refOf(rr, 'resourceRef') : undefined) ?? attr(acOf(task, 'raci') ?? task, 'accountable');
}
export interface Escalation { event: string; activity: string; accountable?: string; interrupting: boolean }
/** Escalation boundary events, with the Accountable who takes over (absent: a finding, "escalation with no Accountable"). */
export function escalationsOf(defs: XElement): Escalation[] {
  const ix = indexOf(defs);
  return readEvents(defs).boundary.filter((b) => b.kind === 'escalation').map((b) => {
    const t = ix.byId.get(b.attachedTo)?.e, a = t ? accountableOf(t) : undefined, out: Escalation = { event: b.id, activity: b.attachedTo,
      interrupting: b.interrupting };
    if (a !== undefined) out.accountable = a;
    return out;
  });
}

export interface Compensation {
  handler: string; activity?: string; event?: string;
  /** change-failure rate: the handler's `ac:changeFailure`, else the compensation event's; 0 when neither says (listed in `unrated`) */
  probability: number; rated: boolean; effort: number; expected: number;
}
/** Compensation handlers (`isForCompensation`) with the activity they roll back (through the compensation boundary event's association). */
export function compensationOf(defs: XElement): Compensation[] {
  const ix = indexOf(defs), facts = activityFacts(defs), ev = readEvents(defs).boundary.filter((b) => b.kind === 'compensate');
  const links = ix.nodes.filter((n) => n.e.local === 'association').map((n) => [str(attr(n.e, 'sourceRef')), str(attr(n.e, 'targetRef'))] as const);
  return [...facts.values()].filter((f) => f.compensation).map((f) => {
    const e = ev.find((b) => links.some(([s, t]) => local(s) === b.id && local(t) === f.id)), own = numAttr(acOf(ix.byId.get(f.id)?.e as XElement,
      'changeFailure'), 'probability');
    const p = own ?? (e ? numAttr(acOf(ix.byId.get(e.id)?.e as XElement, 'changeFailure'), 'probability') : undefined);
    const c: Compensation = { handler: f.id, probability: p ?? 0, rated: p !== undefined, effort: f.effort, expected: (p ?? 0) * f.effort };
    if (e) { c.event = e.id; c.activity = e.attachedTo; }
    return c;
  });
}
/** The change-failure rate the model gives (effort-weighted over the rated handlers in scope), or undefined without one: the DORA input. */
export function changeFailureRate(defs: XElement): number | undefined {
  const facts = activityFacts(defs), cs = compensationOf(defs).filter((c) => c.rated && facts.get(c.handler)?.inScope);
  const w = cs.reduce((s, c) => s + c.effort, 0);
  if (!cs.length) return undefined;
  return w ? cs.reduce((s, c) => s + c.probability * c.effort, 0) / w : cs.reduce((s, c) => s + c.probability, 0) / cs.length;
}
