/** @calc-zone workspace-config */
import type { DepEdges, DepGroup, DepSection } from './deps';

type Edge = [string, string];

/** Kahn's algorithm, deterministic; `rank` breaks ties (current menu position). On a cycle it force-emits the node with the fewest unmet
 *  dependencies and records every incoming edge it had to ignore (legacy depTopo). */
export function depTopo(nodes: string[], edgeList: Edge[], rank: (id: string) => number): { order: string[]; broken: Edge[] } {
  const adj = new Map<string, string[]>(), indeg = new Map<string, number>(), present = new Set(nodes);
  nodes.forEach((n) => { adj.set(n, []); indeg.set(n, 0); });
  for (const [a, b] of edgeList) if (present.has(a) && present.has(b) && a !== b) { adj.get(a)!.push(b); indeg.set(b, indeg.get(b)! + 1); }
  const out: string[] = [], broken: Edge[] = [], remaining = nodes.slice();
  for (let guard = 0; remaining.length && guard < 5000; guard++) {
    const ready = remaining.filter((n) => indeg.get(n) === 0).sort((a, b) => rank(a) - rank(b));
    let n: string;
    if (ready.length) n = ready[0]!;
    else {
      n = remaining.slice().sort((a, b) => (indeg.get(a)! - indeg.get(b)!) || (rank(a) - rank(b)))[0]!;
      for (const e of edgeList) if (e[1] === n && e[0] !== n && remaining.includes(e[0])) broken.push([e[0], e[1]]);
      indeg.set(n, 0);
    }
    out.push(n);
    remaining.splice(remaining.indexOf(n), 1);
    for (const t of adj.get(n)!) if (indeg.get(t)! > 0) indeg.set(t, indeg.get(t)! - 1);
  }
  return { order: out, broken };
}

export interface BuildOrder {
  gOrder: string[]; gLayer: Record<string, number>; gBroken: Edge[]; gEdges: Edge[]; gWeight: Record<string, number>;
  newGroupOrder: Record<string, number>; depth: Record<string, number>; newSeq: Record<string, number>;
}

/** The build-order proposal (legacy depTreeCompute): groups laid out in dependency order with feedback links set aside, sections ranked by
 *  dependency depth inside each group, existing order/seq slots preserved. Pure — nothing is applied. */
export function buildOrder(deps: DepEdges, sections: DepSection[], groups: DepGroup[], strongOnly = false): BuildOrder {
  const live = new Map(sections.map((s) => [s.id, s])), curGO: Record<string, number> = {};
  groups.forEach((g) => { curGO[g.id] = g.order; });
  const go = (id: string) => curGO[id] ?? 999;
  const edges: Edge[] = [];
  for (const src of Object.keys(deps)) if (live.has(src)) for (const tgt of Object.keys(deps[src] ?? {})) {
    if (live.has(tgt) && !(strongOnly && deps[src]![tgt] !== 'S')) edges.push([src, tgt]);
  }
  const gEdges: Edge[] = [], seen = new Set<string>(), touched = new Set<string>(), gWeight: Record<string, number> = {};
  for (const [s, t] of edges) {
    const a = live.get(s)!.group, b = live.get(t)!.group;
    touched.add(a); touched.add(b);
    if (a === b) continue;
    const k = `${a}>${b}`;
    gWeight[k] = (gWeight[k] ?? 0) + 1;
    if (!seen.has(k)) { seen.add(k); gEdges.push([a, b]); }
  }
  const gNodes = groups.filter((g) => touched.has(g.id)).map((g) => g.id);
  const gKept: Edge[] = [], gDropped: Edge[] = [];
  for (const e of gEdges) {   // weight-aware cycle breaking: keep the heavier arc of every mutual pair
    const f = gWeight[`${e[0]}>${e[1]}`] ?? 0, r = gWeight[`${e[1]}>${e[0]}`] ?? 0;
    if (r === 0 || f > r || (f === r && go(e[0]) <= go(e[1]))) gKept.push(e); else gDropped.push(e);
  }
  const gT = depTopo(gNodes, gKept, go), gBroken = gDropped.concat(gT.broken);
  const gSlots = gNodes.map((id) => curGO[id] as number).sort((a, b) => a - b), newGroupOrder: Record<string, number> = {};
  gT.order.forEach((id, i) => { newGroupOrder[id] = gSlots[i] as number; });
  const sT = depTopo(sections.map((s) => s.id), edges, (id) => go(live.get(id)!.group) * 10000 + (live.get(id)!.groupSeq || 0));
  const bySrc = new Map<string, string[]>(), depth: Record<string, number> = {};
  edges.forEach(([a, b]) => bySrc.set(a, [...(bySrc.get(a) ?? []), b]));
  sections.forEach((s) => { depth[s.id] = 0; });
  sT.order.forEach((n) => (bySrc.get(n) ?? []).forEach((t) => { if ((depth[t] as number) < (depth[n] as number) + 1) depth[t] = (depth[n] as number) + 1; }));
  const newSeq: Record<string, number> = {}, perGroup = new Map<string, DepSection[]>();
  sections.forEach((s) => perGroup.set(s.group, [...(perGroup.get(s.group) ?? []), s]));
  for (const list of perGroup.values()) {
    const slots = list.map((s) => s.groupSeq || 0).sort((a, b) => a - b);
    list.slice().sort((a, b) => ((depth[a.id] as number) - (depth[b.id] as number)) || ((a.groupSeq || 0) - (b.groupSeq || 0))).forEach((s, i) => {
      newSeq[s.id] = slots[i] as number;
    });
  }
  const gBySrc = new Map<string, string[]>(), gLayer: Record<string, number> = {}, brokenSet = new Set(gBroken.map((e) => `${e[0]}>${e[1]}`));
  gKept.forEach(([a, b]) => gBySrc.set(a, [...(gBySrc.get(a) ?? []), b]));
  gNodes.forEach((n) => { gLayer[n] = 0; });
  gT.order.forEach((n) => (gBySrc.get(n) ?? []).forEach((t) => {
    if (!brokenSet.has(`${n}>${t}`) && (gLayer[t] as number) < (gLayer[n] as number) + 1) gLayer[t] = (gLayer[n] as number) + 1;
  }));
  return { gOrder: gT.order, gLayer, gBroken, gEdges: gKept, gWeight, newGroupOrder, depth, newSeq };
}
