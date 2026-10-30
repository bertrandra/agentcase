/** @calc-zone process-model */
import { attr, el, kid, kids, NS, text, textOf, type XDocument, type XElement } from '../xml';
import { activityFacts } from './acts';
import { replaceKids } from './ext';
import { COLLABORATION_RANK, editDoc, insertIn, type Rank } from './tree';
import { acOf, indexOf, local, numAttr, str } from './walk';

/**
 * Interfaces between units (spec F-B55–F-B57; phase B5b): pools (`participant`, with `participantMultiplicity` for "three vendors of the same
 * kind"), message flows carrying hand-off packages (`messageRef`, `ac:handoffCost hours costShare`), send / receive tasks, and the conversation
 * view generated from the message flows (who talks to whom, for steering committees). Feeds the number of interfaces per pool, the hand-offs
 * per activity and the coordination cost (hours: each flow's hours times the multiplicity of the pool on the other side).
 */
export interface PoolView { id: string; name: string; process?: string; min: number; max: number }
export interface MessageFlowView {
  id: string; name?: string; source: string; target: string; from?: string; to?: string; message?: string; hours: number; costShare?: number;
}
export interface ConversationView { id: string; name: string; participants: string[]; flows: string[] }
export interface CollabView { pools: PoolView[]; flows: MessageFlowView[]; conversations: ConversationView[] }

const collabs = (defs: XElement): XElement[] => kids(defs, NS.bpmn, 'collaboration');
export function readCollab(defs: XElement): CollabView {
  const ix = indexOf(defs), ps = collabs(defs).flatMap((c) => kids(c, NS.bpmn, 'participant'));
  const pools = ps.map((p): PoolView => {
    const m = kid(p, NS.bpmn, 'participantMultiplicity'), min = numAttr(m, 'minimum') ?? (m ? 0 : 1), v: PoolView = { id: str(attr(p, 'id')),
      name: str(attr(p, 'name')), min, max: numAttr(m, 'maximum') ?? Math.max(1, min) };
    const pr = local(attr(p, 'processRef'));
    if (pr) v.process = pr;
    return v;
  });
  const poolOf = (id: string): string | undefined => pools.find((p) => p.id === id)?.id ?? pools.find((p) => p.process === ix.byId.get(id)?.process)?.id;
  const flows = collabs(defs).flatMap((c) => kids(c, NS.bpmn, 'messageFlow')).map((f): MessageFlowView => {
    const h = acOf(f, 'handoffCost'), v: MessageFlowView = { id: str(attr(f, 'id')), source: local(attr(f, 'sourceRef')) ?? '',
      target: local(attr(f, 'targetRef')) ?? '', hours: numAttr(h, 'hours') ?? 0 };
    const opt = { name: attr(f, 'name'), message: local(attr(f, 'messageRef')), from: poolOf(v.source), to: poolOf(v.target), costShare: numAttr(h,
      'costShare') };
    for (const [k, x] of Object.entries(opt)) if (x !== undefined) Object.assign(v, { [k]: x });
    return v;
  });
  const conversations = collabs(defs).flatMap((c) => kids(c, NS.bpmn, 'conversation')).map((c) => ({ id: str(attr(c, 'id')), name: str(attr(c, 'name')),
    participants: kids(c, NS.bpmn, 'participantRef').map((r) => textOf(r).trim()), flows: kids(c, NS.bpmn, 'messageFlowRef').map((r) => textOf(r).trim()) }));
  return { pools, flows, conversations };
}

/** Distinct pools each pool exchanges messages with (the interfaces of a product or unit). */
export function interfacesOf(defs: XElement): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const f of readCollab(defs).flows) {
    if (!f.from || !f.to || f.from === f.to) continue;
    for (const [a, b] of [[f.from, f.to], [f.to, f.from]] as const) { const l = out.get(a) ?? []; if (!l.includes(b)) l.push(b); out.set(a, l); }
  }
  return out;
}

