/** @calc-zone process-model */
import { attr, type XElement } from '../xml';
import { activityFacts } from './acts';
import { readData, type DataLink, type DataNode, type DeliverableKind } from './data';
import { readLoops } from './loops';
import { indexOf } from './walk';

/**
 * What the data of a process feeds (spec F-B41–F-B43; phase B5b):
 * - **tool access**: per activity, the stores it reads or writes, the catalogue tools behind them and the integration surface they offer; an agent
 *   activity whose store offers no machine access (API, MCP or CLI) is "agent blocked: no API to its data store";
 * - **Knowledge Hub**: the store agents read context from, and its curation load (the effort of the in-scope activities that write it);
 * - **states**: a gate (`ac:requiresState`) whose inputs have not reached the required state; the evidence count (deliverables of in-scope
 *   activities at "approved" or beyond, a collection counting its volume);
 * - **types**: the token profile of an activity's work (code or prose) from the kinds of what it produces.
 */
export const DATA_STATES: readonly string[] = ['draft', 'reviewed', 'approved', 'baselined'];
const MACHINE: readonly string[] = ['api', 'mcp', 'cli'];

export interface StoreAccess { activity: string; agent: boolean; stores: string[]; tools: string[]; integration: string[]; blocked: string[] }
export function storeAccess(defs: XElement): StoreAccess[] {
  const v = readData(defs), facts = activityFacts(defs), stores = new Map(v.nodes.filter((n) => n.store).map((n) => [n.id, n]));
  const by = new Map<string, Set<string>>();
  for (const l of v.links) if (stores.has(l.data)) (by.get(l.activity) ?? by.set(l.activity, new Set()).get(l.activity) as Set<string>).add(l.data);
  return [...by].filter(([a]) => facts.get(a)?.inScope).map(([activity, ids]) => {
    const ss = [...ids].map((i) => stores.get(i) as DataNode), agent = facts.get(activity)?.agent ?? false;
    const machine = (s: DataNode): boolean => s.tools.some((t) => t.integration.some((x) => MACHINE.includes(x)));
    return { activity, agent, stores: [...ids], tools: [...new Set(ss.flatMap((s) => s.tools.map((t) => t.ref)))],
      integration: [...new Set(ss.flatMap((s) => s.tools.flatMap((t) => t.integration)))],
      blocked: agent ? ss.filter((s) => !machine(s)).map((s) => s.id) : [] };
  });
}
/** "Agent blocked: no API to its data store" findings. */
export const agentBlocked = (defs: XElement): { activity: string; store: string }[] =>
  storeAccess(defs).flatMap((a) => a.blocked.map((store) => ({ activity: a.activity, store })));

export const isKnowledgeHub = (n: DataNode): boolean => n.store && (/knowledge\s*hub/i.test(n.name) || n.tools.some((t) => t.ref === 'knowledge-hub'));
/** The Knowledge Hub store and its curation load: the effort (× factor) of the in-scope activities that write it. */
export function knowledgeHub(defs: XElement): { store: string; writers: string[]; readers: string[]; load: number } | undefined {
  const v = readData(defs), hub = v.nodes.find(isKnowledgeHub), facts = activityFacts(defs), loops = readLoops(defs);
  if (!hub) return undefined;
  const on = (a: string) => facts.get(a)?.inScope ?? false, ls = v.links.filter((l) => l.data === hub.id && on(l.activity));
  const writers = [...new Set(ls.filter((l) => l.dir === 'out').map((l) => l.activity))];
  const readers = [...new Set(ls.filter((l) => l.dir === 'in').map((l) => l.activity))];
  return { store: hub.id, writers, readers, load: writers.reduce((s, a) => s + (facts.get(a)?.effort ?? 0) * (loops.multi.get(a)?.items ?? 1), 0) };
}

const rankOf = (s: string | undefined, order: readonly string[]): number => (s === undefined ? -1 : order.indexOf(s.toLowerCase()));
export interface GateCheck { activity: string; requires: string; inputs: { data: string; state?: string }[]; ok: boolean }
/** Gates and approvals with `ac:requiresState`: each needs at least one input, every input at the required state or beyond. */
export function gateStates(defs: XElement, order: readonly string[] = DATA_STATES): GateCheck[] {
  const v = readData(defs);
  return indexOf(defs).nodes.filter((n) => attr(n.e, 'ac:requiresState') !== undefined).map((n) => {
    const requires = attr(n.e, 'ac:requiresState') as string, need = rankOf(requires, order);
    const inputs = v.links.filter((l) => l.activity === n.id && l.dir === 'in').map((l) => (l.state === undefined ? { data: l.data } : { data: l.data,
      state: l.state }));
    return { activity: n.id, requires, inputs, ok: inputs.length > 0 && inputs.every((i) => rankOf(i.state, order) >= need && need >= 0) };
  });
}

/** Deliverables of in-scope activities that reached "approved" or beyond (F-B42: the Defend group's evidence); a collection counts its volume. */
export function evidenceCount(defs: XElement, order: readonly string[] = DATA_STATES): { deliverables: number; approved: number; baselined: number } {
  const v = readData(defs), facts = activityFacts(defs), loops = readLoops(defs), nodes = new Map(v.nodes.map((n) => [n.id, n]));
  let deliverables = 0, approved = 0, baselined = 0;
  // one deliverable per activity and data (a task writing its data object and a reference to it produces it once), the most advanced state
  const best = new Map<string, DataLink>();
  for (const l of v.links.filter((x) => x.dir === 'out' && facts.get(x.activity)?.inScope && !nodes.get(x.data)?.store)) {
    const k = `${l.activity}|${l.data}`, cur = best.get(k);
    if (!cur || rankOf(l.state, order) > rankOf(cur.state, order)) best.set(k, l);
  }
  for (const l of best.values()) {
    const n = nodes.get(l.data)?.collection ? loops.multi.get(l.activity)?.items ?? 1 : 1, r = rankOf(l.state, order);
    deliverables += n;
    if (r >= rankOf('approved', order)) approved += n;
    if (r >= rankOf('baselined', order)) baselined += n;
  }
  return { deliverables, approved, baselined };
}

const CODE: readonly DeliverableKind[] = ['code', 'testSuite'];
/** The token profile of an activity's work: `code` when it produces code or test suites, `prose` for other typed deliverables, else undefined. */
export function tokenProfile(defs: XElement, activity: string): 'code' | 'prose' | undefined {
  const v = readData(defs), nodes = new Map(v.nodes.map((n) => [n.id, n]));
  const kinds = v.links.filter((l) => l.activity === activity && l.dir === 'out').map((l) => nodes.get(l.data)?.kind).filter((k) => k !== undefined);
  if (!kinds.length) return undefined;
  return kinds.some((k) => CODE.includes(k)) ? 'code' : 'prose';
}
