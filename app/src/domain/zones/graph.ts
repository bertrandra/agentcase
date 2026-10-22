/** @calc-zone workspace-config */
/** `r` a section reads a zone (zone feeds section), `w` an input section writes a zone through a controller (section feeds zone), `z` a zone imports another (source feeds importer). */
export type EdgeKind = 'r' | 'w' | 'z';
/** [source, target, kind, number of modules involved]: the data flows from the source to the target. */
export type DepEdge = [string, string, EdgeKind, number];
export interface DepSectionNode { id: string; label: string; group: string; kind: string; files: number }
export interface DepsData {
  schema: number;
  counts: { files: number; tagged: number; tests: number };
  /** per zone: tagged modules, and how many test files reach a module of the zone (median and worst module) */
  zones: { id: string; modules: number; tmed: number; tmax: number }[];
  sections: DepSectionNode[];
  edges: DepEdge[];
  figures: { id: string; owner: string; consumers: string[] }[];
  ignored: { path: string; reason: string }[];
  /** [test file, indexes into `zones`, indexes into `sections`] reached by the import closure of the test */
  tests: [string, number[], number[]][];
}

const adj = (edges: DepEdge[], dir: 'out' | 'in'): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  for (const [a, b] of edges) { const [k, v] = dir === 'out' ? [a, b] : [b, a]; (m.get(k) ?? m.set(k, []).get(k)!).push(v); }
  return m;
};
function reach(edges: DepEdge[], start: Iterable<string>, dir: 'out' | 'in'): Set<string> {
  const g = adj(edges, dir), seen = new Set<string>(start), q = [...seen];
  while (q.length) for (const n of g.get(q.pop()!) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  return seen;
}
/** Everything the nodes feed, directly or not (the nodes included). */
export const downstream = (edges: DepEdge[], ids: Iterable<string>): Set<string> => reach(edges, ids, 'out');
/** Everything that feeds the nodes, directly or not (the nodes included). */
export const upstream = (edges: DepEdge[], ids: Iterable<string>): Set<string> => reach(edges, ids, 'in');

/** Strongly connected components of the zone graph with more than one zone: the documented cycles. */
export function cycles(zones: string[], edges: DepEdge[]): string[][] {
  const g = adj(edges.filter((e) => e[2] === 'z'), 'out'), idx = new Map<string, number>(), low = new Map<string, number>(), stack: string[] = [], on = new Set<string>(), out: string[][] = [];
  let n = 0;
  const visit = (v: string): void => {
    idx.set(v, n); low.set(v, n++); stack.push(v); on.add(v);
    for (const w of g.get(v) ?? []) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) { const c: string[] = []; let w: string; do { w = stack.pop()!; on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) out.push(c.sort()); }
  };
  zones.forEach((z) => { if (!idx.has(z)) visit(z); });
  return out.sort((a, b) => a[0]!.localeCompare(b[0]!));
}

/**
 * Build order of the zones. Cycles are real (a view module that reads the engine and is read back by an input zone), so the order is found with the
 * Eades-Lin-Smyth heuristic (sources first, sinks last, else the node with the largest out-minus-in weight); the links that point backwards in that
 * order are the `feedback` set. Layers are longest paths over the forward links. Ties are alphabetical: the result is stable.
 */
export function buildLayers(zones: string[], edges: DepEdge[], lanes: Record<string, string> = {}): { layer: Record<string, number>; order: string[]; feedback: DepEdge[] } {
  const rank = (z: string): number => ['input', 'calc', 'result'].indexOf(lanes[z] ?? 'calc'), ze = edges.filter((e) => e[2] === 'z'), left = new Set(zones), head: string[] = [], tail: string[] = [];
  const w = (z: string, dir: 0 | 1): number => ze.filter((e) => e[dir] === z && left.has(dir === 0 ? e[1] : e[0]) && e[0] !== e[1]).reduce((a, e) => a + e[3], 0);
  while (left.size) {
    const rest = [...left].sort(), sink = rest.find((z) => w(z, 0) === 0), src = rest.find((z) => w(z, 1) === 0);
    const pick = sink ?? src ?? rest.reduce((b, z) => (w(z, 0) - w(z, 1) > w(b, 0) - w(b, 1) ? z : b));
    left.delete(pick);
    if (sink) tail.unshift(pick); else head.push(pick);
  }
  const order = [...head, ...tail].sort((a, b) => rank(a) - rank(b)), pos = new Map(order.map((z, i) => [z, i])), feedback = ze.filter((e) => pos.get(e[0])! > pos.get(e[1])!);
  const layer: Record<string, number> = {};
  for (const z of order) layer[z] = Math.max(-1, ...ze.filter((e) => e[1] === z && pos.get(e[0])! < pos.get(z)!).map((e) => layer[e[0]]!)) + 1;
  return { layer, order, feedback };
}

/** Tests whose import closure touches one of the zones or sections. */
export function testsTouching(d: DepsData, ids: Set<string>): string[] {
  return d.tests.filter(([, zs, ss]) => zs.some((i) => ids.has(d.zones[i]!.id)) || ss.some((i) => ids.has(d.sections[i]!.id))).map((t) => t[0]);
}

const zoneFlow = (d: DepsData): DepEdge[] => d.edges.filter((e) => e[2] === 'z');
export interface Impact { zones: string[]; sections: string[]; tests: string[] }

/**
 * What must be re-checked when these zones or sections change. `zones` and `sections` report the impact (the zones they feed through imports, every section
 * that reads or writes one of them). `tests` are the test files whose import closure touches the changed zones or sections: the closure is transitive, so a test
 * that reaches anything downstream already reaches the changed zone and the downstream expansion adds nothing.
 */
export function impact(d: DepsData, zoneIds: string[], sectionIds: string[]): Impact {
  const zones = downstream(zoneFlow(d), zoneIds), ids = new Set(d.zones.map((z) => z.id));
  const sections = new Set(sectionIds);
  for (const e of d.edges) {
    if (e[2] === 'r' && zones.has(e[0])) sections.add(e[1]);
    if (e[2] === 'w' && zones.has(e[1])) sections.add(e[0]);
  }
  const own = new Set([...zoneIds, ...sectionIds].filter((i) => ids.has(i) || d.sections.some((x) => x.id === i)));
  return { zones: [...zones].sort(), sections: [...sections].sort(), tests: testsTouching(d, own) };
}

/** Zones a section depends on only through other zones (not imported by the section itself): the `soft` links of the matrix. */
export function indirectZones(d: DepsData, sectionId: string): string[] {
  const direct = d.edges.filter((e) => e[2] === 'r' && e[1] === sectionId).map((e) => e[0]);
  const all = upstream(zoneFlow(d), direct);
  return [...all].filter((z) => !direct.includes(z)).sort();
}