export interface Handoffs { byActivity: Map<string, number>; hours: number }
/** Hand-offs per activity (message flows touching it, plus one for a send or receive task) and the coordination cost in hours. */
export function handoffsOf(defs: XElement): Handoffs {
  const c = readCollab(defs), ix = indexOf(defs), byActivity = new Map<string, number>(), pools = new Map(c.pools.map((p) => [p.id, p]));
  const bump = (id: string): void => { if (ix.byId.has(id)) byActivity.set(id, (byActivity.get(id) ?? 0) + 1); };
  let hours = 0;
  for (const f of c.flows) {
    bump(f.source);
    bump(f.target);
    const other = ix.byId.has(f.source) ? f.to : f.from;
    hours += f.hours * (other ? pools.get(other)?.max ?? 1 : 1);
  }
  for (const a of activityFacts(defs).values()) {
    if (a.type !== 'Send' && a.type !== 'Receive') continue;
    if (!byActivity.has(a.id)) byActivity.set(a.id, 1);
    hours += numAttr(acOf(ix.byId.get(a.id)?.e as XElement, 'handoffCost'), 'hours') ?? 0;
  }
  return { byActivity, hours };
}

const collabId = (d: XDocument): string => str(attr(collabs(d.root)[0] ?? d.root, 'id'));
/** A pool (participant) in the collaboration, optionally black-box (no process) and multiple (`participantMultiplicity`). */
export function addPool(d: XDocument, p: { id: string; name: string; process?: string; min?: number; max?: number }): XDocument {
  const m = p.min !== undefined || p.max !== undefined ? [el('bpmn:participantMultiplicity', { minimum: p.min, maximum: p.max })] : [];
  return insertIn(d, collabId(d), el('bpmn:participant', { id: p.id, name: p.name, processRef: p.process }, m), COLLABORATION_RANK);
}
const POOL_RANK: Rank = (l) => ['documentation', 'extensionElements', 'interfaceRef', 'participantMultiplicity'].indexOf(l);
/** The multiplicity of a pool (null: one). */
export const setMultiplicity = (d: XDocument, pool: string, min: number | null, max?: number): XDocument =>
  editDoc(d, pool, (e) => replaceKids(e, ['participantMultiplicity'], min === null ? null : el('bpmn:participantMultiplicity', { minimum: min,
    maximum: max }), POOL_RANK));
/** A message flow carrying a hand-off package, with its coordination cost. */
export function addMessageFlow(d: XDocument,
  f: { id: string; source: string; target: string; name?: string; message?: string; hours?: number; costShare?: number }): XDocument {
  const ext = f.hours !== undefined || f.costShare !== undefined ? [el('bpmn:extensionElements', {}, [el('ac:handoffCost', { hours: f.hours,
    costShare: f.costShare })])] : [];
  return insertIn(d, collabId(d), el('bpmn:messageFlow', { id: f.id, name: f.name, sourceRef: f.source, targetRef: f.target, messageRef: f.message }, ext),
    COLLABORATION_RANK);
}

/** The conversation view (F-B57): one conversation per pair of pools that exchange messages, with its flows and links; generated, never stored. */
export function conversationView(d: XDocument): XDocument {
  const c = readCollab(d.root), pairs = new Map<string, { a: string; b: string; flows: string[] }>();
  for (const f of c.flows) {
    if (!f.from || !f.to || f.from === f.to) continue;
    const [a, b] = [f.from, f.to].sort() as [string, string], k = `${a}|${b}`;
    (pairs.get(k) ?? pairs.set(k, { a, b, flows: [] }).get(k))?.flows.push(f.id);
  }
  const name = (id: string): string => c.pools.find((p) => p.id === id)?.name ?? id, ref = (q: string, v: string) => el(q, {}, [text(v)]);
  let out = d, i = 0;
  for (const p of pairs.values()) {
    const id = `Conversation_${++i}`;
    out = insertIn(out, collabId(out), el('bpmn:conversation', { id, name: `${name(p.a)} ↔ ${name(p.b)}` }, [ref('bpmn:participantRef', p.a),
      ref('bpmn:participantRef', p.b), ...p.flows.map((f) => ref('bpmn:messageFlowRef', f))]), COLLABORATION_RANK);
    for (const x of [p.a, p.b]) out = insertIn(out, collabId(out), el('bpmn:conversationLink', { id: `${id}_${x}`, sourceRef: x, targetRef: id }),
      COLLABORATION_RANK);
  }
  return out;
}
