/** @calc-zone process-model */
import { handoffsOf, readCollab, readData, type DeliverableKind } from '../process/profile';
import type { XDocument } from '../process/xml';
import { capabilityKey, proposedTools } from './catalog';
import type { CatalogTool } from './types';

/**
 * What the process model gives the audit of an activity (SPEC_FIXES FX-33; docs/SPEC_BPMN.md F-B43, F-B55):
 * - the kinds of the deliverables it reads or writes (`itemDefinition` types) and the tools proposed for them, on top of those of its capability:
 *   a document → Documentation, code → Coding and Review, a test suite → Test, a model → Design, a record → Compliance, a dataset → Analysis;
 * - its modelled hand-offs (message flows touching it, a send / receive task) and the other pools it exchanges with, shown next to the
 *   observed "Flow" values of § 15.3. A view: no figure reads it (D-B11).
 */
export const KIND_CAPABILITIES: Readonly<Record<DeliverableKind, readonly string[]>> = {
  document: ['Documentation'], code: ['Coding', 'Review'], testSuite: ['Test'], model: ['Design'], record: ['Compliance'], dataset: ['Analysis'],
};

/** The deliverable kinds an activity reads or writes, in the order of {@link KIND_CAPABILITIES}. */
export function deliverableKinds(d: XDocument, id: string): DeliverableKind[] {
  const v = readData(d.root), nodes = new Map(v.nodes.map((n) => [n.id, n])), kinds = new Set<DeliverableKind>();
  for (const l of v.links) { const k = l.activity === id ? nodes.get(l.data)?.kind : undefined; if (k) kinds.add(k); }
  return (Object.keys(KIND_CAPABILITIES) as DeliverableKind[]).filter((k) => kinds.has(k));
}

/** The tools proposed by the deliverable kinds and not already proposed by the activity's capability (same order and search as F-B24). */
export function proposedByType(catalog: readonly CatalogTool[], kinds: readonly DeliverableKind[], capability: string | undefined, search = ''): CatalogTool[] {
  const own = capabilityKey(capability), seen = new Set(own ? proposedTools(catalog, capability, search).map((t) => t.code) : []), out: CatalogTool[] = [];
  for (const cap of [...new Set(kinds.flatMap((k) => KIND_CAPABILITIES[k]))].filter((c) => capabilityKey(c) !== own)) {
    for (const t of proposedTools(catalog, cap, search)) if (!seen.has(t.code)) { seen.add(t.code); out.push(t); }
  }
  return out;
}

export interface InterfaceFacts { handoffs: number; pools: string[] }
/** The modelled hand-offs of an activity and the names of the pools at the other end of its message flows. */
export function interfaceFacts(d: XDocument, id: string): InterfaceFacts {
  const c = readCollab(d.root), names = new Map(c.pools.map((p) => [p.id, p.name || p.id])), pools = new Set<string>();
  for (const f of c.flows) {
    const other = f.source === id ? f.to : f.target === id ? f.from : undefined;
    if (other) pools.add(names.get(other) ?? other);
  }
  return { handoffs: handoffsOf(d.root).byActivity.get(id) ?? 0, pools: [...pools] };
}
