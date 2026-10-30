/** @calc-zone process-model */
import { attr, kids, NS, type XElement } from '../xml';
import { indexOf, local, refOf, refsOf, str, tasksOf, type DocIndex } from './walk';

/**
 * The data of a process (spec § 17.1, F-B40–F-B43; phase B5b): deliverables (`dataObject`, `dataObjectReference`), repositories
 * (`dataStore`, `dataStoreReference` with the tools they are, `ac:tool`), their states (`dataState`), types (`itemDefinition`, `import`) and
 * which activity reads (`dataInputAssociation`, `ioSpecification`) or writes (`dataOutputAssociation`) what. A reference resolves to the object
 * or store it points to, so two references to one deliverable are one node of the traceability graph.
 */
export const DELIVERABLE_KINDS = ['document', 'code', 'testSuite', 'model', 'record', 'dataset'] as const;
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];
export interface ToolUse { ref: string; integration: string[]; hosting?: string }
export interface DataNode {
  /** the object or store id (a reference resolves to it) */
  id: string; name: string; store: boolean; collection: boolean;
  /** the item definition typing it, and the deliverable kind read from it */
  item?: string; kind?: DeliverableKind;
  /** the tools a data store is (`ac:tool` in its extension elements) */
  tools: ToolUse[];
}
export interface DataLink {
  activity: string; data: string; dir: 'in' | 'out';
  /** the reference element the association names, and its state (F-B42) */
  via?: string; state?: string;
}
export interface ItemType { id: string; kind?: DeliverableKind; collection: boolean; structure?: string; import?: string }
export interface ImportView { namespace: string; location: string; importType: string }
/** An input declared in an activity's `ioSpecification` that no association feeds. */
export interface Unbound { activity: string; input: string; name: string }
export interface DataView { nodes: DataNode[]; links: DataLink[]; items: ItemType[]; imports: ImportView[]; unbound: Unbound[] }

const lower = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '');
/** The deliverable kind an item definition names (its id, name or structure, case and punctuation ignored). */
export function kindOf(...names: (string | undefined)[]): DeliverableKind | undefined {
  for (const n of names) {
    if (!n) continue;
    const l = lower(local(n) ?? n), k = DELIVERABLE_KINDS.find((x) => l === lower(x) || l.endsWith(lower(x)));
    if (k) return k;
  }
  return undefined;
}

function itemsOf(defs: XElement): ItemType[] {
  return kids(defs, NS.bpmn, 'itemDefinition').map((e) => {
    const s = attr(e, 'structureRef'), out: ItemType = { id: str(attr(e, 'id')), collection: attr(e, 'isCollection') === 'true' };
    const k = kindOf(attr(e, 'name'), s, attr(e, 'id'));
    if (k) out.kind = k;
    if (s !== undefined) { out.structure = s; const p = s.includes(':') ? s.slice(0, s.indexOf(':')) : undefined; if (p) out.import = p; }
    return out;
  });
}

const toolsOf = (e: XElement): ToolUse[] => kids(e, NS.bpmn, 'extensionElements').flatMap((x) => kids(x, NS.ac, 'tool')).map((t) => {
  const u: ToolUse = { ref: str(attr(t, 'ref')), integration: str(attr(t, 'integration')).split(/\s+/).filter(Boolean) };
  const h = attr(t, 'hosting');
  if (h !== undefined) u.hosting = h;
  return u;
});

function nodesOf(ix: DocIndex, items: Map<string, ItemType>): { nodes: DataNode[]; refs: Map<string, { target: string; state?: string }> } {
  const nodes: DataNode[] = [], refs = new Map<string, { target: string; state?: string }>();
  const add = (e: XElement, store: boolean): void => {
    const item = local(attr(e, 'itemSubjectRef')), it = item ? items.get(item) : undefined;
    const n: DataNode = { id: str(attr(e, 'id')), name: str(attr(e, 'name')), store,
      collection: attr(e, 'isCollection') === 'true' || !!it?.collection, tools: store ? toolsOf(e) : [] };
    if (item) n.item = item;
    if (it?.kind) n.kind = it.kind;
    nodes.push(n);
  };
  for (const s of kids(ix.defs, NS.bpmn, 'dataStore')) add(s, true);
  for (const p of ix.nodes) {
    if (p.e.local === 'dataObject') add(p.e, false);
    if (p.e.local !== 'dataObjectReference' && p.e.local !== 'dataStoreReference') continue;
    const target = local(attr(p.e, p.e.local === 'dataObjectReference' ? 'dataObjectRef' : 'dataStoreRef')) ?? p.id;
    const st = kids(p.e, NS.bpmn, 'dataState')[0], r: { target: string; state?: string } = { target };
    if (st && attr(st, 'name')) r.state = attr(st, 'name');
    refs.set(p.id, r);
  }
  return { nodes, refs };
}

const memo = new WeakMap<XElement, DataView>();
/** The data view of a document's definitions. */
export function readData(defs: XElement): DataView {
  const hit = memo.get(defs);
  if (hit) return hit;
  const ix = indexOf(defs), items = itemsOf(defs), { nodes, refs } = nodesOf(ix, new Map(items.map((i) => [i.id, i])));
  const links: DataLink[] = [], unbound: Unbound[] = [];
  const link = (activity: string, id: string, dir: 'in' | 'out'): void => {
    const r = refs.get(id), l: DataLink = { activity, data: r?.target ?? id, dir };
    if (r) { l.via = id; if (r.state !== undefined) l.state = r.state; }
    links.push(l);
  };
  for (const t of tasksOf(ix)) {
    const fed = new Set<string>();
    for (const a of kids(t.e, NS.bpmn, 'dataInputAssociation')) {
      for (const s of refsOf(a, 'sourceRef')) link(t.id, s, 'in');
      const tg = refOf(a, 'targetRef');
      if (tg) fed.add(tg);
    }
    for (const a of kids(t.e, NS.bpmn, 'dataOutputAssociation')) { const tg = refOf(a, 'targetRef'); if (tg) link(t.id, tg, 'out'); }
    for (const io of kids(t.e, NS.bpmn, 'ioSpecification')) {
      for (const i of kids(io, NS.bpmn, 'dataInput')) {
        const id = str(attr(i, 'id'));
        if (!fed.has(id)) unbound.push({ activity: t.id, input: id, name: str(attr(i, 'name')) });
      }
    }
  }
  const imports = kids(defs, NS.bpmn, 'import').map((e) => ({ namespace: str(attr(e, 'namespace')), location: str(attr(e, 'location')),
    importType: str(attr(e, 'importType')) }));
  const out: DataView = { nodes, links, items, imports, unbound };
  memo.set(defs, out);
  return out;
}
